import { useCallback, useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Check, Minus, RotateCcw, ScanFace, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFaceDetector } from "@/Hooks/Camera/useFaceDetector";
import { OVAL, PREVIEW, evaluateFrame } from "@/Utils/Lib/faceChecks";
import { cn } from "@/Utils/Lib/utils";

// "Take a photo" for a `liveness` FILE field: the photo can only come from
// the live camera, never from a gallery. The face is checked on every third
// frame (MediaPipe Face Detector); when every check has passed for a second
// a 3-second countdown starts, and the photo is taken at 0. Any check
// failing during the countdown cancels it. "Capture now" takes it at once,
// and is the only way when the detector could not be loaded.
//
// The preview is mirrored for display only; the saved frame is not.
const HOLD_MS = 1000;
const COUNTDOWN_MS = 3000;
const GREEN = "#4ADE80";
const YELLOW = "#FFC800";
const CHIPS = [
  ["found", "cam.chip.found"],
  ["distance", "cam.chip.distance"],
  ["centred", "cam.chip.centred"],
  ["lighting", "cam.chip.lighting"],
  ["steady", "cam.chip.steady"],
];
const NO_CHECKS = { found: false, distance: false, centred: false, lighting: false, steady: false };

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function CameraCapture({ open, onOpenChange, onCapture }) {
  const { t } = useTranslation();
  const maskId = useId();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // The <video> is replaced by the photo in the review step, so it is a new
  // element after "Retake": the live stream is hooked up again every time one
  // mounts (it was only hooked up once, leaving a black picture).
  const setVideo = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) node.srcObject = streamRef.current;
  }, []);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState("guiding"); // guiding | countdown | review
  const [verdict, setVerdict] = useState({ checks: NO_CHECKS, hint: "position" });
  const [seconds, setSeconds] = useState(3);
  const [runId, setRunId] = useState(0); // restarts the ring animation
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState(null); // { blob, url }
  const detector = useFaceDetector(open);

  // Camera: opened with the dialog, every track stopped when it closes.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setCameraError("");
    setCameraReady(false);
    setPhase("guiding");
    setShot(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("file.cameraError"));
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const attach = () => {
          if (videoRef.current) videoRef.current.srcObject = stream;
          else if (!cancelled) window.requestAnimationFrame(attach);
        };
        attach();
      })
      .catch(() => !cancelled && setCameraError(t("file.cameraError")));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, t]);

  // The frame as it is (not mirrored) as a JPEG.
  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (!reducedMotion()) {
          setFlash(true);
          window.setTimeout(() => setFlash(false), 150);
        }
        setShot((previous) => {
          if (previous) URL.revokeObjectURL(previous.url);
          return { blob, url: URL.createObjectURL(blob) };
        });
        setPhase("review");
      },
      "image/jpeg",
      0.9,
    );
  }, []);
  useEffect(() => () => shot && URL.revokeObjectURL(shot.url), [shot]);

  // The checking loop: every third frame while the camera is live and the
  // detector is ready.
  useEffect(() => {
    if (!open || !cameraReady || detector.status !== "ready" || phase === "review") return undefined;
    let raf = 0;
    let frame = 0;
    let passSince = null;
    let countdownStart = null;
    let current = phase;
    const history = [];
    let last = "";

    const tick = (now) => {
      raf = window.requestAnimationFrame(tick);
      frame += 1;
      const video = videoRef.current;
      if (frame % 3 !== 0 || !video?.videoWidth || video.readyState < 2) return;
      const result = evaluateFrame({ faces: detector.detect(video, now), video, history });
      const key = JSON.stringify([result.checks, result.hint]);
      if (key !== last) {
        last = key;
        setVerdict({ checks: result.checks, hint: result.hint });
      }
      if (current === "guiding") {
        if (!result.ok) {
          passSince = null;
          return;
        }
        passSince ??= now;
        if (now - passSince >= HOLD_MS) {
          current = "countdown";
          countdownStart = now;
          setSeconds(3);
          setRunId((id) => id + 1);
          setPhase("countdown");
        }
      } else if (current === "countdown") {
        if (!result.ok) {
          // Cancel: back to guiding, with the hint for what failed.
          current = "guiding";
          passSince = null;
          countdownStart = null;
          setPhase("guiding");
          return;
        }
        const left = COUNTDOWN_MS - (now - countdownStart);
        setSeconds(Math.max(1, Math.ceil(left / 1000)));
        if (left <= 0) {
          window.cancelAnimationFrame(raf);
          takePhoto();
        }
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // `detector.detect` reads a ref; the loop restarts only for these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cameraReady, detector.status, phase === "review", takePhoto]);

  const counting = phase === "countdown";
  const allGood = Object.values(verdict.checks).every(Boolean);
  const retake = () => {
    setShot(null);
    setVerdict({ checks: NO_CHECKS, hint: "position" });
    // The new picture reports itself ready once its first frame is there.
    setCameraReady(false);
    setPhase("guiding");
  };
  const use = () => {
    if (!shot) return;
    onCapture(new File([shot.blob], "selfie.jpg", { type: "image/jpeg" }));
    onOpenChange(false);
  };

  const status = (() => {
    if (cameraError) return { tone: "bad", title: cameraError, sub: "" };
    if (detector.status === "failed") return { tone: "idle", title: t("cam.noAuto"), sub: t("cam.noAutoSub") };
    if (!cameraReady || detector.status === "loading") return { tone: "idle", title: t("cam.starting"), sub: "" };
    if (counting) return { tone: "good", title: t("cam.hint.perfect"), sub: t("cam.capturingIn", { count: seconds }) };
    if (allGood) return { tone: "good", title: t("cam.hint.perfect"), sub: t("cam.holdOn") };
    return { tone: "idle", title: t(`cam.hint.${verdict.hint}`), sub: "" };
  })();

  const ring = reducedMotion() ? "none" : "cam-ring 3s linear forwards";
  const ovalPath = `M ${OVAL.cx} ${OVAL.cy - OVAL.ry} A ${OVAL.rx} ${OVAL.ry} 0 1 1 ${OVAL.cx} ${OVAL.cy + OVAL.ry} A ${OVAL.rx} ${OVAL.ry} 0 1 1 ${OVAL.cx} ${OVAL.cy - OVAL.ry}`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[96dvh] w-[calc(100%-1.5rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] bg-[#1C1C1F] p-5 font-sans text-white shadow-2xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-2xl font-bold leading-tight" style={{ color: YELLOW }}>
                {phase === "review" ? t("cam.reviewTitle") : t("file.takePhoto")}
              </Dialog.Title>
              <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">{phase === "review" ? t("cam.reviewSub") : t("cam.subtitle")}</p>
            </div>
            <Dialog.Close
              aria-label={t("common.close")}
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#A1A1AA] transition hover:bg-white/10 hover:text-white"
            >
              <X size={22} />
            </Dialog.Close>
          </div>

          {/* Preview 496 x 372. */}
          <div className="relative mt-6 w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: `${PREVIEW.w} / ${PREVIEW.h}` }}>
            {phase === "review" && shot ? (
              <img src={shot.url} alt="" className="h-full w-full object-cover" />
            ) : cameraError ? (
              <p className="flex h-full items-center justify-center p-6 text-center text-sm text-red-300">{cameraError}</p>
            ) : (
              <video
                ref={setVideo}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setCameraReady(true)}
                className="h-full w-full -scale-x-100 object-cover"
              />
            )}

            {phase !== "review" && !cameraError && (
              <>
                <svg viewBox={`0 0 ${PREVIEW.w} ${PREVIEW.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  <defs>
                    <mask id={maskId}>
                      <rect width={PREVIEW.w} height={PREVIEW.h} fill="white" />
                      <ellipse cx={OVAL.cx} cy={OVAL.cy} rx={OVAL.rx} ry={OVAL.ry} fill="black" />
                    </mask>
                  </defs>
                  <rect width={PREVIEW.w} height={PREVIEW.h} fill="rgba(0,0,0,0.55)" mask={`url(#${maskId})`} />
                  <ellipse
                    cx={OVAL.cx}
                    cy={OVAL.cy}
                    rx={OVAL.rx}
                    ry={OVAL.ry}
                    fill="none"
                    stroke={counting ? GREEN : "rgba(255,255,255,0.85)"}
                    strokeWidth="3"
                    strokeDasharray={counting ? undefined : "10 8"}
                  />
                  {counting && (
                    <path
                      key={runId}
                      d={ovalPath}
                      fill="none"
                      stroke={GREEN}
                      strokeWidth="5"
                      strokeLinecap="round"
                      pathLength="1"
                      strokeDasharray="1"
                      style={{ strokeDashoffset: reducedMotion() ? 0 : 1, animation: ring }}
                    />
                  )}
                </svg>
                <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {t("cam.live")}
                </span>
                {counting && (
                  <span
                    className="absolute left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-3xl font-extrabold text-[#0b1220]"
                    style={{ top: `${((OVAL.cy + OVAL.ry) / PREVIEW.h) * 100}%`, background: GREEN }}
                    aria-hidden="true"
                  >
                    {seconds}
                  </span>
                )}
              </>
            )}
            {flash && <span className="pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />}
          </div>

          {phase === "review" ? (
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#2E2E33] pt-5">
              <button type="button" onClick={retake} className="inline-flex items-center gap-2 rounded-xl border border-[#2E2E33] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5">
                <RotateCcw size={15} />
                {t("cam.retake")}
              </button>
              <button type="button" onClick={use} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-[#1C1C1F] transition hover:brightness-95" style={{ background: YELLOW }}>
                <Check size={16} />
                {t("cam.usePhoto")}
              </button>
            </div>
          ) : (
            <>
              {/* What to do next; read out as it changes. */}
              <div aria-live="polite" className="mt-5 flex items-center gap-3">
                <span
                  className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", status.tone === "good" ? "text-[#0b1220]" : "bg-white/10 text-[#A1A1AA]")}
                  style={status.tone === "good" ? { background: GREEN } : undefined}
                >
                  {status.tone === "good" ? <Check size={20} strokeWidth={3} /> : <ScanFace size={20} />}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold", status.tone === "bad" ? "text-red-300" : "text-white")}>{status.title}</p>
                  {status.sub && <p className="text-xs text-[#A1A1AA]">{status.sub}</p>}
                </div>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {CHIPS.map(([key, label]) => {
                  const pass = verdict.checks[key];
                  return (
                    <li
                      key={key}
                      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", pass ? "text-[#4ADE80]" : "text-[#A1A1AA]")}
                      style={{ background: pass ? "rgba(74,222,128,0.14)" : "rgba(255,255,255,0.06)" }}
                    >
                      {pass ? <Check size={13} strokeWidth={3} /> : <Minus size={13} />}
                      {t(label)}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#2E2E33] pt-5">
                <p className="text-xs text-[#A1A1AA]">{t("cam.cancelNote")}</p>
                <button
                  type="button"
                  onClick={takePhoto}
                  disabled={!cameraReady}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#2E2E33] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-40"
                >
                  <Camera size={15} />
                  {t("cam.captureNow")}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
