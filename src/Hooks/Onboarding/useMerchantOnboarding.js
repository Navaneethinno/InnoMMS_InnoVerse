import { useEffect, useState } from "react";
import { merchantOnboardingApi } from "@/Services/Onboarding/merchantOnboarding.api";
import { notifications } from "@/Utils/Lib/notifications";

// The merchant self-onboarding engine behind Sign up, for one kind
// (individual | corporate), on the "Merchant web: onboarding API": the
// server walks the merchant through ONE section at a time. add / get / next
// / back all reply with the same screen (registration, progress, section);
// the page only draws that section and sends its answers back. Every text
// about the outcome (success, refusal, issues) comes from the API.

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
    /* Starting again with the same contact still carries on. */
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

// A field's default_value pre-fills it while nothing is saved.
function withDefaults(fields, row) {
  const filled = { ...row };
  for (const field of fields ?? []) {
    if (isBlank(filled[field.key]) && !isBlank(field.default_value)) filled[field.key] = field.default_value;
  }
  return filled;
}

// Only keys that are in the section's fields go back (plus the entry kind
// and "same as" of a list section); empty answers are left out.
function cleanRow(row, keys) {
  return Object.fromEntries(Object.entries(row ?? {}).filter(([key, value]) => keys.has(key) && !isBlank(value)));
}

const seedOf = (section) =>
  section
    ? section.multi_row
      ? (Array.isArray(section.values) ? section.values : []).map((row) => withDefaults(section.fields, row))
      : withDefaults(section.fields, Array.isArray(section.values) ? {} : (section.values ?? {}))
    : null;

const EMPTY_PICK = { choice: null, email: "", phone_number: "" };

export function useMerchantOnboarding(kind) {
  const api = merchantOnboardingApi[kind];
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState("");
  const [pick, setPick] = useState(EMPTY_PICK);
  const [screen, setScreen] = useState(null);
  const [resuming, setResuming] = useState(() => Boolean(readReference(kind)));
  // The answers being edited on the section shown, until Next sends them.
  // Reset whenever a new screen arrives.
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null); // "start" | "next" | "back" | "submit" | "discard"
  const [problem, setProblem] = useState("");
  // A 409 on start: the contact already has a different registration open,
  // or has finished this role. Holds the API's message.
  const [conflict, setConflict] = useState("");
  const [unavailable, setUnavailable] = useState("");
  const [completedMessage, setCompletedMessage] = useState("");

  const show = (next) => {
    setScreen(next);
    setDraft(seedOf(next?.section));
    if (next?.onboarding?.reference_id) storeReference(kind, next.onboarding.reference_id);
  };

  // A 403 means the institution hasn't switched the web on: a page state.
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
        .get(referenceId)
        .then(({ data }) => show(data))
        .catch((error) => (error.status === 403 ? setUnavailable(error.message) : forgetReference(kind)))
        .finally(() => setResuming(false));
    }
    // One flow per mount (the page keys it by kind).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The categories on offer (sub types). When the ownership also has a
  // definition_id, registering with no category ("Standard") is allowed too,
  // sent as no sub_type_id. The page hides the choice when there's only one.
  const ownership = options?.party_types?.[0]?.ownerships?.[0];
  const choices = [
    ...(ownership?.definition_id ? [{ value: "", isDefault: true }] : []),
    ...(ownership?.sub_types ?? []).map((s) => ({ value: String(s.id), label: s.name })),
  ];
  const choice = pick.choice ?? choices[0]?.value ?? null;

  const onboarding = screen?.onboarding;
  const section = screen?.section ?? null;
  const progress = screen?.progress ?? {};
  const editable = onboarding?.editable !== false;

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

  // `carryOn` sends only the contact: the API then carries on whatever this
  // contact has open in this kind.
  const start = ({ carryOn = false } = {}) =>
    run("start", async () => {
      setConflict("");
      const payload = {
        ...(!carryOn && choice ? { sub_type_id: Number(choice) } : {}),
        ...(pick.email.trim() ? { email: pick.email.trim() } : {}),
        ...(pick.phone_number.trim() ? { phone_number: pick.phone_number.trim() } : {}),
      };
      try {
        const { data, message } = await api.start(payload);
        notifications.success(message);
        show(data);
        return true;
      } catch (error) {
        if (error.status === 409) setConflict(error.message);
        throw error;
      }
    });

  const setValue = (rowIndex, key, value) =>
    setDraft((prev) =>
      rowIndex === undefined
        ? { ...(Array.isArray(prev) ? {} : prev), [key]: value }
        : (Array.isArray(prev) ? prev : []).map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row)),
    );
  const addRow = () => setDraft((prev) => [...(Array.isArray(prev) ? prev : []), withDefaults(section?.fields, {})]);
  const removeRow = (rowIndex) => setDraft((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== rowIndex));

  const issueFor = (key, rowIndex) => section?.issues?.find((i) => i.field === key && (rowIndex === undefined || i.row === rowIndex))?.message;

  // Next: save the section's answers (they replace what was saved there)
  // and show whatever comes back: the next section, or the same one with
  // what is still missing (moved: false), or none when this was the last.
  const next = () =>
    run("next", async () => {
      const keys = new Set([
        ...(section.fields ?? []).map((f) => f.key),
        ...(section.type_field ? [section.type_field, "same_as_address_type_id"] : []),
      ]);
      const data = Array.isArray(draft) ? draft.map((row) => cleanRow(row, keys)) : cleanRow(draft, keys);
      try {
        const { data: reply, message } = await api.next({
          reference_id: onboarding.reference_id,
          section_code: section.code,
          data,
          expected_updated_time: onboarding.updated_time,
        });
        if (reply?.moved) notifications.success(message);
        show(reply);
        return true;
      } catch (error) {
        // Changed elsewhere in the meantime: redraw from the latest.
        if (error.status === 409) {
          const fresh = await api.get(onboarding.reference_id).catch(() => null);
          if (fresh) show(fresh.data);
        }
        throw error;
      }
    });

  const back = () =>
    run("back", async () => {
      const { data } = await api.back(onboarding.reference_id, section?.code);
      show(data);
      return true;
    });

  const submit = () =>
    run("submit", async () => {
      const { data, message } = await api.submit({
        reference_id: onboarding.reference_id,
        level_no: 0,
        expected_updated_time: onboarding.updated_time,
      });
      show(data);
      forgetReference(kind);
      setCompletedMessage(message);
      notifications.success(message);
      return true;
    });

  // Throw the unfinished registration away, then back to the start: the
  // contact can register afresh or in another role.
  const discard = () =>
    run("discard", async () => {
      const { message } = await api.discard(onboarding.reference_id);
      notifications.success(message);
      forgetReference(kind);
      setScreen(null);
      setDraft(null);
      setConflict("");
      setCompletedMessage("");
      setPick(EMPTY_PICK);
      return true;
    });

  // File questions: stored first; the returned path is the answer. The
  // entry's kind (type_id) applies its own formats and size.
  const typeIdOf = (row) => (section?.type_field ? row?.[section.type_field] : undefined);
  const uploadFile = (key, file, row) =>
    api.uploadFile({ referenceId: onboarding.reference_id, sectionCode: section.code, field: key, typeId: typeIdOf(row), file });
  const downloadFile = (path) => api.downloadFile(onboarding.reference_id, path);

  // A dependent list shows only the options whose parent_id is the answer
  // to its parent question.
  const optionsFor = (field, row) => {
    if (!field.parent_key) return field.options;
    const parentValue = (row ?? draft)?.[field.parent_key];
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
    screen,
    onboarding,
    section,
    progress,
    editable,
    draft,
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
    next,
    back,
    submit,
    discard,
    uploadFile,
    downloadFile,
    optionsFor,
  };
}
