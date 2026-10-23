import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export default function TourTooltip({ index, size, step, isLastStep, backProps, primaryProps, skipProps, closeProps, tooltipProps }) {
  const { t } = useTranslation();
  return <div {...tooltipProps} className="w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-ink/15 bg-surface p-5 text-ink shadow-2xl">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-forest dark:text-lime">{t('portalTour.step', { step: index + 1, total: size })}</p>
      <button {...closeProps} aria-label={t('onboarding.tour.close')} className="rounded-lg p-1 hover:bg-ink/5"><X size={16} /></button>
    </div>
    <h3 className="mt-2 text-base font-bold">{step.title}</h3>
    <div className="mt-2 text-sm leading-relaxed text-slate-500">{step.content}</div>
    <div className="mt-4 flex flex-wrap justify-center gap-1" aria-hidden="true">{Array.from({ length: size }, (_, i) => <span key={i} className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-forest dark:bg-lime' : 'w-1.5 bg-ink/15'}`} />)}</div>
    <div className="mt-4 flex items-center gap-2">
      {!isLastStep && <button {...skipProps} className="text-xs font-semibold text-slate-500">{t('onboarding.tour.skip')}</button>}
      <div className="ms-auto flex gap-2">
        {index > 0 && <button {...backProps} className="rounded-xl border border-ink/15 px-3 py-2 text-xs font-bold">{t('onboarding.tour.back')}</button>}
        <button {...primaryProps} className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white dark:bg-lime dark:text-on-secondary">{t(isLastStep ? 'onboarding.tour.last' : 'onboarding.tour.next')}</button>
      </div>
    </div>
  </div>;
}

