import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { notifications } from "@/Utils/Lib/notifications";
import { FILE_UPLOAD, STORAGE_KEYS } from "@/Utils/Constant";
import { compactPayload } from "./onboardingPayload";

// Shared engine behind every self-service onboarding wizard (individual,
// corporate, ...): the form once an onboarding exists. The server walks the
// merchant through ONE section per reply: `next` saves the answers and
// answers with the following section, `back` with the previous one, and the
// screen is redrawn from each reply instead of patching local state. Only
// the API calls differ per flow (see useIndividualOnboardingWizard.js /
// useCorporateOnboardingWizard.js), so this file is written once and never
// needs to know individual vs corporate exists.
//
// Nothing the merchant reads is written here: success and error text, the
// `notice` and the `problems` list all come from the API and are shown as
// received. The client does not pre-validate the picker either — the API
// refuses what is missing and says why.

function readStoredReference(kind) {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.onboardingReference(kind));
  } catch {
    return null;
  }
}
function storeReference(kind, referenceId) {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.onboardingReference(kind),
      referenceId,
    );
  } catch {
    /* Resuming later still works through `add` with the same contact. */
  }
}
function forgetReference(kind) {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.onboardingReference(kind));
  } catch {
    /* Nothing stored to clear. */
  }
}

// Every action's outcome (errors included) is shown at the top of the
// page, so each one ends by bringing the merchant back there.
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

// An answer counts as empty when it is "", missing, an empty list, or a
// front-and-back file pair with neither side.
const isBlank = (value) =>
  value === "" ||
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.values(value).every(isBlank));

// A field's `default_value` pre-fills it while it is empty.
function withDefaults(fields, row) {
  const filled = { ...row };
  for (const field of fields ?? []) {
    if (isBlank(filled[field.key]) && !isBlank(field.default_value))
      filled[field.key] = field.default_value;
  }
  return filled;
}

// Answers go back as the section's whole `data`: empty answers are left out,
// and the read-only `*_name` companions the API adds next to a chosen option
// id are not sent back.
function cleanRow(row, fieldKeys) {
  const cleaned = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    if (isBlank(value)) continue;
    if (key.endsWith("_name") && !fieldKeys.has(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

// A document type's `file_formats` may come as a list or a comma-separated
// string, with or without a dot / as a MIME type; reduce it to extensions.
function toFormats(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const formats = list
    .map((f) => String(f).trim().toLowerCase().replace(/^\./, "").replace(/^.*\//, ""))
    .filter(Boolean);
  return formats.length ? formats : null;
}

// The category choice from the `options` reply: every sub type is a
// category, and an ownership that has a `definition_id` also allows
// registering with no category ("Standard": no sub_type_id is sent).
function buildCategories(options, t) {
  const list = [];
  for (const party of options?.party_types ?? []) {
    for (const ownership of party.ownerships ?? []) {
      for (const sub of ownership.sub_types ?? [])
        list.push({ value: `sub:${sub.id}`, param: "sub_type_id", id: sub.id, label: sub.name, group: ownership.name });
      if (ownership.definition_id != null)
        list.push({ value: `standard:${ownership.id}`, param: null, id: null, label: t("onb.standard"), group: ownership.name });
    }
    // Corporate: party_types > company_types.
    for (const type of party.company_types ?? [])
      list.push({ value: `company:${type.id}`, param: "company_type_id", id: type.id, label: type.name, group: party.name });
  }
  const counts = {};
  for (const item of list) counts[item.label] = (counts[item.label] ?? 0) + 1;
  return list.map((item) => (counts[item.label] > 1 ? { ...item, label: `${item.label} (${item.group})` } : item));
}

// The code box's state from an `add` reply that asked for a code.
const stageOf = (form) => ({
  kind: form.verify_required ? "verify" : "resume",
  otp_ref: form.otp_ref,
  expires_at: form.expires_at,
  sent_to: form.sent_to,
});

const INITIAL_PICK = { category: "", email: "", phone_number: "" };

// `flowApi.autoStart` is for a flow with no picker (the signed-in KYC upgrade):
// the screen is asked for as soon as the page opens, and `onLeave` is called
// when it is submitted or dropped instead of going back to the picker.
export function useOnboardingWizard({ flowApi, kind, onLeave }) {
  const { t } = useTranslation();
  const initialPick = INITIAL_PICK;
  const [options, setOptions] = useState(null);
  const [pick, setPick] = useState(initialPick);
  const [starting, setStarting] = useState(false);
  const [wizard, setWizard] = useState(null);
  const [resuming, setResuming] = useState(() =>
    Boolean(flowApi.autoStart || readStoredReference(kind)),
  );
  // The checkpoint screen the last reply asked for (or null), and the reply's
  // own message for it.
  const [checkpoint, setCheckpoint] = useState(null);
  const [checkpointMessage, setCheckpointMessage] = useState("");
  const [acting, setActing] = useState("");
  // Bumped for every reply that carries a section, so the draft is reseeded
  // from the server's saved answers each time a section is (re)drawn.
  const [seedVersion, setSeedVersion] = useState(0);
  const lastSection = useRef(null);
  const [navigating, setNavigating] = useState(false);
  // Local edits for the section on screen, seeded from `section.values` on
  // every load/save so a re-render from the server never loses what the
  // merchant just typed (this only ever holds THIS section's draft,
  // replaced wholesale each time the section changes).
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The API's own reasons for the last refusal ({ message, problems }), a
  // page-level "not available" message (403: the bank doesn't offer web
  // onboarding), and the API's completion message.
  const [problemInfo, setProblemInfo] = useState(null);
  const [unavailable, setUnavailable] = useState(null);
  const [completedMessage, setCompletedMessage] = useState("");
  const [optionsError, setOptionsError] = useState("");
  // A 409 on start: the contact already has an unfinished onboarding in
  // another role (or has completed this one). Holds the API's message.
  const [conflict, setConflict] = useState("");
  const [discarding, setDiscarding] = useState(false);
  // A code stands between the contact and the application: a new contact is
  // verified first (`verify`), and an application already in progress opens
  // only with the code sent to its own contact (`resume`):
  // { kind, otp_ref, expires_at, sent_to } while the code box is up.
  const [codeStage, setCodeStage] = useState(null);
  const [codeError, setCodeError] = useState("");
  // What the last refusal of the code was: "wrong" (type again), "invalid"
  // (spent, expired or out of tries: ask for a new one) or "blocked" (five
  // codes this hour: wait).
  const [codeState, setCodeState] = useState("");
  const [confirmingCode, setConfirmingCode] = useState(false);
  // The body of the last `add` (no code in it): a new code and the final
  // `add` both reuse it.
  const lastStart = useRef(null);

  // Draws a reply. After the last section the reply has no section: the
  // last one stays on screen (so Back and the finish card still work) until
  // the registration is submitted, when there is nothing left to show.
  const applyWizard = (form, message = "", { skipCheckpoint = false } = {}) => {
    setCheckpoint(skipCheckpoint ? null : (form?.checkpoint ?? null));
    setCheckpointMessage(message);
    if (form?.section) {
      lastSection.current = form.section;
      setSeedVersion((v) => v + 1);
      setWizard(form);
    } else if (form?.onboarding?.editable !== false && lastSection.current) {
      setWizard({ ...form, section: { ...lastSection.current, issues: [] } });
    } else {
      setWizard(form);
    }
    if (form?.onboarding?.reference_id && !flowApi.autoStart)
      storeReference(kind, form.onboarding.reference_id);
  };

  // Show a refusal exactly as the API worded it. A 403 means the bank does
  // not offer onboarding on this channel: that is a page state, not a form
  // error.
  const reportError = (error) => {
    // (A number nobody has sent money to is also a 403, but only that step
    // stops: it is shown on the form.)
    if (error.status === 403 && error.errorCode !== "portal.signup_invite_only") {
      setUnavailable(error.message);
      return;
    }
    notifications.error(error.message);
    // Always in red at the top of the page (where it scrolls to), with the
    // reasons when there are some: e.g. an ID check that failed.
    setProblemInfo({ message: error.message, problems: error.problems ?? [] });
  };

  useEffect(() => {
    if (flowApi.autoStart) {
      flowApi
        .start({})
        .then(({ data, message }) => {
          setOptions({});
          applyWizard(data, message);
        })
        .catch((error) => {
          reportError(error);
          setOptionsError(error.message);
        })
        .finally(() => setResuming(false));
      return;
    }
    flowApi
      .loadOptions()
      .then((data) => setOptions(data ?? {}))
      .catch((error) => {
        reportError(error);
        setOptionsError(error.message);
      });
    const referenceId = readStoredReference(kind);
    if (referenceId) {
      flowApi
        .loadWizard(referenceId)
        .then(({ data, message }) => applyWizard(data, message))
        .catch((error) => {
          if (error.status === 403) setUnavailable(error.message);
          else forgetReference(kind);
        })
        .finally(() => setResuming(false));
    }
    // flowApi/kind are stable per flow; only run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const section = wizard?.section ?? null;
  const progress = wizard?.progress ?? null;
  // Once submitted the application is locked (`editable` is false): the only
  // way to change anything is to answer the institution's requests. `review`
  // is there only when it went to review; an application approved at once
  // has none.
  const review = wizard?.review ?? null;
  const editable = wizard?.onboarding?.editable !== false;

  // Reseed the section draft whenever the active section or the wizard
  // itself changes (a fresh reply after save, or switching tabs) — done
  // synchronously during render, not in an effect, so a single -> multi-row
  // step change never renders once with `draft` still holding the previous
  // section's shape. `multi_row` is part of the key so a change in a
  // section's shape always forces a reseed.
  const seedKey = section ? `${section.key}:${section.multi_row ? 1 : 0}:${seedVersion}` : null;
  // Kept in state, not a ref: React may render twice and discard one pass
  // (StrictMode), and a ref would then skip the reseed on the pass that
  // counts.
  const [seededKey, setSeededKey] = useState(null);
  // Unsaved typing per step, so moving between steps (or a tour jumping to
  // one) never throws away what the merchant entered but hasn't saved yet.
  const unsavedDrafts = useRef({});
  let effectiveDraft = draft;
  if (seededKey !== seedKey) {
    setSeededKey(seedKey);
    const kept = section ? unsavedDrafts.current[section.key] : undefined;
    const keptFits =
      kept !== undefined && Array.isArray(kept) === Boolean(section.multi_row);
    effectiveDraft = keptFits
      ? kept
      : section
        ? section.multi_row
          ? (section.values?.length ? section.values : [{}]).map((row) =>
              withDefaults(section.fields, row),
            )
          : withDefaults(section.fields, section.values ?? {})
        : null;
    setDraft(effectiveDraft);
  }

  useEffect(() => {
    if (section?.key && draft !== null)
      unsavedDrafts.current[section.key] = draft;
  }, [draft, section?.key]);

  // Only what the merchant actually gave is sent (an `add` with just the
  // contact carries on with whatever that contact already has open).
  const categories = useMemo(() => buildCategories(options, t), [options, t]);
  const chosenCategory =
    categories.find((c) => c.value === pick.category) ?? (categories.length === 1 ? categories[0] : null);
  const buildStartPayload = () =>
    compactPayload({
      ...(chosenCategory?.param ? { [chosenCategory.param]: chosenCategory.id } : {}),
      email: pick.email.trim(),
      phone_number: pick.phone_number.trim(),
    });

  // `contactOnly` resumes whatever this contact has in progress in this
  // flow (the API resumes a call with only the contact and no sub type).
  const beginOnboarding = async ({ contactOnly = false } = {}) => {
    setProblemInfo(null);
    setConflict("");
    setStarting(true);
    try {
      const payload = buildStartPayload();
      const body = contactOnly
        ? Object.fromEntries(Object.entries(payload).filter(([key]) => key === "email" || key === "phone_number"))
        : payload;
      lastStart.current = body;
      const { data: form, message } = await flowApi.start(body);
      notifications.success(message);
      if (form?.verify_required || form?.resume_required) {
        setCodeError("");
        setCodeState("");
        setCodeStage(stageOf(form));
        return false;
      }
      if (form?.notice) notifications.info(form.notice);
      unsavedDrafts.current = {};
      lastSection.current = null;
      applyWizard(form, message);
      return true;
    } catch (error) {
      if (error.status === 409) setConflict(error.message);
      reportError(error);
      return false;
    } finally {
      setStarting(false);
      scrollToTop();
    }
  };

  // The code from the email or SMS. A wrong code keeps the box up (the API
  // says how many tries are left); a spent or expired one is answered with
  // "ask for a new one" (`resendCode`).
  const confirmCode = async (otp) => {
    setConfirmingCode(true);
    setCodeError("");
    try {
      // A new contact starts the application with the same `add` plus the
      // code; one in progress is opened with `resume`.
      const { data: form } =
        codeStage.kind === "verify"
          ? await flowApi.start({ ...lastStart.current, otp_ref: codeStage.otp_ref, otp })
          : await flowApi.resume({ otpRef: codeStage.otp_ref, otp });
      unsavedDrafts.current = {};
      lastSection.current = null;
      setCodeStage(null);
      applyWizard(form);
      return true;
    } catch (error) {
      if (error.status === 403) {
        setCodeStage(null);
        setUnavailable(error.message);
      } else {
        setCodeError(error.message);
        setCodeState(error.errorCode === "portal.otp_invalid" ? "invalid" : error.errorCode === "portal.otp_too_many" ? "blocked" : "wrong");
      }
      return false;
    } finally {
      setConfirmingCode(false);
    }
  };
  // Another code: `add` again with the same contact (at most 5 an hour).
  const resendCode = async () => {
    setCodeError("");
    setCodeState("");
    try {
      const { data: form, message } = await flowApi.start(lastStart.current ?? {});
      notifications.success(message);
      if (form?.verify_required || form?.resume_required) setCodeStage(stageOf(form));
    } catch (error) {
      setCodeError(error.message);
      setCodeState(error.errorCode === "portal.otp_too_many" ? "blocked" : "");
    }
  };
  const cancelCode = () => {
    setCodeStage(null);
    setCodeError("");
    setCodeState("");
  };

  // A late write from the previous step's controls (e.g. a select reporting
  // "" as it unmounts) must never turn a multi-row draft into an object.
  const setFieldValue = (fieldKey, value) =>
    setDraft((prev) =>
      Array.isArray(prev) ? prev : { ...prev, [fieldKey]: value },
    );
  const setRowValue = (rowIndex, fieldKey, value) =>
    setDraft((prev) =>
      (Array.isArray(prev) ? prev : []).map((row, i) =>
        i === rowIndex ? { ...row, [fieldKey]: value } : row,
      ),
    );
  // Single-row sections update the one draft object; multi-row sections
  // update the row at `rowIndex`.
  const setValue = (rowIndex, fieldKey, value) => {
    markEdited(rowIndex, fieldKey);
    return rowIndex === undefined
      ? setFieldValue(fieldKey, value)
      : setRowValue(rowIndex, fieldKey, value);
  };
  // Defensive against `prev` ever being a non-array here (e.g. a section
  // whose multi_row-ness the seed key hasn't caught up with yet).
  const addRow = () =>
    setDraft((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      withDefaults(section?.fields, {}),
    ]);
  const removeRow = (rowIndex) =>
    setDraft((prev) =>
      (Array.isArray(prev) ? prev : []).filter((_, i) => i !== rowIndex),
    );

  // A field's problem goes away as soon as the merchant edits it (the next
  // reply from the server brings back whatever is still wrong).
  const [edited, setEdited] = useState({ seed: null, keys: [] });
  const editedKeys = edited.seed === seedKey ? edited.keys : [];
  const markEdited = (rowIndex, fieldKey) =>
    setEdited((previous) => {
      const key = `${rowIndex ?? ""}:${fieldKey}`;
      const keys = previous.seed === seedKey ? previous.keys : [];
      return keys.includes(key) ? previous : { seed: seedKey, keys: [...keys, key] };
    });
  const issueFor = (fieldKey, rowIndex) =>
    editedKeys.includes(`${rowIndex ?? ""}:${fieldKey}`)
      ? undefined
      : section?.issues?.find((i) => i.field === fieldKey && (rowIndex === undefined || i.row === rowIndex))?.message;

  // Redraw from the latest saved state after someone else changed it.
  const refresh = async () => {
    const fresh = await flowApi.loadWizard(wizard.onboarding.reference_id).catch(() => null);
    if (fresh) applyWizard(fresh.data, fresh.message);
  };

  // Next: saves this section's answers and moves on (the reply says whether
  // it did: same section again means something is still missing). Skipping
  // leaves `data` out, so nothing changes and an optional section is passed.
  const persistSection = async ({ skip = false } = {}) => {
    if (!section) return;
    setProblemInfo(null);
    if (skip) setNavigating(true);
    else setSaving(true);
    try {
      const payload = {
        reference_id: wizard.onboarding.reference_id,
        section_key: section.key,
        expected_updated_time: wizard.onboarding.updated_time,
      };
      if (!skip) {
        const fieldKeys = new Set((section.fields ?? []).map((f) => f.key));
        payload.data = Array.isArray(effectiveDraft)
          ? effectiveDraft.map((row) => cleanRow(row, fieldKeys))
          : cleanRow(effectiveDraft, fieldKeys);
      }
      const { data: form, message } = await flowApi.next(payload);
      if (!skip) delete unsavedDrafts.current[section.key];
      applyWizard(form, message);
      // Same section again = something is still missing: the "Still needed
      // here" list at the top says what, so no "saved" toast for that.
      if (form?.moved) notifications.success(message);
    } catch (error) {
      reportError(error);
      // Changed elsewhere since it was loaded: redraw from the latest.
      if (error.status === 409) await refresh();
    } finally {
      setSaving(false);
      setNavigating(false);
      scrollToTop();
    }
  };
  const skipSection = () => persistSection({ skip: true });

  // Back: the section before this one, with its saved answers. Saves
  // nothing; what was typed here is kept in case the merchant returns.
  const goBack = async () => {
    if (!section) return;
    setProblemInfo(null);
    setNavigating(true);
    try {
      const { data: form, message } = await flowApi.back({
        reference_id: wizard.onboarding.reference_id,
        section_key: section.key,
      });
      applyWizard(form, message);
    } catch (error) {
      reportError(error);
      if (error.status === 409) await refresh();
    } finally {
      setNavigating(false);
      scrollToTop();
    }
  };

  const submitForApproval = async () => {
    setProblemInfo(null);
    setSubmitting(true);
    try {
      const { data: form, message } = await flowApi.submit({
        reference_id: wizard.onboarding.reference_id,
        expected_updated_time: wizard.onboarding.updated_time,
        // The KYC level this channel submits at (`progress.submit_level_no`).
        ...(progress?.submit_level_no != null ? { level_no: progress.submit_level_no } : {}),
      });
      applyWizard(form, message);
      // Approved: nothing left to resume. Under review (or waiting on the
      // merchant, or held for a parent) the reference stays, so a reload or a
      // return visit shows that again.
      if ((!form?.review || form.review.status === "APPROVED") && !form?.checkpoint) forgetReference(kind);
      setCompletedMessage(message);
      notifications.success(message);
      if (flowApi.autoStart) onLeave?.();
      return true;
    } catch (error) {
      reportError(error);
      return false;
    } finally {
      setSubmitting(false);
      scrollToTop();
    }
  };

  // Leave the resumed onboarding and go back to the picker for a new one.
  const startOver = () => {
    setConflict("");
    unsavedDrafts.current = {};
    forgetReference(kind);
    setWizard(null);
    setDraft(null);
    lastSection.current = null;
    setProblemInfo(null);
    setCompletedMessage("");
    setPick(initialPick);
  };

  // Throw the unfinished onboarding away on the server, then back to the
  // picker: the contact can start afresh or in another role.
  const discardOnboarding = async () => {
    const referenceId = wizard?.onboarding?.reference_id;
    if (!referenceId) return false;
    setProblemInfo(null);
    setDiscarding(true);
    try {
      const { message } = await flowApi.discard(referenceId);
      notifications.success(message);
      if (flowApi.autoStart) onLeave?.();
      else startOver();
      return true;
    } catch (error) {
      reportError(error);
      return false;
    } finally {
      setDiscarding(false);
      scrollToTop();
    }
  };

  // Answers one of the institution's requests; the reply is the wizard with
  // its `review` updated. A section a request reopens is read with `get`.
  const [responding, setResponding] = useState(false);
  const referenceId = wizard?.onboarding?.reference_id;
  const loadRequestSection = async (sectionKey) => (await flowApi.loadWizard(referenceId, sectionKey)).data?.section ?? null;
  const respondToRequest = async (requestId, body) => {
    setProblemInfo(null);
    setResponding(true);
    try {
      const { data: form, message } = await flowApi.respond({ reference_id: referenceId, request_id: requestId, ...body });
      applyWizard(form, message);
      notifications.success(message);
      return true;
    } catch (error) {
      reportError(error);
      if (error.status === 409) await refresh();
      return false;
    } finally {
      setResponding(false);
      scrollToTop();
    }
  };
  const uploadRequestFile = ({ requestId, field, side, file }) =>
    flowApi.respondUploadFile({ referenceId, requestId, field, side, file });

  // Checkpoint screens. "Continue" shows the section the same reply carries
  // (no call); "edit" shows an earlier screen again; "check again" reads the
  // sign-up afresh (something outside the page may have happened); an action
  // is a button the server acts on, and its reply is the next screen.
  const dismissCheckpoint = () => {
    setCheckpoint(null);
    scrollToTop();
  };
  const editFromCheckpoint = async (sectionKey) => {
    if (!sectionKey || sectionKey === "END") return dismissCheckpoint();
    setProblemInfo(null);
    setNavigating(true);
    try {
      const { data: form, message } = await flowApi.loadWizard(referenceId, sectionKey);
      applyWizard(form, message, { skipCheckpoint: true });
    } catch (error) {
      reportError(error);
    } finally {
      setNavigating(false);
      scrollToTop();
    }
  };
  const recheckCheckpoint = async () => {
    setProblemInfo(null);
    setNavigating(true);
    try {
      const { data: form, message } = await flowApi.loadWizard(referenceId);
      applyWizard(form, message);
    } catch (error) {
      reportError(error);
    } finally {
      setNavigating(false);
      scrollToTop();
    }
  };
  const runCheckpointAction = async (action) => {
    setProblemInfo(null);
    setActing(action);
    try {
      const { data: form, message } = await flowApi.action({ referenceId, action });
      applyWizard(form, message);
    } catch (error) {
      reportError(error);
    } finally {
      setActing("");
      scrollToTop();
    }
  };

  // File fields: the file is stored first and the returned `path` becomes
  // the field's answer, saved with the section as usual. A front-and-back
  // field uploads each `side` separately.
  const uploadFile = (fieldKey, file, side) =>
    flowApi.uploadFile({
      referenceId: wizard.onboarding.reference_id,
      field: fieldKey,
      side,
      file,
    });
  const downloadFile = (path) =>
    flowApi.downloadFile(wizard.onboarding.reference_id, path);
  // Formats and size limit to hint at (the API checks them either way).
  const fileRulesFor = (field) => {
    const { allowed_types: allowed, max_size_kb: maxKb, capture } = field.options ?? {};
    return {
      // A live photo is always an image.
      formats: capture === "liveness" ? ["jpeg", "png"] : (toFormats(allowed) ?? FILE_UPLOAD.formats),
      maxBytes: maxKb ? maxKb * 1024 : FILE_UPLOAD.maxBytes,
      capture,
    };
  };

  // A dependent list shows only the choices that belong to its parent
  // field's current answer (the parent is asked first).
  const choicesFor = (field, row) => {
    const choices = field.choices ?? [];
    if (!field.parent_field) return choices;
    const parentValue = row ? row[field.parent_field] : effectiveDraft?.[field.parent_field];
    return choices.filter((c) => String(c.parent) === String(parentValue));
  };

  return {
    options,
    pick,
    setPick,
    starting,
    resuming,
    wizard,
    section,
    progress,
    editable,
    effectiveDraft,
    saving,
    submitting,
    problemInfo,
    unavailable,
    optionsError,
    completedMessage,
    beginOnboarding,
    codeStage,
    codeError,
    codeState,
    confirmingCode,
    confirmCode,
    resendCode,
    cancelCode,
    setValue,
    addRow,
    removeRow,
    issueFor,
    persistSection,
    skipSection,
    goBack,
    navigating,
    categories,
    chosenCategory,
    submitForApproval,
    startOver,
    conflict,
    discarding,
    discardOnboarding,
    choicesFor,
    uploadFile,
    downloadFile,
    fileRulesFor,
    review,
    // Only the section holding the ID document runs the document check and
    // face match, which makes `next` slower.
    verifying: saving && section?.identity_check === true,
    responding,
    loadRequestSection,
    respondToRequest,
    uploadRequestFile,
    checkpoint,
    checkpointMessage,
    acting,
    dismissCheckpoint,
    editFromCheckpoint,
    recheckCheckpoint,
    runCheckpointAction,
    canGoBack: flowApi.canGoBack !== false,
    fixed: Boolean(flowApi.autoStart),
  };
}
