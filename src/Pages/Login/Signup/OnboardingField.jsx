import { useRef, useState } from "react";
import { Eye, FileText, Upload, X } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications } from "@/Utils/Lib/notifications";
export const fieldControl = "w-full rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60";

function FileField({ value, onChange, disabled, field, file }) {
  const ref = useRef(null), [uploading, setUploading] = useState(false);
  const upload = async (picked, side) => { if (!picked) return; if (field.options?.max_size_kb && picked.size > field.options.max_size_kb * 1024) return notifications.error(`File must be at most ${field.options.max_size_kb} KB.`); setUploading(true); try { const stored = await file.upload(picked, side); onChange(side ? { ...(value ?? {}), [side]: stored?.path } : stored?.path); } catch (error) { notifications.error(error.message); } finally { setUploading(false); ref.current && (ref.current.value = ""); } };
  const view = async (path) => { try { const url = URL.createObjectURL(await file.download(path)); window.open(url, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (error) { notifications.error(error.message); } };
  const sides = field.options?.sides === "front_back" ? ["front", "back"] : [null];
  return <div className="space-y-2">{sides.map((side) => { const path = side ? value?.[side] : value; return <div key={side ?? "file"} className="flex items-center gap-2"><input ref={side ? undefined : ref} type="file" className="hidden" accept={(field.options?.allowed_types ?? []).join(",")} onChange={(e) => void upload(e.target.files?.[0], side)} id={`${field.key}-${side ?? "file"}`} /><label htmlFor={`${field.key}-${side ?? "file"}`} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-sm font-semibold text-primary"><Upload size={14} />{uploading ? <Spinner size={13} /> : side ? `Upload ${side}` : "Upload file"}</label>{path && <><span className="truncate text-xs">{String(path).split("/").pop()}</span><button type="button" onClick={() => void view(path)} className="text-primary"><Eye size={14} /></button><button type="button" disabled={disabled} onClick={() => onChange(side ? { ...value, [side]: "" } : "")}><X size={14} /></button></>}</div>; })}</div>;
}

export function OnboardingField({ field, value, onChange, error, options, file }) {
  const disabled = Boolean(field.read_only), type = field.field_type;
  const list = options ?? field.choices ?? [];
  let control;
  if (type === "DROPDOWN" || type === "RADIO") control = type === "DROPDOWN" ? <FilterSelect disabled={disabled} value={value ?? ""} onChange={onChange} options={[{ value: "", label: `— ${field.label} —` }, ...list.map((x) => ({ value: String(x.value), label: x.label }))]} /> : <div className="space-y-2">{list.map((x) => <label key={x.value} className="flex gap-2 text-sm"><input type="radio" disabled={disabled} checked={String(value) === String(x.value)} onChange={() => onChange(x.value)} />{x.label}</label>)}</div>;
  else if (type === "CHECKBOXES") control = <div className="space-y-2">{list.map((x) => <CheckboxPill key={x.value} label={x.label} disabled={disabled} checked={(value ?? []).map(String).includes(String(x.value))} onChange={(on) => onChange(on ? [...(value ?? []), x.value] : (value ?? []).filter((v) => String(v) !== String(x.value)))} />)}</div>;
  else if (type === "YES_NO") control = <CheckboxPill label={value ? (field.options?.yes_label ?? "Yes") : (field.options?.no_label ?? "No")} disabled={disabled} checked={Boolean(value)} onChange={onChange} />;
  else if (type === "FILE") control = <FileField value={value} onChange={onChange} disabled={disabled} field={field} file={file} />;
  else { const inputType = type === "DATE" ? "date" : type === "EMAIL" ? "email" : type === "PHONE" ? "tel" : type === "NUMBER" ? "number" : "text"; control = <input type={inputType} className={fieldControl} disabled={disabled} value={value ?? ""} placeholder={field.hint ?? ""} min={field.options?.min} max={field.options?.max} minLength={field.options?.min_length} maxLength={field.options?.max_length} onChange={(e) => onChange(type === "NUMBER" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} />; }
  return <div data-field={field.key}><label className="mb-1.5 block text-sm font-medium text-foreground">{field.label}{field.required && <span className="text-red-500"> *</span>}{field.kyc_level_no && <span className="ml-2 text-xs font-normal text-muted-foreground">KYC level {field.kyc_level_no}</span>}</label>{control}{field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}{error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}</div>;
}
