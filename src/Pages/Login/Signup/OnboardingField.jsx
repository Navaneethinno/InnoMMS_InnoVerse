import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, FileText, Upload, X } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications } from "@/Utils/Lib/notifications";

export const fieldControl =
  "w-full rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60";

// A `file` field: the file is uploaded straight away (upload(file) resolves
// to { path, file_name }) and the stored path becomes the field's value.
// "View" fetches it back through the API.
function FileField({ value, onChange, disabled, file }) {
  const { t } = useTranslation("signup");
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const accept = file?.formats?.map((f) => `.${f}`).join(",");

  const choose = async (picked) => {
    if (!picked) return;
    if (file?.maxBytes && picked.size > file.maxBytes) {
      notifications.error(t("fileTooLarge", { size: Math.round(file.maxBytes / 1024) }));
      return;
    }
    setUploading(true);
    try {
      const stored = await file.upload(picked);
      setName(stored?.file_name ?? picked.name);
      onChange(stored?.path ?? "");
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const view = async () => {
    try {
      const blob = await file.download(value);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      notifications.error(error.message);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
      {value ? (
        <span className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
          <FileText size={14} className="shrink-0 text-primary" />
          <span className="truncate">{name || value.split("/").pop()}</span>
          <button type="button" onClick={() => void view()} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Eye size={12} /> {t("view")}
          </button>
          {!disabled && (
            <button type="button" onClick={() => onChange("")} aria-label={t("remove")} className="text-muted-foreground hover:text-red-500">
              <X size={13} />
            </button>
          )}
        </span>
      ) : null}
      {!disabled && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-60"
        >
          {uploading ? <Spinner size={13} /> : <Upload size={14} />} {value ? t("replaceFile") : t("uploadFile")}
        </button>
      )}
      {file?.formats && <span className="basis-full text-[11px] text-muted-foreground">{file.formats.join(", ").toUpperCase()}</span>}
    </div>
  );
}

// One wizard field exactly as the institution's onboarding configuration
// describes it: `field.input` picks the control, nothing is hard-coded per
// field name.
export function OnboardingField({ field, value, onChange, error, options, file }) {
  const disabled = Boolean(field.read_only);
  const control = (() => {
    switch (field.input) {
      case "checkbox":
        return <CheckboxPill checked={Boolean(value)} onChange={onChange} label={field.label} disabled={disabled} />;
      case "select":
        return (
          <FilterSelect
            disabled={disabled}
            value={value != null ? String(value) : ""}
            onChange={(v) => onChange(v === "" ? "" : Number(v))}
            options={[{ value: "", label: `— ${field.label} —` }, ...(options ?? field.options ?? []).map((o) => ({ value: String(o.id), label: o.name }))]}
          />
        );
      case "date":
      case "datetime":
        return (
          <input
            type={field.input === "date" ? "date" : "datetime-local"}
            className={fieldControl}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
      case "decimal":
        return (
          <input
            type="number"
            step={field.input === "decimal" ? "any" : "1"}
            className={fieldControl}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        );
      case "file":
        return <FileField value={value ?? ""} onChange={onChange} disabled={disabled} file={file} />;
      default:
        return <input type="text" className={fieldControl} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    }
  })();

  if (field.input === "checkbox") {
    return (
      <div data-field={field.key}>
        {control}
        {field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <div data-field={field.key}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {field.label}
        {field.mandatory && <span className="text-red-500"> *</span>}
      </label>
      {control}
      {field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
