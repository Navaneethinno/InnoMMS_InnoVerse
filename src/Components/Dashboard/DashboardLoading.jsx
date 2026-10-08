import { useEffect, useState } from "react";
import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";
import wasmUrl from "@lottiefiles/dotlottie-web/dotlottie-player.wasm?url";
import animationUrl from "@/assets/animations/dashboard-loading.lottie?url";
import { useTranslation } from "react-i18next";
import LoadingState from "@/Components/Common/LoadingState";

// Bundle the renderer locally so animation playback does not depend on a CDN.
setWasmUrl(wasmUrl);

export default function DashboardLoading() {
  const { t } = useTranslation();
  const [player, setPlayer] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!player) return;
    const onError = () => setFailed(true);
    player.addEventListener('loadError', onError);
    return () => player.removeEventListener('loadError', onError);
  }, [player]);
  useEffect(() => {
    if (!player) return;
    if (reducedMotion) { player.pause(); player.setFrame(0); }
    else player.play();
  }, [player, reducedMotion]);
  return (
    <div role="status" aria-live="polite" aria-label={t('dashboard.loading')} className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-paper px-6">
      {failed ? <LoadingState /> : <>
        <div aria-hidden="true" className="w-full max-w-[440px]">
          <DotLottieReact src={animationUrl} loop autoplay={!reducedMotion} dotLottieRefCallback={setPlayer} className="aspect-square w-full" />
        </div>
        <span className="sr-only">{t('dashboard.loading')}</span>
      </>}
    </div>
  );
}
