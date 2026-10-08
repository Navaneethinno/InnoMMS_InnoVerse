import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Printer, Volume2, VolumeX } from "lucide-react";
import { barcodeBars } from "@/Utils/Lib/barcode";
import { formatDate, formatMoney, formatTime } from "@/Utils/Lib/format";
import { downloadReceiptPdf } from "@/Utils/Lib/receiptPdf";
import { accountLine, receiptTexts } from "@/Utils/Lib/receiptTransaction";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";
import "./posReceipt.css";

// A handheld POS terminal printing a thermal receipt. The printer is on top;
// the receipt is fed out of its slot, sliding down line by line in small stops
// (like a real print head and paper feed), then torn off. The text keeps its
// reading order: header at the top once it has settled.
// Used on the "payment sent" screen.
//
//   <PosReceipt transaction={...} ref={ref}>{buttons}</PosReceipt>
//   ref.current.replay()
//
// transaction: { currency, amount, fee, total, from: { name, account },
//   to: { name, account }, wallet, reason, dateTime, status, reference,
//   balanceAfter }.
//
// The final, torn receipt is rendered first, so nothing looks broken while
// the script starts; the animation then plays from the top. With reduced
// motion it is simply left as the final receipt. The receipt is real text.
const ROOM = 32; // px under the paper: its bottom zigzag (8) and the lift after the tear
const LIFT = 14; // how far the torn receipt hangs below the slot
const FINAL = `translateY(${LIFT}px)`;
const SOUND_KEY = "innoverse-merchant:printer-sound";
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// The printer sound is on unless the merchant has switched it off.
const readSound = () => {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};


function Barcode({ value }) {
  const { bars, total } = barcodeBars(value);
  return (
    <svg className="pos-barcode" viewBox={`0 0 ${total} 40`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y="0" width={bar.width} height="40" fill="#23201b" />
      ))}
    </svg>
  );
}

function Row({ label, children, sub, className }) {
  if (children == null || children === "") return null;
  return (
    <>
      <div className={`ln pos-row ${className ?? ""}`}>
        <span className="pos-label">{label}</span>
        <span className="pos-value">{children}</span>
      </div>
      {sub && <div className="ln pos-sub">{sub}</div>}
    </>
  );
}

const Rule = () => <div className="ln pos-rule" aria-hidden="true" />;

const PosReceipt = forwardRef(function PosReceipt({ transaction, children, note, className }, ref) {
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const windowRef = useRef(null);
  const paperRef = useRef(null);
  const checkRef = useRef(null);
  const runId = useRef(0);
  const audioRef = useRef(null);
  const soundOn = useRef(readSound());
  const animating = useRef(false);
  const [phase, setPhase] = useState("done"); // printing | ready | done
  const [winHeight, setWinHeight] = useState(null);
  const [sound, setSound] = useState(soundOn.current);

  const tx = transaction ?? {};
  const money = (value) => (value != null && value !== "" ? formatMoney(value, tx.currency) : null);
  const when = tx.dateTime ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(tx.dateTime) ? tx.dateTime : `${tx.dateTime}Z`) : null;
  const validDate = when && !Number.isNaN(when.getTime());
  const brand = t("brand.name");
  const words = receiptTexts(tx, t, brand);
  // The institution's own logo, from its branding (nothing when it has none).
  const logo = useBrandingLogo();
  const logoRef = useRef(null);

  // Sound, modelled on a modern thermal printer rather than an old impact one:
  // a soft, high "tsss" for each line as the head fires, a quiet motor hum under
  // the whole print, a crisp tear, and a two-note confirmation beep like a
  // payment terminal. The browser lets audio start once the merchant has used
  // the page (they just pressed Send); a suspended context is resumed. Every
  // call is wrapped so sound can never break the receipt.
  const audio = useCallback(() => {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    audioRef.current ??= new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }, []);
  const envelope = (param, now, peak, seconds, attack = 0.004) => {
    param.setValueAtTime(0.0001, now);
    param.linearRampToValueAtTime(peak, now + attack);
    param.exponentialRampToValueAtTime(0.0001, now + seconds);
  };
  const hiss = useCallback(
    (ms, { low = 3800, high = 8500, gain = 0.16 } = {}) => {
      if (!soundOn.current) return;
      try {
        const context = audio();
        const length = Math.floor((context.sampleRate * ms) / 1000);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = context.createBufferSource();
        source.buffer = buffer;
        const highpass = context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = low;
        const lowpass = context.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = high;
        const volume = context.createGain();
        envelope(volume.gain, context.currentTime, gain, ms / 1000);
        source.connect(highpass).connect(lowpass).connect(volume).connect(context.destination);
        source.start();
      } catch {
        /* Sound is only a nicety. */
      }
    },
    [audio],
  );
  const beep = useCallback(
    (frequency, ms, gain = 0.1, delay = 0) => {
      if (!soundOn.current) return;
      try {
        const context = audio();
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        const volume = context.createGain();
        const now = context.currentTime + delay;
        envelope(volume.gain, now, gain, ms / 1000, 0.008);
        oscillator.connect(volume).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + ms / 1000 + 0.05);
      } catch {
        /* Sound is only a nicety. */
      }
    },
    [audio],
  );
  // The paper-feed motor: a low, quiet hum for as long as it prints.
  const startHum = useCallback(() => {
    if (!soundOn.current) return () => {};
    try {
      const context = audio();
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = 118;
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 260;
      const volume = context.createGain();
      const now = context.currentTime;
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.linearRampToValueAtTime(0.03, now + 0.25);
      oscillator.connect(lowpass).connect(volume).connect(context.destination);
      oscillator.start();
      return () => {
        try {
          const end = context.currentTime;
          volume.gain.cancelScheduledValues(end);
          volume.gain.setValueAtTime(volume.gain.value, end);
          volume.gain.linearRampToValueAtTime(0.0001, end + 0.15);
          oscillator.stop(end + 0.2);
        } catch {
          /* already stopped */
        }
      };
    } catch {
      return () => {};
    }
  }, [audio]);

  // The final state: printed, torn off and hanging just below the slot.
  const snapFinal = useCallback(() => {
    const paper = paperRef.current;
    if (!paper) return;
    paper.getAnimations().forEach((animation) => animation.cancel());
    paper.style.clipPath = "none";
    paper.style.transform = FINAL;
    setWinHeight(paper.offsetHeight + ROOM);
  }, []);

  const run = useCallback(async () => {
    runId.current += 1;
    const token = runId.current;
    const alive = () => runId.current === token;
    if (reducedMotion()) {
      animating.current = false;
      setPhase("done");
      snapFinal();
      return;
    }
    animating.current = true;
    let stopHum = () => {};
    try {
      // Fonts change the paper's height, so measure only once they are in.
      await document.fonts?.ready;
      await logoRef.current?.decode?.().catch(() => {});
      if (!alive()) return;
      const paper = paperRef.current;
      const win = windowRef.current;
      if (!paper || !win) return;
      const height = paper.offsetHeight;
      win.style.height = `${height + ROOM}px`;
      setWinHeight(height + ROOM);
      // The receipt is fed out of the printer: it starts tucked inside, behind
      // the printer body, and slides down out of the slot in small stops, one
      // line at a time, so it can be seen travelling out. `shown` is how much of
      // the strip is below the slot (-10 = all of it still inside).
      const at = (shown) => `translateY(${shown - height}px)`;
      paper.getAnimations().forEach((animation) => animation.cancel());
      paper.style.clipPath = "none";
      paper.style.transform = at(-10);
      setPhase("printing");
      checkRef.current?.animate([{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], { duration: 450, easing: "ease-out", fill: "both" });
      stopHum = startHum();
      await wait(550);
      if (!alive()) return;

      // Where the paper stops: each line, last to first, comes out whole; then the rest.
      const stops = [...new Set([...paper.querySelectorAll(".ln")].map((line) => height - line.offsetTop))].sort((x, y) => x - y);
      stops.push(height);
      // The receipt is taller than a screen: keep the leading edge in view by
      // scrolling the page down as the paper comes out.
      const follow = (shown) => {
        const edge = win.getBoundingClientRect().top + shown;
        const limit = window.innerHeight - 140;
        if (edge > limit) window.scrollBy({ top: edge - limit, behavior: "auto" });
      };
      // Start with the printer at the top of the screen.
      const root = rootRef.current;
      if (root) window.scrollBy({ top: root.getBoundingClientRect().top - 100, behavior: "auto" });
      let previous = -10;
      for (const stop of stops) {
        if (stop <= previous) continue;
        const distance = stop - previous;
        const feed = paper.animate([{ transform: at(previous) }, { transform: at(stop) }], {
          duration: Math.max(60, distance * 4.5),
          easing: "cubic-bezier(.2,.8,.3,1)",
        });
        hiss(Math.min(150, 40 + distance * 2.2), { gain: 0.16 + Math.random() * 0.05 });
        try {
          await feed.finished;
        } catch {
          /* cancelled by a newer run */
        }
        if (!alive()) return;
        paper.style.transform = at(stop);
        feed.cancel();
        follow(stop);
        previous = stop;
        // The stop-start stutter is what makes it feel like a thermal head.
        await wait(35 + Math.random() * 30);
        if (!alive()) return;
      }

      setPhase("ready");
      await wait(260);
      if (!alive()) return;
      // The tear: the receipt is pulled down and away from the slot, so its
      // torn top edge shows.
      paper.style.clipPath = "none";
      stopHum();
      hiss(14, { low: 1200, high: 9000, gain: 0.32 }); // the click of the tear
      hiss(130, { low: 2600, high: 10000, gain: 0.26 });
      const tear = paper.animate(
        [
          { transform: "translateY(0px) rotate(0deg)" },
          { transform: `translateY(${LIFT - 4}px) rotate(1.2deg)`, offset: 0.45 },
          { transform: `translateY(${LIFT}px) rotate(0deg)` },
        ],
        { duration: 480, easing: "ease-out" },
      );
      try {
        await tear.finished;
      } catch {
        /* cancelled by a newer run */
      }
      if (!alive()) return;
      paper.style.transform = FINAL;
      tear.cancel();
      setPhase("done");
      // Bring the buttons (print, download, send another) into view.
      const bottom = rootRef.current?.getBoundingClientRect().bottom ?? 0;
      if (bottom > window.innerHeight - 16) window.scrollBy({ top: bottom - window.innerHeight + 24, behavior: "smooth" });
      beep(1760, 85, 0.1);
      beep(2349, 130, 0.1, 0.11);
    } finally {
      stopHum();
      if (alive()) animating.current = false;
    }
  }, [beep, hiss, snapFinal, startHum]);

  useImperativeHandle(ref, () => ({ replay: () => void run() }), [run]);

  // Final state first, then the animation.
  useLayoutEffect(() => {
    snapFinal();
  }, [snapFinal]);
  useEffect(() => {
    void run();
    return () => {
      runId.current += 1; // cancels a run in progress
    };
    // Started once per mount; replay() starts it again.
  }, [run]);

  // Re-fit on resize or when fonts arrive, unless it is printing.
  useEffect(() => {
    const refit = () => {
      if (!animating.current) snapFinal();
    };
    window.addEventListener("resize", refit);
    document.fonts?.ready.then(refit);
    return () => window.removeEventListener("resize", refit);
  }, [snapFinal]);

  // Print / download act on the finished receipt: cut a print in progress short.
  const finishNow = () => {
    runId.current += 1;
    animating.current = false;
    setPhase("done");
    snapFinal();
  };
  const printReceipt = () => {
    finishNow();
    window.setTimeout(() => window.print(), 60);
  };
  const [downloading, setDownloading] = useState(false);
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf({ tx, t, brand, logoUrl: logo });
    } catch {
      /* The PDF is a convenience; the receipt is on screen. */
    } finally {
      setDownloading(false);
    }
  };

  const printing = phase === "printing";
  const toggleSound = () => {
    soundOn.current = !soundOn.current;
    setSound(soundOn.current);
    try {
      window.localStorage.setItem(SOUND_KEY, soundOn.current ? "on" : "off");
    } catch {
      /* The choice just won't be remembered. */
    }
    if (soundOn.current) hiss(90); // to hear that it is on
  };

  return (
    <div ref={rootRef} className={`mx-auto w-full max-w-[440px] ${className ?? ""}`}>
      {/* 1. Status */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-surface p-4 shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path ref={checkRef} d="M5 12.5l4.5 4.5L19 7" strokeDasharray="24" strokeDashoffset="0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="font-bold text-slate-800">{t("send.done")}</p>
          <p className="text-xs text-slate-500">{phase === "done" ? t("pos.printed") : t("pos.printing")}</p>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={t(sound ? "pos.soundOff" : "pos.soundOn")}
          title={t(sound ? "pos.soundOff" : "pos.soundOn")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-ink"
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      {note && <p className="mt-2 px-1 text-xs text-slate-500">{note}</p>}

      {/* 2. Printer body, on top: the receipt comes out of its slot. */}
      <div className="pos-printer mt-5" aria-hidden="true">
        <span className="pos-brand-label">{brand} POS</span>
        <span className="pos-led" data-state={printing ? "printing" : "ready"}>
          <span className="pos-led-dot" />
          {printing ? t("pos.ledPrinting") : t("pos.ledReady")}
        </span>
        <div className="pos-slot" />
      </div>

      {/* 3. Paper window: its top edge is the printer slot. */}
      <div ref={windowRef} className="pos-window" style={winHeight ? { height: winHeight } : undefined}>
        <div ref={paperRef} className="pos-paper">
          {logo && (
            <div className="ln pos-logo">
              <img ref={logoRef} src={logo} alt="" onLoad={() => !animating.current && snapFinal()} />
            </div>
          )}
          <div className="ln pos-brand">{words.name.toUpperCase()}</div>
          {words.header.map((line) => (
            <div key={line} className="ln pos-small">
              {line}
            </div>
          ))}
          <div className="ln pos-small">{words.subtitle}</div>
          <Rule />
          <div className="ln pos-title">{words.heading}</div>
          <Rule />
          <Row label={t("receipt.amount")}>{money(tx.amount)}</Row>
          <Row label={t("receipt.fee")}>{money(tx.fee ?? 0)}</Row>
          <Rule />
          <Row label={t("receipt.from")} sub={accountLine(tx.from?.account, tx.wallet, t("pos.acc"))}>
            {tx.from?.name}
          </Row>
          <Row label={t("receipt.wallet")}>{tx.wallet}</Row>
          <Row label={t("receipt.to")} sub={accountLine(tx.to?.account, tx.wallet, t("pos.acc"))}>
            {tx.to?.name}
          </Row>
          <Row label={t("receipt.card")}>{tx.card}</Row>
          <Row label={t("receipt.reason")}>{tx.reason}</Row>
          <Rule />
          {validDate && <Row label={t("pos.date")}>{formatDate(when)}</Row>}
          {validDate && <Row label={t("receipt.time")}>{formatTime(when)}</Row>}
          <Row label={t("receipt.status")}>{tx.status}</Row>
          <Row label={t("receipt.reference")}>{tx.reference}</Row>
          <Rule />
          <Row label={t("pos.total")} className="pos-total">
            {money(tx.total ?? tx.amount)}
          </Row>
          <Row label={t("receipt.balance")}>{money(tx.balanceAfter)}</Row>
          <Rule />
          {tx.reference && <Barcode value={tx.reference} />}
          {tx.reference && <div className="ln pos-small" style={{ letterSpacing: "0.12em" }}>{tx.reference}</div>}
          {words.footer.map((line, index) => (
            <div key={line} className={index === 0 ? "ln pos-center" : "ln pos-small"} style={index === 0 ? { marginTop: 10 } : undefined}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Keep it: print, or download as a PDF */}
      <div className="mt-5 flex flex-wrap gap-3 [&>*]:flex-1">
        <button type="button" onClick={printReceipt} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5">
          <Printer size={16} />
          {t("pos.print")}
        </button>
        <button type="button" onClick={() => void downloadPdf()} disabled={downloading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-60">
          <Download size={16} />
          {t("pos.download")}
        </button>
      </div>

      {/* 5. Actions */}
      {children && <div className="mt-6 flex flex-wrap gap-3 [&>*]:flex-1">{children}</div>}
    </div>
  );
});

export default PosReceipt;
