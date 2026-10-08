import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { STORAGE_KEYS } from "@/Utils/Constant";

// Guided tour for the individual onboarding form. Each step of the form has
// its own short tour, shown automatically the first time the customer
// reaches that step. "Skip tour" turns the automatic tours off for good; the
// header's "Take a tour" button replays the current step's tour any time.
//
// Targets are the `data-field` keys from the bank's form config (see
// OnboardingField) and a few `data-tour` hooks in the page. A step whose
// target isn't on screen (a field the bank doesn't use, or the side panel on
// a phone) is simply left out.

const PROGRESS = {
  target: '[data-tour="progress"]',
  title: "onboarding.tour.progress.title",
  content: "onboarding.tour.progress.content",
  placement: "right",
};
const REQUIREMENTS = {
  target: '[data-tour="requirements"]',
  title: "onboarding.tour.requirements.title",
  content: "onboarding.tour.requirements.content",
};
const ADD_ROW = {
  target: '[data-tour="add-row"]',
  title: "onboarding.tour.addRow.title",
  content: "onboarding.tour.addRow.content",
};
const SKIP = {
  target: '[data-tour="skip-step"]',
  title: "onboarding.tour.skipStep.title",
  content: "onboarding.tour.skipStep.content",
};
const SAVE = {
  target: '[data-tour="save"]',
  title: "onboarding.tour.save.title",
  content: "onboarding.tour.save.content",
};
// The form is built by the institution, so its sections and fields are not
// known here. The tour adds a step for any field whose key it recognises
// (the usual ones below) and describes the rest of the page generically.
const FIELD_STEPS = {
  first_name: { target: `[data-field="first_name"]`, title: "onboarding.tour.name.title", content: "onboarding.tour.name.content" },
  date_of_birth: { target: `[data-field="date_of_birth"]`, title: "onboarding.tour.birth.title", content: "onboarding.tour.birth.content" },
  nationality_id: { target: `[data-field="nationality_id"]`, title: "onboarding.tour.nationality.title", content: "onboarding.tour.nationality.content" },
  primary_mobile: { target: `[data-field="primary_mobile"]`, title: "onboarding.tour.mobile.title", content: "onboarding.tour.mobile.content" },
  personal_email: { target: `[data-field="personal_email"]`, title: "onboarding.tour.email.title", content: "onboarding.tour.email.content" },
  document_type_id: { target: `[data-field="document_type_id"]`, title: "onboarding.tour.idType.title", content: "onboarding.tour.idType.content" },
  identification_number: { target: `[data-field="identification_number"]`, title: "onboarding.tour.idNumber.title", content: "onboarding.tour.idNumber.content" },
  front_image: { target: `[data-field="front_image"]`, title: "onboarding.tour.idPhoto.title", content: "onboarding.tour.idPhoto.content" },
  address_type_id: { target: `[data-field="address_type_id"]`, title: "onboarding.tour.addressType.title", content: "onboarding.tour.addressType.content" },
  address_line_1: { target: `[data-field="address_line_1"]`, title: "onboarding.tour.address.title", content: "onboarding.tour.address.content" },
  country_id: { target: `[data-field="country_id"]`, title: "onboarding.tour.country.title", content: "onboarding.tour.country.content" },
  employment_id: { target: `[data-field="employment_id"]`, title: "onboarding.tour.employment.title", content: "onboarding.tour.employment.content" },
  source_of_fund_id: { target: `[data-field="source_of_fund_id"]`, title: "onboarding.tour.funds.title", content: "onboarding.tour.funds.content" },
  is_primary: { target: `[data-field="is_primary"]`, title: "onboarding.tour.primary.title", content: "onboarding.tour.primary.content" },
  pan: { target: `[data-field="pan"]`, title: "onboarding.tour.tax.title", content: "onboarding.tour.tax.content" },
  pep_status_id: { target: `[data-field="pep_status_id"]`, title: "onboarding.tour.pep.title", content: "onboarding.tour.pep.content" },
  relationship_type_id: { target: `[data-field="relationship_type_id"]`, title: "onboarding.tour.relationships.title", content: "onboarding.tour.relationships.content" },
  related_party_name: { target: `[data-field="related_party_name"]`, title: "onboarding.tour.relatedName.title", content: "onboarding.tour.relatedName.content" },
  file_front: { target: `[data-field="file_front"]`, title: "onboarding.tour.upload.title", content: "onboarding.tour.upload.content" },
};
const REQUIRED_MARK = {
  target: '[data-tour="required-mark"]',
  title: "onboarding.tour.required.title",
  content: "onboarding.tour.required.content",
};

// Progress is kept per onboarding (reference id), so every new onboarding
// gets its tours again and an earlier "Skip tour" doesn't silence it.
function readState(kind, session) {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.onboardingTour(kind)) ?? "null");
    if (value?.session !== session) return { session, off: false, seen: [] };
    return { session, off: Boolean(value?.off), seen: Array.isArray(value?.seen) ? value.seen : [] };
  } catch {
    return { off: false, seen: [] };
  }
}
function writeState(kind, state) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.onboardingTour(kind), JSON.stringify(state));
  } catch {
    /* The tour may simply show again next time. */
  }
}

function stepsFor({ fieldKeys, isFirstStep, multiRow, hasRequirements }) {
  const steps = [
    ...(isFirstStep ? [PROGRESS] : []),
    ...(hasRequirements ? [REQUIREMENTS] : []),
    ...(isFirstStep ? [REQUIRED_MARK] : []),
    ...fieldKeys.filter((key) => FIELD_STEPS[key]).map((key) => FIELD_STEPS[key]),
    ...(multiRow ? [ADD_ROW] : []),
    ...(isFirstStep ? [] : [SKIP]),
    SAVE,
  ];
  return steps
    .filter((step) => document.querySelector(step.target)?.getClientRects().length)
    .map((step) => ({ disableBeacon: true, ...step }));
}

export default function OnboardingTour({ kind = "individual", session, sectionKey, fieldKeys = [], isFirstStep, multiRow, hasRequirements, replayKey }) {
  const { t } = useTranslation();
  const [tour, setTour] = useState(null); // { id, steps } while running

  const start = (force) => {
    const state = readState(kind, session);
    if (!force && (state.off || state.seen.includes(sectionKey))) return;
    const steps = stepsFor({ fieldKeys, isFirstStep, multiRow, hasRequirements });
    if (steps.length) setTour({ id: `${sectionKey}-${Date.now()}`, steps });
  };

  // First visit to each step: start its tour once the step has rendered.
  useEffect(() => {
    setTour(null);
    const timer = window.setTimeout(() => start(false), 700);
    return () => window.clearTimeout(timer);
    // Runs per step; the other props describe that same step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  // "Take a tour": replay this step's tour, even if tours were skipped.
  useEffect(() => {
    if (!replayKey) return;
    setTour(null);
    const timer = window.setTimeout(() => start(true), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  const handle = ({ action, status, type }) => {
    const skipped = status === STATUS.SKIPPED;
    const done = status === STATUS.FINISHED || action === ACTIONS.CLOSE || type === EVENTS.TOUR_END;
    if (!skipped && !done) return;
    const state = readState(kind, session);
    writeState(kind, {
      session,
      off: state.off || skipped,
      seen: state.seen.includes(sectionKey) ? state.seen : [...state.seen, sectionKey],
    });
    setTour(null);
  };

  if (!tour) return null;
  return (
    <Joyride
      key={tour.id}
      run
      steps={tour.steps.map((step) => ({ ...step, title: t(step.title), content: t(step.content) }))}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollOffset={140}
      disableOverlayClose
      callback={handle}
      locale={{
        back: t("onboarding.tour.back"),
        close: t("onboarding.tour.close"),
        last: t("onboarding.tour.last"),
        next: t("onboarding.tour.next"),
        skip: t("onboarding.tour.skip"),
        open: t("onboarding.tour.open"),
        nextLabelWithProgress: t("onboarding.tour.nextLabelWithProgress"),
      }}
      styles={{
        options: {
          primaryColor: "rgb(var(--color-forest-or-lime))",
          textColor: "rgb(var(--slate-700))",
          backgroundColor: "rgb(var(--color-surface))",
          arrowColor: "rgb(var(--color-surface))",
          overlayColor: "rgba(15, 23, 42, 0.55)",
          zIndex: 60,
        },
        tooltip: { borderRadius: 16, padding: 20, fontFamily: "inherit" },
        tooltipTitle: { fontSize: 16, fontWeight: 600, textAlign: "left" },
        tooltipContent: { padding: "8px 0 0", fontSize: 14, lineHeight: 1.55, textAlign: "left" },
        buttonNext: { borderRadius: 12, padding: "9px 16px", fontWeight: 600, color: "rgb(var(--color-on-button))" },
        buttonBack: { color: "rgb(var(--color-forest-or-lime))", fontWeight: 600 },
        buttonSkip: { color: "rgb(var(--slate-500))" },
        spotlight: { borderRadius: 16 },
      }}
    />
  );
}
