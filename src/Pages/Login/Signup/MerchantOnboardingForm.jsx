import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Info, Mail, Phone, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { useContactVerification } from "@/Hooks/Onboarding/useContactVerification";
import { OtpModal, VerifiableField } from "./ContactVerification";
import { OnboardingField } from "./OnboardingField";

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
  // Email and phone are each verified on their own (a code popup); at least
  // one must be verified before onboarding can start.
  const verification = useContactVerification();
  const { screen, section, progress, editable, busy, problem } = flow;
  const steps = Array.isArray(progress.steps) ? progress.steps : [];
  const currentStep = steps.find((step) => step.current) ?? steps.find((step) => step.key === progress.next_section);

  if (flow.unavailable) {
    return (
      <Notice>
        <Lines text={flow.unavailable} />
      </Notice>
    );
  }

  // Start: the category (sub type) and the contact.
  if (!screen) {
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
    const hasContact = verification.isVerified("email", flow.pick.email) || verification.isVerified("phone", flow.pick.phone_number);
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
            <button type="button" disabled={busy === "start"} onClick={() => void flow.start({ carryOn: true })} className={quietButton}>
              {busy === "start" ? <Spinner size={13} /> : <RotateCcw size={14} />} {t("openInProgress")}
            </button>
          </Notice>
        )}
        {/* The category is only asked when there's a real choice. */}
        {flow.choices.length !== 1 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {label} <span className="text-red-500">*</span>
            </label>
            {flow.choices.length ? (
              <FilterSelect
                value={flow.choice ?? ""}
                onChange={(v) => flow.setPick({ ...flow.pick, choice: v })}
                options={flow.choices.map((c) => ({ value: c.value, label: c.isDefault ? t("standard") : c.label }))}
              />
            ) : (
              <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">{t("nothingPublished")}</p>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <VerifiableField
            channel="email"
            type="email"
            icon={Mail}
            label={t("email")}
            placeholder={t("emailPlaceholder")}
            value={flow.pick.email}
            onChange={(value) => flow.setPick({ ...flow.pick, email: value })}
            verification={verification}
          />
          <VerifiableField
            channel="phone"
            type="tel"
            icon={Phone}
            label={t("phone")}
            placeholder={t("phonePlaceholder")}
            value={flow.pick.phone_number}
            onChange={(value) => flow.setPick({ ...flow.pick, phone_number: value })}
            verification={verification}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("contactHint")}</p>
        <button type="button" disabled={!hasContact || flow.choice === null || busy === "start"} onClick={() => void flow.start()} className={primaryButton}>
          {busy === "start" ? <RefreshCw size={14} className="animate-spin" /> : null} {t("startOnboarding")} <ArrowRight size={14} />
        </button>
        <OtpModal verification={verification} />
      </div>
    );
  }

  // Finished (submitted): no more editing.
  if (!editable) {
    return (
      <div className="py-10 text-center">
        <CircleCheck size={40} className="mx-auto text-primary" />
        <h2 className="mt-4 text-xl font-bold text-foreground">{t("allSet")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{flow.completedMessage || flow.onboarding?.status_name}</p>
        <button type="button" onClick={onDone} className={`${primaryButton} mt-6`}>
          {t("backToSignIn")} <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const discardControls = (
    <>
      <button type="button" onClick={() => setConfirmDiscard(true)} className={quietButton}>
        <RotateCcw size={14} /> {t("discardStartOver")}
      </button>
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
    </>
  );
  const backButton = progress.previous_section ? (
    <button type="button" disabled={busy === "back"} onClick={() => void flow.back()} className={quietButton}>
      {busy === "back" ? <Spinner size={13} /> : <ArrowLeft size={14} />} {t("back")}
    </button>
  ) : (
    <span />
  );

  // No section left: the last one is done. Finish when everything required
  // is in place; otherwise Back lets the merchant complete what's missing.
  if (!section) {
    return (
      <div className="space-y-5">
        {problem && (
          <Notice>
            <Lines text={problem} />
          </Notice>
        )}
        <div className="rounded-2xl border border-primary/30 bg-primary-light p-5">
          <p className="font-semibold text-foreground">{progress.ready_to_submit ? t("readyToFinish") : t("notReadyYet")}</p>
          {progress.ready_to_submit && (
            <button type="button" disabled={busy === "submit"} onClick={() => void flow.submit()} className={`${primaryButton} mt-4`}>
              {busy === "submit" ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} {t("finishSetup")}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          {backButton}
          {discardControls}
        </div>
      </div>
    );
  }

  const typeCaption = section.fields?.find((f) => f.key === section.type_field)?.label ?? t("type");
  const visibleFields = (section.fields ?? []).filter((f) => f.key !== section.type_field);
  const sectionIssues = (section.issues ?? []).filter((i) => !i.field);

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
              file={field.field_type === "FILE" ? { ...fileRulesFor(row), upload: (file, side) => flow.uploadFile(field.key, file, side), download: flow.downloadFile } : undefined}
              onChange={(v) => {
                flow.setValue(rowIndex, field.key, v);
                // A dependent list's options belong to its parent's value.
                visibleFields.filter((child) => child.parent_field === field.key).forEach((child) => flow.setValue(rowIndex, child.key, ""));
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
          {progress.position != null && <p className="text-xs font-medium text-muted-foreground">{t("stepOf", { current: progress.position, total: progress.total })}</p>}
          <h2 className="mt-1 text-lg font-bold text-foreground">{currentStep?.heading ?? section.label ?? section.name}</h2>
          {currentStep?.subheading && <p className="mt-1 text-sm text-muted-foreground">{currentStep.subheading}</p>}
        </div>
        {discardControls}
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

      <div className="flex items-center justify-between gap-3 pt-2">
        {backButton}
        <button type="button" disabled={busy === "next"} onClick={() => void flow.next()} className={primaryButton}>
          {busy === "next" ? <RefreshCw size={14} className="animate-spin" /> : null} {t("next")} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
