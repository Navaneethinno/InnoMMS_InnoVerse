import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { TourContext } from "@/Components/Tour/TourContext";

export default function TourButton({ floating = false }) {
  const tour = useContext(TourContext);
  const { t } = useTranslation();
  if (!tour) return null;
  return <button type="button" onClick={tour.start} disabled={tour.running} aria-label={t('signup.takeTour')} title={t('signup.takeTour')}
    className={`${floating ? 'fixed bottom-5 right-5 z-40 shadow-lg' : ''} flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-forest px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-lime dark:text-on-secondary`}>
    <Compass size={15} /><span className={floating ? '' : 'hidden md:inline'}>{t('signup.takeTour')}</span>
  </button>;
}

