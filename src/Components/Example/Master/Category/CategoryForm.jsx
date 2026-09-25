import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";

export const emptyCategory = () => ({ code: "", name: "", description: "" });

// Add / Edit / View in one modal. `mode`: "add" | "edit" | "view".
// Two submit buttons: "Save as draft" (data-mode="draft") keeps it as a Draft;
// the primary button saves and sends it for approval. The shared Modal makes
// Enter submit with the primary button, never the draft one.
export function CategoryForm({ mode, value, setValue, saving, onSave, onClose }) {
  const { t } = useTranslation(["category", "common"]);
  const readOnly = mode === "view";
  const field = (key, label, { required = false, multiline = false } = {}) => (
    <label className={multiline ? "block text-sm font-semibold text-slate-700 sm:col-span-2" : "block text-sm font-semibold text-slate-700"}>
      {label}
      {required && !readOnly && <span className="text-red-500"> *</span>}
      {multiline ? (
        <textarea
          value={value[key] ?? ""}
          disabled={readOnly}
          onChange={(e) => setValue({ ...value, [key]: e.target.value })}
          className="mt-1.5 min-h-20 w-full rounded-xl border border-border px-3 py-2.5 text-sm disabled:bg-muted"
        />
      ) : (
        <input
          value={value[key] ?? ""}
          disabled={readOnly || (key === "code" && mode === "edit")}
          onChange={(e) => setValue({ ...value, [key]: e.target.value })}
          className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm disabled:bg-muted"
        />
      )}
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={t(mode === "add" ? "addTitle" : mode === "edit" ? "editTitle" : "viewTitle")}
      footer={
        readOnly ? (
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-muted-foreground">
            {t("common:close")}
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} disabled={saving} className="px-3 py-2 text-sm font-bold text-muted-foreground">
              {t("common:cancel")}
            </button>
            <button type="submit" form="category-form" data-mode="draft" disabled={saving} className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-600">
              {t("common:saveAsDraft")}
            </button>
            <button type="submit" form="category-form" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {saving && <Spinner size={13} />}
              {t(mode === "add" ? "addTitle" : "common:saveChanges")}
            </button>
          </>
        )
      }
    >
      <form
        id="category-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(e.nativeEvent.submitter?.dataset?.mode === "draft");
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {field("code", t("code"), { required: true })}
        {field("name", t("name"), { required: true })}
        {field("description", t("common:description"), { multiline: true })}
      </form>
    </Modal>
  );
}
