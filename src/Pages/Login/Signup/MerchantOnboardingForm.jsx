import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Info, Mail, Phone, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { OnboardingField, fieldControl } from "./OnboardingField";

const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60";
const quietButton =
  "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50";

// A document type's file_formats may be a list or a comma-separated string,
// with or without a dot / as a MIME type: reduce it to extensions.
function toFormats(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  const formats = list.map((f) => String(f).trim().toLowerCase().replace(/^\./, "").replace(/^.*\//, "")).filter(Boolean);
  return formats.length ? formats : null;
}

function Notice({ tone = "red", children }) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  };
  return <div className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 text-sm ${tones[tone]}`}>{children}</div>;
}

// The API's message; multi-reason refusals arrive as a headline plus "• " lines.
const Lines = ({ text }) => (
  <div className="min-w-0 flex-1 whitespace-pre-line">
    <Info size={16} className="mb-1 inline-block" /> {text}
  </div>
);

// Sign up's merchant onboarding for one kind: the picker that starts (or
// resumes) an onboarding, then the active section of the form. Section list
// and progress live in the page's side panel (SignupPage).
export function MerchantOnboardingForm({ flow, onDone }) {
  const { t } = useTranslation("signup");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { wizard, section, sections, activeSection, setActiveSection, editable, busy, problem } = flow;

  if (flow.unavailable) {
    return (
      <Notice>
        <Lines text={flow.unavailable} />
      </Notice>
    );
  }

  // Picker: the one role choice (sub type / company type) and the contact.
  if (!wizard) {
    if (flow.resuming || (!flow.options && !flow.optionsError)) {
      return (
        <div className="flex justify-center py-12">
          <Spinner size={22} />
        </div>
      );
    }
    if (flow.optionsError) {
      return (
        <Notice>
          <Lines text={flow.optionsError} />
        </Notice>
      );
    }
    const hasContact = flow.pick.email.trim() || flow.pick.phone_number.trim();
    const label = flow.kind === "individual" ? t("subType") : t("companyType");
    return (
      <div className="space-y-5">
        {problem && !flow.conflict && (
          <Notice>
            <Lines text={problem} />
          </Notice>
        )}
        {/* 409: this contact already has an application in progress (or has
            finished this one). Opening it lets them continue or discard it. */}
        {flow.conflict && (
          <Notice tone="amber">
            <Lines text={flow.conflict} />
            <button type="button" disabled={busy === "start"} onClick={() => void flow.start({ contactOnly: true })} className={quietButton}>
              {busy === "start" ? <Spinner size={13} /> : <RotateCcw size={14} />} {t("openInProgress")}
            </button>
          </Notice>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {label} <span className="text-red-500">*</span>
          </label>
          {flow.choices.length ? (
            <FilterSelect
              value={flow.choice ?? ""}
              onChange={(v) => flow.setPick({ ...flow.pick, choice: v })}
              options={flow.choices.map((c) => ({ value: c.value, label: c.isDefault ? t("noSubTypeDefault") : c.label }))}
            />
          ) : (
            <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">{t("nothingPublished")}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Mail size={13} /> {t("email")}
            </label>
            <input type="email" className={fieldControl} value={flow.pick.email} onChange={(e) => flow.setPick({ ...flow.pick, email: e.target.value })} placeholder={t("emailPlaceholder")} />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Phone size={13} /> {t("phone")}
            </label>
            <input type="tel" className={fieldControl} value={flow.pick.phone_number} onChange={(e) => flow.setPick({ ...flow.pick, phone_number: e.target.value })} placeholder={t("phonePlaceholder")} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("contactHint")}</p>
        <button type="button" disabled={!hasContact || flow.choice === null || busy === "start"} onClick={() => void flow.start()} className={primaryButton}>
          {busy === "start" ? <RefreshCw size={14} className="animate-spin" /> : null} {t("startOnboarding")} <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // Finished (submitted): no more editing.
  if (!editable) {
    return (
      <div className="py-10 text-center">
        <CircleCheck size={40} className="mx-auto text-primary" />
        <h2 className="mt-4 text-xl font-bold text-foreground">{t("allSet")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{flow.completedMessage || wizard.onboarding?.status_name}</p>
        <button type="button" onClick={onDone} className={`${primaryButton} mt-6`}>
          {t("backToSignIn")} <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (!section) return <p className="py-10 text-center text-sm text-muted-foreground">{t("nothingToFill")}</p>;

  const typeCaption = section.fields?.find((f) => f.key === section.type_field)?.label ?? t("type");
  const visibleFields = (section.fields ?? []).filter((f) => f.key !== section.type_field);
  const sectionIssues = (section.issues ?? []).filter((i) => !i.field);
  const isLast = activeSection >= sections.length - 1;

  const fileRulesFor = (row) => {
    const typeId = section.type_field ? row?.[section.type_field] : undefined;
    const type = section.types?.find((x) => String(x.id) === String(typeId));
    return { formats: toFormats(type?.file_formats), maxBytes: type?.max_file_size_kb ? type.max_file_size_kb * 1024 : 5 * 1024 * 1024 };
  };

  // Addresses may be "same as" another address (section types' same_as).
  const sameAsTargets = (row) => {
    const current = section.types?.find((x) => x.id === row?.[section.type_field]);
    return (section.types ?? []).filter((x) => (current?.same_as ?? []).includes(x.id));
  };

  const renderRow = (row, rowIndex) => {
    const sameAs = sameAsTargets(row);
    const sameAsId = row?.same_as_address_type_id;
    return (
      <div key={rowIndex ?? "single"} className={rowIndex === undefined ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2"}>
        {section.type_field && (
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">{typeCaption}</label>
            <FilterSelect
              value={row?.[section.type_field] != null ? String(row[section.type_field]) : ""}
              onChange={(v) => flow.setValue(rowIndex, section.type_field, v === "" ? "" : Number(v))}
              options={[{ value: "", label: `— ${typeCaption} —` }, ...(section.types ?? []).map((x) => ({ value: String(x.id), label: x.name }))]}
            />
          </div>
        )}
        {sameAs.length > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <CheckboxPill
              checked={Boolean(sameAsId)}
              label={t("sameAsAnother")}
              onChange={(on) => flow.setValue(rowIndex, "same_as_address_type_id", on ? sameAs[0].id : undefined)}
            />
            {sameAsId && (
              <FilterSelect
                value={String(sameAsId)}
                onChange={(v) => flow.setValue(rowIndex, "same_as_address_type_id", Number(v))}
                options={sameAs.map((x) => ({ value: String(x.id), label: x.name }))}
              />
            )}
          </div>
        )}
        {!sameAsId &&
          visibleFields.map((field) => (
            <OnboardingField
              key={field.key}
              field={field}
              value={row?.[field.key]}
              options={flow.optionsFor(field, row)}
              error={flow.issueFor(field.key, rowIndex)}
              file={field.input === "file" ? { ...fileRulesFor(row), upload: (file) => flow.uploadFile(field.key, file, row), download: flow.downloadFile } : undefined}
              onChange={(v) => {
                flow.setValue(rowIndex, field.key, v);
                // A dependent list's options belong to its parent's value.
                visibleFields.filter((child) => child.parent_key === field.key).forEach((child) => flow.setValue(rowIndex, child.key, ""));
              }}
            />
          ))}
        {rowIndex !== undefined && (
          <div className="sm:col-span-2">
            <button type="button" onClick={() => flow.removeRow(rowIndex)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <Trash2 size={13} /> {t("remove")}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{t("stepOf", { current: activeSection + 1, total: sections.length })}</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">{section.label ?? section.name}</h2>
        </div>
        <button type="button" onClick={() => setConfirmDiscard(true)} className={quietButton}>
          <RotateCcw size={14} /> {t("discardStartOver")}
        </button>
      </div>

      {problem && (
        <Notice>
          <Lines text={problem} />
        </Notice>
      )}
      {(sectionIssues.length > 0 || section.document_groups?.length > 0) && (
        <Notice>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("stillNeeded")}</p>
            <ul className="mt-1 list-disc pl-5 text-[13px]">
              {section.document_groups?.map((g) => (
                <li key={g.code}>{t("addAtLeast", { name: g.name, count: g.min_required })}</li>
              ))}
              {sectionIssues.map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </Notice>
      )}

      {section.multi_row ? (
        <div className="space-y-3">
          {(Array.isArray(flow.draft) ? flow.draft : []).map((row, i) => renderRow(row, i))}
          <button type="button" onClick={flow.addRow} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-light">
            <Plus size={14} /> {t("addAnother")}
          </button>
        </div>
      ) : (
        renderRow(flow.draft ?? {}, undefined)
      )}

      {wizard.progress?.ready_to_submit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-light p-4">
          <p className="text-sm font-semibold text-foreground">{t("readyToFinish")}</p>
          <button type="button" disabled={busy === "submit"} onClick={() => void flow.submit()} className={primaryButton}>
            {busy === "submit" ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} {t("finishSetup")}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" disabled={activeSection === 0} onClick={() => setActiveSection((i) => Math.max(0, i - 1))} className={`${quietButton} disabled:invisible`}>
          <ArrowLeft size={14} /> {t("back")}
        </button>
        <div className="flex items-center gap-2">
          {!isLast && (
            <button type="button" onClick={() => setActiveSection((i) => Math.min(sections.length - 1, i + 1))} className="px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              {t("skipForNow")}
            </button>
          )}
          <button type="button" disabled={busy === "save"} onClick={() => void flow.saveSection()} className={primaryButton}>
            {busy === "save" ? <RefreshCw size={14} className="animate-spin" /> : null} {isLast ? t("save") : t("saveContinue")} {!isLast && <ArrowRight size={14} />}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title={t("discardTitle")}
        description={t("discardBody")}
        confirmLabel={t("discard")}
        destructive
        pending={busy === "discard"}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          if (await flow.discard()) setConfirmDiscard(false);
        }}
      />
    </div>
  );
}
