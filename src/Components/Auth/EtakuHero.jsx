import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/etaku/logo.svg";
import photoOne from "@/assets/etaku/merchant-1.webp";
import photoTwo from "@/assets/etaku/merchant-2.webp";

// E-TAKU (institution 5) sign-in panel: the photos and logo of the E-TAKU app
// design (Figma), one slide at a time. Other institutions keep the standard panel.
const SLIDES = [
  { photo: photoOne, title: "etaku.slide1Title", text: "etaku.slide1Text", accent: "etaku.slide1Accent" },
  { photo: photoTwo, title: "etaku.slide2Title", text: "etaku.slide2Text", accent: "etaku.slide2Accent" },
];
const DEFAULTS = {
  "etaku.slide1Title": "Get paid in seconds",
  "etaku.slide1Accent": "in seconds",
  "etaku.slide1Text": "Your customers pay with their phone and the money lands in your wallet straight away.",
  "etaku.slide2Title": "Your business, always open",
  "etaku.slide2Accent": "always open",
  "etaku.slide2Text": "Follow sales, refunds and wallets from one dashboard.",
  "etaku.panelFoot": "Your secure E-TAKU Business portal",
};

export default function EtakuHero() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => window.clearInterval(timer);
  }, []);
  const tr = (key) => t(key, { defaultValue: DEFAULTS[key] });
  return (
    <aside className="etaku-hero relative isolate hidden h-screen overflow-hidden bg-[#09090B] text-white min-[880px]:flex">
      {SLIDES.map((s, i) => (
        <img
          key={s.photo}
          src={s.photo}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-[center_20%] transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(9,9,11,0.55)_0%,rgba(9,9,11,0.05)_30%,rgba(9,9,11,0.35)_55%,rgba(9,9,11,0.96)_100%)]" />
      <div className="flex w-full flex-col px-10 py-9 xl:px-16">
        <img src={logo} alt="e-taku" className="h-16 w-auto self-start drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]" />
        <div className="mt-auto max-w-[560px]">
          {SLIDES.map((s, i) => {
            const title = tr(s.title);
            const accent = tr(s.accent);
            const at = title.indexOf(accent);
            return (
              <div key={s.title} className={i === index ? "block" : "hidden"} aria-live="polite">
                <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
                  {at >= 0 ? (
                    <>
                      {title.slice(0, at)}
                      <span className="text-[#FFCC00]">{accent}</span>
                      {title.slice(at + accent.length)}
                    </>
                  ) : (
                    title
                  )}
                </h2>
                <p className="mt-4 max-w-[46ch] text-base leading-7 text-white/75">{tr(s.text)}</p>
              </div>
            );
          })}
          <div className="mt-8 flex items-center gap-2" role="tablist">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1} / ${SLIDES.length}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-[#FFCC00]" : "w-3 bg-white/35 hover:bg-white/60"}`}
              />
            ))}
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs text-white/55">
            <ShieldCheck size={15} className="shrink-0" />
            {tr("etaku.panelFoot")}
          </div>
        </div>
      </div>
    </aside>
  );
}
