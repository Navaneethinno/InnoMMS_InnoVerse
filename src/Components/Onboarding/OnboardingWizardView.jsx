import { useTranslation } from "react-i18next";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Phone, Info, RotateCcw } from "lucide-react";
import Button from "@/Components/Common/Button";
import PhoneField from "@/Components/Common/PhoneField";
import ConfirmDialog from "@/Components/Common/ConfirmDialog";
import ErrorState from "@/Components/Common/ErrorState";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
import CheckpointScreen from "./CheckpointScreen";
import ReviewScreen from "./ReviewScreen";
import OnboardingCodeDialog from "./OnboardingCodeDialog";
import OnboardingField from "./OnboardingField";
import OnboardingTour from "./OnboardingTour";

// Shared rendering for every self-service onboarding wizard, once it has
// started: progress bar, KYC panel (individual only — a no-op otherwise),
// stepper, the active section's fields (including corporate's "same as
// another address" shortcut, itself a no-op wherever a section doesn't
// configure `same_as`), the ready-to-submit banner and the prev/save/next
// nav. `identityFields` is the one thing each flow supplies itself — the
// party-type-and-what picker fields are the only part that genuinely
// differs between individual and corporate.
export default function OnboardingWizardView({ flow, identityFields, onSubmitted, onActiveChange, tourRequest, tourEnabled = false }) {
  const {
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
    beginOnboarding,
    setValue,
    addRow,
    removeRow,
    issueFor,
    persistSection,
    skipSection,
    goBack,
    navigating,
    submitForApproval,
    conflict,
    discarding,
    discardOnboarding,
    choicesFor,
    uploadFile,
    downloadFile,
    fileRulesFor,
    verifying,
    checkpoint,
    canGoBack,
    fixed,
  } = flow;
  const { t } = useTranslation();
  const portalPolicy = usePortalPolicy();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Tell the page when the form itself is on screen so it can switch to
  // the full-page layout.
  const active = Boolean(wizard) && !unavailable;
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // "Needed for <level>" beside a field the KYC scheme first asks at a level.
  const levelName = (no) => (wizard?.kyc?.levels ?? []).find((l) => l.level_no === no)?.name;
  const neededFor = (field) => {
    const name = field.kyc_level_no != null ? levelName(field.kyc_level_no) : null;
    return name ? (
      <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-semibold text-ink">{t("onb.neededFor", { name })}</span>
    ) : null;
  };

  const renderRow = (fields, row, rowIndex) => (
    <div
      key={rowIndex ?? "single"}
      className={rowIndex === undefined ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "grid grid-cols-1 gap-5 rounded-2xl border border-slate-200 bg-paper/60 p-5 sm:grid-cols-2"}
    >
      {fields.map((field) => (
        <OnboardingField
          key={field.key}
          field={editable ? field : { ...field, read_only: true }}
          value={row?.[field.key]}
          choices={choicesFor(field, row)}
          error={issueFor(field.key, rowIndex)}
          badge={neededFor(field)}
          file={
            field.field_type === "FILE"
              ? {
                  ...fileRulesFor(field),
                  upload: (file, side) => uploadFile(field.key, file, side),
                  download: downloadFile,
                }
              : undefined
          }
          onChange={(v) => {
            setValue(rowIndex, field.key, v);
            // A dependent list's choices belong to its parent's answer.
            fields.filter((child) => child.parent_field === field.key).forEach((child) => setValue(rowIndex, child.key, ""));
          }}
        />
      ))}
      {rowIndex !== undefined && editable && (
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => removeRow(rowIndex)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 size={13} /> {t("onb.remove")}
          </button>
        </div>
      )}
    </div>
  );

  // Step 0: the identity picker (party type + whatever else the flow
  // needs) and contact details, that kicks off a fresh onboarding.
  // The bank doesn't offer web onboarding (403): a page state, worded by the API.
  if (unavailable) return <ErrorState message={unavailable} />;

  if (!wizard) {
    if (optionsError && !options) return <ErrorState message={optionsError} />;
    if (!options || resuming || fixed) {
      return (
        <div className="flex justify-center py-8">
          <LoadingAnimation className="max-w-[160px]" />
        </div>
      );
    }
    const hasCategoryChoice = flow.categories.length > 1;
    // The API verifies the contact itself: it sends a code when the
    // application starts, so the mobile number is all that is needed here.
    const canStart = Boolean(pick.phone_number.trim());
    return (
      <div className="grid grid-cols-1 gap-6">
        {problemInfo && <ErrorState message={problemInfo.message} problems={problemInfo.problems} />}
        {/* 409: this contact already has an application in progress (or has
            finished this one). Open it to continue it or discard it. */}
        {conflict && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Info size={18} className="shrink-0" />
            <p className="min-w-0 flex-1">{conflict}</p>
            <Button type="button" variant="secondary" pending={starting} onClick={() => void beginOnboarding({ contactOnly: true })} className="shrink-0">
              {t("onb.continueApplication")}
            </Button>
          </div>
        )}
        {hasCategoryChoice && <div>{identityFields}</div>}
        <div className={hasCategoryChoice ? "border-t border-slate-100 pt-6" : ""}>
          <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/70">
            {t("onb.contactDetails")}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:max-w-md">
            <PhoneField
              name="phone_number"
              label={t("onb.mobile")}
              countries={portalPolicy.phone.countries}
              value={pick.phone_number}
              onChange={(value) => setPick({ ...pick, phone_number: value })}
            />
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">{t("onb.contactHintPhone", { defaultValue: "Enter your mobile number. We will send a code to confirm it. If you already have an application in progress, the code lets you continue it." })}</p>
        </div>
        <Button
          type="button"
          animated
          pending={starting}
          disabled={!canStart}
          onClick={() => void beginOnboarding()}
          className="w-full py-3.5 disabled:opacity-50 sm:w-fit sm:px-8"
        >
          {t("onb.start")}
          <ArrowRight size={16} />
        </Button>
        <OnboardingCodeDialog flow={flow} />
      </div>
    );
  }

  // A checkpoint between two sections (or at the end): the bank's own screen.
  if (checkpoint) return <CheckpointScreen flow={flow} />;

  // Submitted: the outcome of the institution's review, and anything it asks
  // of the merchant. A submitted application is locked.
  if (!editable) return <ReviewScreen flow={flow} onSubmitted={onSubmitted} />;

  if (!section) {
    return <p className="py-16 text-center text-sm text-slate-500">{t("onb.noFields")}</p>;
  }

  const sectionTitle = (s) => s.heading ?? s.label ?? s.name;
  const sectionIssues = (section.issues ?? []).filter((issue) => !issue.field);
  // The server walks the sections in order: where we are comes from
  // `progress`, and Back / Skip only exist where there is somewhere to go.
  const total = progress?.total ?? 1;
  const position = progress?.position ?? 1;
  const isFirstStep = !progress?.previous_section;
  const isLast = !progress?.next_section;
  const { ready_to_submit: readyToFinish, percent = 0 } = progress ?? {};
  // The step list is whatever the API gives (`progress.steps`); until then
  // only the section on screen is named. It is display only: the server
  // walks the sections in order, so no step is a link.
  const apiSteps = progress?.steps ?? progress?.sections;
  const menu = Array.isArray(apiSteps)
    ? apiSteps.map((item, index) => ({
        key: item.key ?? item.code ?? index,
        step: index + 1,
        label: item.heading ?? item.label ?? item.name,
        current: item.current ?? (item.key ?? item.code) === section.key,
        done: item.state === "complete" || item.state === "completed",
      }))
    : [{ key: section.key, step: position, label: sectionTitle(section), current: true, done: false }];

  // Verification tiers (individual only): the level names come from the
  // bank's KYC scheme. Tier 1 is enough to start using the account; higher
  // tiers can be completed later.
  const levels = [...(wizard.kyc?.levels ?? [])].sort((x, y) => x.level_no - y.level_no);
  const tiers = levels.map((l) => ({ no: l.level_no, name: l.name ?? l.kyc_level_name, done: Boolean(l.met ?? l.achieved) }));
  const reached = [...tiers].reverse().find((tier) => tier.done);
  const nextTier = tiers.find((tier) => !tier.done);
  const finishCopy = !reached
    ? { title: t("onb.readyTitle"), body: t("onb.readyBody") }
    : {
        title: t("onb.tierDone", { no: reached.no, name: reached.name }),
        body: nextTier ? t("onb.tierSome") : t("onb.tierAll"),
      };

  return (
    <>
    {/* Outside the grid so the tour's own element never takes a grid cell. */}
    {tourEnabled && (
      <OnboardingTour
        session={wizard.onboarding?.reference_id}
        sectionKey={section.key}
        fieldKeys={(section.fields ?? []).map((f) => f.key)}
        isFirstStep={isFirstStep}
        multiRow={Boolean(section.multi_row)}
        hasRequirements={sectionIssues.length > 0}
        replayKey={tourRequest}
      />
    )}
    <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-10">
      {/* Step list: where you are, what's done. */}
      <aside className="hidden self-start lg:sticky lg:top-[7.5rem] lg:block">
        <div data-tour="progress" className="isolate relative flex max-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-3xl brand-gradient p-6 text-white shadow-xl shadow-forest/10 dark:ring-1 dark:ring-white/10">
          <div aria-hidden="true" className="orbit -bottom-40 -right-32 h-[360px] w-[360px]" />
          <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-lime">{t("onb.progress")}</p>
          <div className="mt-3 flex shrink-0 items-end justify-between">
            <span className="text-3xl font-semibold tracking-tight">{percent}%</span>
            <span className="pb-1 text-xs text-white/55">
              {t("onb.step", { position, total })}
            </span>
          </div>
          <div className="mt-3 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${percent}%` }} />
          </div>
          <ol className="relative mt-6 grid min-h-0 gap-0.5 overflow-y-auto overscroll-contain brand-scrollbar pr-1">
            {menu.map((item) => (
              <li
                key={item.key}
                aria-current={item.current ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  item.current ? "bg-white/10 text-white" : "text-white/65"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    item.current ? "bg-lime text-on-secondary" : item.done ? "bg-lime/25 text-lime" : "border border-white/25 text-white/50"
                  }`}
                >
                  {item.done && !item.current ? <Check size={13} strokeWidth={3} /> : item.step}
                </span>
                <span className={item.current ? "font-semibold" : ""}>{item.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <section className="min-w-0">
        {/* Compact progress for small screens. */}
        <div className="mb-6 lg:hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              {t("onb.step", { position, total })}
            </span>
            <span className="text-ink">{percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {section.flow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-forest dark:text-lime">{section.flow}</p>}
            <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 lg:block">
              {t("onb.step", { position, total })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{sectionTitle(section)}</h1>
            {section.subheading && <p className="mt-1.5 text-sm leading-6 text-slate-500">{section.subheading}</p>}
          </div>
          {/* Starting again sits in plain sight at the top of every step. */}
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink/25 bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-ink hover:bg-ink/5"
          >
            <RotateCcw size={14} /> {t("onb.discardAndStart")}
          </button>
          <ConfirmDialog
            open={confirmDiscard}
            onOpenChange={setConfirmDiscard}
            title={t("onb.discardTitle")}
            description={t("onb.discardBody")}
            pending={discarding}
            onConfirm={async () => {
              if (await discardOnboarding()) setConfirmDiscard(false);
            }}
          />
        </div>

        {/* Errors always sit at the top, where the page scrolls to. */}
        {problemInfo && (
          <div className="mt-5">
            <ErrorState message={problemInfo.message} problems={problemInfo.problems} />
          </div>
        )}

        {sectionIssues.length > 0 && (
          <div data-tour="requirements" className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <Info size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("onb.required")}</p>
              <ul className="mt-1 grid gap-0.5 text-[13px]">
                {sectionIssues.map((issue, index) => (
                  <li key={index}>{issue.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-8">
          {section.multi_row ? (
            <div className="grid grid-cols-1 gap-4">
              {(Array.isArray(effectiveDraft) ? effectiveDraft : []).map((row, i) => renderRow(section.fields, row, i))}
              <button
                type="button"
                data-tour="add-row"
                disabled={section.max_rows != null && (effectiveDraft?.length ?? 0) >= section.max_rows}
                onClick={addRow}
                className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-dashed border-ink/50 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={15} /> {t("onb.addAnother")}
              </button>
            </div>
          ) : (
            renderRow(section.fields, effectiveDraft ?? {}, undefined)
          )}
        </div>


        {readyToFinish && (
          <div className="mt-6 rounded-2xl border border-ink/15 bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{finishCopy.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{finishCopy.body}</p>
              </div>
              <Button type="button" pending={submitting} onClick={() => void submitForApproval()} className="px-6">
                {t("onb.submit")}
                {!submitting && <Check size={16} />}
              </Button>
            </div>
            {tiers.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {tiers.map((tier) => (
                  <li
                    key={tier.no}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      tier.done ? "bg-ink/10 text-ink" : "border border-dashed border-slate-300 text-slate-500"
                    }`}
                  >
                    {tier.done ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                    {t("onb.tier", { no: tier.no, name: tier.name })}
                    {!tier.done && <span className="font-normal">{t("onb.optional")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isFirstStep || !canGoBack || navigating || saving}
            onClick={() => void goBack()}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-ink/5 hover:text-ink disabled:invisible"
          >
            <ArrowLeft size={16} /> {t("onb.back")}
          </button>
          <div className="flex items-center gap-2">
            {section.required === false && (
              <button
                type="button"
                data-tour="skip-step"
                disabled={navigating || saving}
                onClick={() => void skipSection()}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-ink/5 hover:text-ink"
              >
                {t("onb.skip")}
              </button>
            )}
            <Button type="button" data-tour="save" pending={saving} onClick={() => void persistSection()} className="px-6">
              {verifying ? t("review.verifying") : isLast ? t("onb.save") : t("onb.saveContinue")}
              {!saving && !isLast && <ArrowRight size={16} />}
            </Button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
