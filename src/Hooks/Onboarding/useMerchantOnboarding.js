import { useEffect, useState } from "react";
import { merchantOnboardingApi } from "@/Services/Onboarding/merchantOnboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// The merchant self-onboarding engine behind Sign up, for one kind
// (individual | corporate): the picker that starts or resumes an onboarding,
// then the section-by-section form, redrawn from the server's reply after
// every save. Every text the merchant reads about the outcome (success,
// refusal, notice, per-field issues) comes from the API as received.

const storageKey = (kind) => `innomms:merchant-onboarding:${kind}`;
const readReference = (kind) => {
  try {
    return window.localStorage.getItem(storageKey(kind));
  } catch {
    return null;
  }
};
const storeReference = (kind, referenceId) => {
  try {
    window.localStorage.setItem(storageKey(kind), referenceId);
  } catch {
    /* Resuming later still works through add with the same contact. */
  }
};
const forgetReference = (kind) => {
  try {
    window.localStorage.removeItem(storageKey(kind));
  } catch {
    /* Nothing stored. */
  }
};

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
const isBlank = (value) => value === "" || value === undefined || value === null;

// A field's default_value pre-fills it while it is empty.
function withDefaults(fields, row) {
  const filled = { ...row };
  for (const field of fields ?? []) {
    if (isBlank(filled[field.key]) && !isBlank(field.default_value)) filled[field.key] = field.default_value;
  }
  return filled;
}

// Answers go back as the section's whole `data`: empty answers left out, and
// the read-only `*_name` companions of a chosen option not sent back.
function cleanRow(row, fieldKeys) {
  const cleaned = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    if (isBlank(value)) continue;
    if (key.endsWith("_name") && !fieldKeys.has(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

const seedOf = (section) =>
  section
    ? section.multi_row
      ? (section.values?.length ? section.values : [{}]).map((row) => withDefaults(section.fields, row))
      : withDefaults(section.fields, section.values ?? {})
    : null;

const EMPTY_PICK = { choice: null, email: "", phone_number: "" };

export function useMerchantOnboarding(kind) {
  const api = merchantOnboardingApi[kind];
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState("");
  const [pick, setPick] = useState(EMPTY_PICK);
  const [wizard, setWizard] = useState(null);
  const [resuming, setResuming] = useState(() => Boolean(readReference(kind)));
  const [activeSection, setActiveSection] = useState(0);
  // Unsaved answers per section code; a section without an entry shows what
  // the server has. Kept while moving between steps, dropped once saved.
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(null); // "start" | "save" | "submit" | "discard"
  const [problem, setProblem] = useState("");
  // A 409 on start: the contact already has an unfinished onboarding in
  // another role, or has completed this one. Holds the API's message.
  const [conflict, setConflict] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [completedMessage, setCompletedMessage] = useState("");

  const applyWizard = (form) => {
    setWizard(form);
    if (form?.onboarding?.reference_id) storeReference(kind, form.onboarding.reference_id);
  };

  // A 403 means the institution doesn't offer web onboarding: a page state.
  const reportError = (error) => {
    if (error.status === 403) {
      setUnavailable(error.message);
      return;
    }
    setProblem(error.message);
    notifications.error(error.message);
  };

  useEffect(() => {
    api
      .loadOptions()
      .then((data) => setOptions(data ?? {}))
      .catch((error) => {
        setOptionsError(error.message);
        if (error.status === 403) setUnavailable(error.message);
      });
    const referenceId = readReference(kind);
    if (referenceId) {
      api
        .loadWizard(referenceId)
        .then(({ data }) => applyWizard(data))
        .catch((error) => (error.status === 403 ? setUnavailable(error.message) : forgetReference(kind)))
        .finally(() => setResuming(false));
    }
    // One flow per mount (the page keys it by kind).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // What can be started (handoff 17): party type is MERCHANT (the API) and
  // ownership comes from the kind. Individual offers the sub types with a
  // published definition, and "No sub type" (value "") only when the default
  // definition is published; corporate offers its company types.
  const party = options?.party_types?.[0];
  const ownership = party?.ownerships?.[0];
  const choices =
    kind === "individual"
      ? [
          ...(ownership?.definition_id ? [{ value: "", label: null, isDefault: true }] : []),
          ...(ownership?.sub_types ?? []).map((s) => ({ value: String(s.id), label: s.name })),
        ]
      : (party?.company_types ?? []).map((c) => ({ value: String(c.id), label: c.name }));
  const choice = pick.choice ?? choices[0]?.value ?? null;

  const sections = wizard?.sections ?? [];
  const section = sections[activeSection];
  const editable = wizard?.onboarding?.editable !== false;

  const kept = section ? drafts[section.code] : undefined;
  const effectiveDraft = kept !== undefined && Array.isArray(kept) === Boolean(section?.multi_row) ? kept : seedOf(section);
  // Builds on the latest stored draft, so several updates in one handler
  // (a parent change clearing its dependent fields) all land.
  const setDraft = (update) =>
    setDrafts((all) => {
      const current = all[section.code];
      const base = current !== undefined && Array.isArray(current) === Boolean(section.multi_row) ? current : seedOf(section);
      return { ...all, [section.code]: update(base) };
    });

  const run = async (name, work) => {
    setProblem("");
    setBusy(name);
    try {
      return await work();
    } catch (error) {
      reportError(error);
      return false;
    } finally {
      setBusy(null);
      scrollToTop();
    }
  };

  // `contactOnly` resumes whatever this contact has in progress in this flow
  // (the API resumes a call with only the contact and no sub type).
  const start = ({ contactOnly = false } = {}) =>
    run("start", async () => {
      setConflict("");
      const contact = {
        ...(pick.email.trim() ? { email: pick.email.trim() } : {}),
        ...(pick.phone_number.trim() ? { phone_number: pick.phone_number.trim() } : {}),
      };
      const role = contactOnly
        ? {}
        : kind === "individual"
          ? { ownership_sub_type_id: choice ? Number(choice) : null }
          : { company_type_id: choice ? Number(choice) : undefined };
      try {
        const { data: form, message } = await api.start({ ...role, ...contact });
        notifications.success(message);
        if (form?.notice) notifications.info(form.notice);
        setDrafts({});
        applyWizard(form);
        setActiveSection(0);
        return true;
      } catch (error) {
        if (error.status === 409) setConflict(error.message);
        throw error;
      }
    });

  const setValue = (rowIndex, key, value) =>
    setDraft((prev) =>
      rowIndex === undefined
        ? Array.isArray(prev)
          ? prev
          : { ...prev, [key]: value }
        : (Array.isArray(prev) ? prev : []).map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row)),
    );
  const addRow = () => setDraft((prev) => [...(Array.isArray(prev) ? prev : []), withDefaults(section?.fields, {})]);
  const removeRow = (rowIndex) => setDraft((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== rowIndex));

  const issueFor = (key, rowIndex) =>
    section?.issues?.find((i) => i.field === key && (rowIndex === undefined || i.row === rowIndex))?.message;

  const saveSection = () =>
    run("save", async () => {
      const fieldKeys = new Set((section.fields ?? []).map((f) => f.key));
      const data = Array.isArray(effectiveDraft) ? effectiveDraft.map((row) => cleanRow(row, fieldKeys)) : cleanRow(effectiveDraft, fieldKeys);
      try {
        const { data: form, message } = await api.saveSection({
          reference_id: wizard.onboarding.reference_id,
          section_code: section.code,
          data,
          expected_updated_time: wizard.onboarding.updated_time,
        });
        setDrafts(({ [section.code]: _saved, ...rest }) => rest);
        applyWizard(form);
        notifications.success(message);
        const next = (form.sections ?? []).findIndex((s) => s.code === form?.progress?.next_section);
        if (next >= 0) setActiveSection(next);
        return true;
      } catch (error) {
        // Changed elsewhere since it was loaded: redraw from the latest.
        if (error.status === 409) {
          const fresh = await api.loadWizard(wizard.onboarding.reference_id).catch(() => null);
          if (fresh) {
            setDrafts({});
            applyWizard(fresh.data);
          }
        }
        throw error;
      }
    });

  const submit = () =>
    run("submit", async () => {
      const { data: form, message } = await api.submit({ reference_id: wizard.onboarding.reference_id });
      applyWizard(form);
      forgetReference(kind);
      setCompletedMessage(message);
      notifications.success(message);
      return true;
    });

  const reset = () => {
    setDrafts({});
    forgetReference(kind);
    setWizard(null);
    setActiveSection(0);
    setProblem("");
    setConflict("");
    setCompletedMessage("");
    setPick(EMPTY_PICK);
  };

  // Throw the unfinished onboarding away on the server, then back to the
  // picker: the contact can start afresh or in another role.
  const discard = () =>
    run("discard", async () => {
      const { message } = await api.discard(wizard.onboarding.reference_id);
      notifications.success(message);
      reset();
      return true;
    });

  // File fields: stored first; the returned path becomes the field's value,
  // saved with the section. The row's document type applies its own limits.
  const typeIdOf = (row) => (section?.type_field ? (row ?? effectiveDraft)?.[section.type_field] : undefined);
  const uploadFile = (key, file, row) =>
    api.uploadFile({ referenceId: wizard.onboarding.reference_id, sectionCode: section.code, field: key, typeId: typeIdOf(row), file });
  const downloadFile = (path) => api.downloadFile(wizard.onboarding.reference_id, path);

  const optionsFor = (field, row) => {
    if (!field.parent_key) return field.options;
    const parentValue = row ? row[field.parent_key] : effectiveDraft?.[field.parent_key];
    return (field.options ?? []).filter((o) => String(o.parent_id) === String(parentValue));
  };

  return {
    kind,
    options,
    optionsError,
    choices,
    choice,
    pick,
    setPick,
    resuming,
    wizard,
    sections,
    section,
    editable,
    activeSection,
    setActiveSection,
    draft: effectiveDraft,
    busy,
    problem,
    conflict,
    unavailable,
    completedMessage,
    start,
    setValue,
    addRow,
    removeRow,
    issueFor,
    saveSection,
    submit,
    discard,
    uploadFile,
    downloadFile,
    optionsFor,
  };
}
