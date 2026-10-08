import { useTranslation } from "react-i18next";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { KeyRound } from "lucide-react";
import FieldError from "@/Components/Common/FieldError";
import FilterSelect from "@/Components/Common/FilterSelect";
import CheckboxPill from "@/Components/Common/CheckboxPill";
import FileUploadField from "@/Components/Common/FileUploadField";
import { cn } from "@/Utils/Lib/utils";

// Renders one wizard field exactly as the institution's form builder
// describes it. `field.field_type` picks the control; nothing here depends
// on a field's name, so a field the institution adds tomorrow renders
// correctly today. `field.options` limits (lengths, ranges, dates, file
// rules) are only used to pre-check on the device: the server enforces them
// again on `next`.
// `choices`: the list's choices, already narrowed to the parent's answer.
// `file` (FILE fields only): { upload(file, side), download, formats,
// maxBytes, capture } from the wizard.

const isoDate = (date) => date.toISOString().slice(0, 10);
const yearsAgo = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return isoDate(date);
};

function dateLimits(options = {}) {
  const today = isoDate(new Date());
  const mins = [options.min_date, options.no_past && today, options.max_age != null && yearsAgo(Number(options.max_age) + 1)].filter(Boolean);
  const maxes = [options.max_date, options.no_future && today, options.min_age != null && yearsAgo(Number(options.min_age))].filter(Boolean);
  return { min: mins.sort().at(-1), max: maxes.sort()[0] };
}

// What the server shows for a PIN it has stored.
const PIN_MASK = "********";

const sameValue = (a, b) => String(a) === String(b);

export default function OnboardingField({ field, value, onChange, error, choices, badge, file }) {
  const { t } = useTranslation();
  // An amount (`currency: true`) shows the institution's main currency in front.
  const currency = usePortalPolicy().currencies[0]?.code;
  const type = String(field.field_type ?? "TEXT").toUpperCase();
  const options = field.options ?? {};
  const disabled = Boolean(field.read_only);
  const commonInput = cn("field-control border-ink/25 focus:border-ink", error && "!border-red-400 focus:!border-red-400 focus:ring-red-100");
  const list = choices ?? field.choices ?? [];
  // Radix lists carry text values: hand back the choice's own value.
  const choiceValue = (text) => list.find((c) => sameValue(c.value, text))?.value ?? text;
  // A group of controls (radio, checkboxes, switch, front/back files) is not
  // wrapped in a <label>, which would make every click hit the first one.
  const grouped = ["RADIO", "CHECKBOXES", "YES_NO", "PIN", "FILE"].includes(type);

  // Uploads (file name and actions) and a PIN typed twice need a full row.
  const wide = type === "FILE" || (type === "PIN" && options.confirm !== false);

  const control = (() => {
    switch (type) {
      case "NUMBER": {
        const integer = options.number_kind === "integer";
        const step = integer ? "1" : options.decimals != null ? String(10 ** -Number(options.decimals)) : "any";
        return (
          <div className="relative">
            {options.currency && currency && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500">{currency}</span>}
            <input
              type="number"
              step={step}
              min={options.min}
              max={options.max}
              placeholder={field.hint}
              className={commonInput}
              style={options.currency && currency ? { paddingLeft: `${currency.length * 0.62 + 1.6}rem` } : undefined}
              value={value ?? ""}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        );
      }
      case "DATE": {
        const { min, max } = dateLimits(options);
        return (
          <input type="date" min={min} max={max} className={commonInput} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        );
      }
      case "PHONE":
        return (
          <input
            type="tel"
            inputMode="tel"
            placeholder={field.hint}
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "EMAIL":
        return (
          <input
            type="email"
            placeholder={field.hint}
            className={commonInput}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "DROPDOWN":
        return (
          <FilterSelect
            value={value != null && value !== "" ? String(value) : ""}
            onChange={(v) => onChange(v === "" ? "" : choiceValue(v))}
            disabled={disabled}
            placeholder={field.hint || t("onb.select", { label: field.label })}
            options={list.map((c) => ({ value: String(c.value), label: c.label }))}
            className="border-ink/25 focus:border-ink"
            clearable={!field.required}
          />
        );
      case "RADIO":
        return (
          <div role="radiogroup" aria-label={field.label} className={list.some((c) => c.description) ? "grid gap-3" : "flex flex-wrap gap-x-5 gap-y-2"}>
            {list.map((c) => (
              <label key={String(c.value)} className="inline-flex cursor-pointer items-start gap-2 text-sm font-normal text-slate-600">
                <input
                  type="radio"
                  name={`field-${field.key}`}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-forest"
                  checked={sameValue(value, c.value)}
                  disabled={disabled}
                  onChange={() => onChange(c.value)}
                />
                <span>
                  {c.label}
                  {c.description && <span className="block text-xs text-slate-400">{c.description}</span>}
                </span>
              </label>
            ))}
          </div>
        );
      case "CHECKBOXES": {
        const picked = Array.isArray(value) ? value : [];
        const atMax = options.max_select != null && picked.length >= Number(options.max_select);
        return (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {list.map((c) => {
              const checked = picked.some((v) => sameValue(v, c.value));
              return (
                <CheckboxPill
                  key={String(c.value)}
                  label={c.label}
                  checked={checked}
                  disabled={disabled || (!checked && atMax)}
                  onChange={(e) => onChange(e.target.checked ? [...picked, c.value] : picked.filter((v) => !sameValue(v, c.value)))}
                />
              );
            })}
          </div>
        );
      }
      case "YES_NO": {
        const on = value === true;
        return (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={field.label}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className="inline-flex items-center gap-3 rounded-full text-sm font-medium text-slate-600 disabled:opacity-60"
          >
            <span className={cn("relative h-6 w-11 rounded-full transition", on ? "bg-forest dark:bg-lime" : "bg-slate-300")}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
            </span>
            {on ? options.yes_label || t("onb.yes") : options.no_label || t("onb.no")}
          </button>
        );
      }
      case "PIN": {
        // A secret number the merchant chooses: masked, digits only, typed
        // twice unless the field says otherwise. The server never sends a
        // saved PIN back, only "********", which stays as it is unless a new
        // one is typed.
        const confirm = options.confirm !== false;
        const max = Number(options.max_length ?? 6);
        const pair = value && typeof value === "object" ? value : { pin: typeof value === "string" && value !== PIN_MASK ? value : "", confirm: "" };
        if (value === PIN_MASK) {
          return (
            <div className="flex items-center gap-3 rounded-xl border border-ink/25 bg-surface px-3 py-2.5">
              <KeyRound size={16} className="shrink-0 text-ink" />
              <span className="flex-1 text-sm font-semibold text-slate-700">{t("onb.pinSet")} <span className="tracking-widest text-slate-400">••••</span></span>
              {!disabled && (
                <button type="button" onClick={() => onChange(confirm ? { pin: "", confirm: "" } : "")} className="shrink-0 text-xs font-bold text-ink">
                  {t("onb.change")}
                </button>
              )}
            </div>
          );
        }
        const digits = (text) => text.replace(/\D/g, "").slice(0, max);
        const input = (name, label, current) => (
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-label={label}
            placeholder={label}
            maxLength={max}
            className={commonInput}
            value={current}
            disabled={disabled}
            onChange={(e) => (confirm ? onChange({ ...pair, [name]: digits(e.target.value) }) : onChange(digits(e.target.value)))}
          />
        );
        return confirm ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {input("pin", field.hint || t("onb.pin"), pair.pin ?? "")}
            {input("confirm", options.confirm_label || field.label || t("onb.confirmPin"), pair.confirm ?? "")}
          </div>
        ) : (
          input("pin", field.hint || t("onb.pin"), pair.pin ?? "")
        );
      }
      case "FILE": {
        const single = (side, current, set, caption) => (
          <div key={side ?? "file"}>
            {caption && <p className="mb-1 text-xs font-semibold text-slate-500">{caption}</p>}
            <FileUploadField
              value={current ?? ""}
              disabled={disabled}
              onChange={set}
              upload={file ? (f) => file.upload(f, side) : undefined}
              download={file?.download}
              formats={file?.formats}
              maxBytes={file?.maxBytes}
              capture={file?.capture}
              className={error ? "!border-red-400" : ""}
            />
          </div>
        );
        if (options.sides === "front_back") {
          const pair = value && typeof value === "object" ? value : {};
          return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {single("front", pair.front, (path) => onChange({ ...pair, front: path }), t("onb.front"))}
              {single("back", pair.back, (path) => onChange({ ...pair, back: path }), t("onb.reverse"))}
            </div>
          );
        }
        return single(undefined, typeof value === "string" ? value : "", onChange);
      }
      default:
        return (
          <input
            type="text"
            placeholder={field.hint}
            minLength={options.min_length}
            maxLength={options.max_length}
            className={cn(commonInput, options.case === "upper" && "uppercase", options.case === "lower" && "lowercase")}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => {
              const text = e.target.value;
              onChange(options.case === "upper" ? text.toUpperCase() : options.case === "lower" ? text.toLowerCase() : text);
            }}
          />
        );
    }
  })();

  const heading = (
    <>
      {field.label}
      {field.required && (
        <span data-tour="required-mark" className="text-red-500">
          {" "}*
        </span>
      )}
      {badge}
    </>
  );
  const notes = (
    <>
      {field.help_text && <p className="mt-1 text-[11px] font-normal text-slate-400">{field.help_text}</p>}
      <FieldError>{error}</FieldError>
    </>
  );

  if (grouped) {
    return (
      <div data-field={field.key} className={cn("block min-w-0 text-sm font-semibold text-slate-700", wide && "sm:col-span-2")}>
        <p>{heading}</p>
        <div className="mt-1.5">{control}</div>
        {notes}
      </div>
    );
  }
  return (
    <label data-field={field.key} className={cn("block min-w-0 text-sm font-semibold text-slate-700", wide && "sm:col-span-2")}>
      {heading}
      <div className="mt-1.5">{control}</div>
      {notes}
    </label>
  );
}
