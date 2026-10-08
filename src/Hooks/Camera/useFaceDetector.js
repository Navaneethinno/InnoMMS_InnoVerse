import { useEffect, useRef, useState } from "react";

// MediaPipe's Face Detector, loaded only when the camera dialog opens. The
// model is served with the portal (public/models); the small WASM runtime
// comes from the package's CDN copy, pinned to the installed version.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = `${import.meta.env.BASE_URL}models/blaze_face_short_range.tflite`;

// `status`: "loading" | "ready" | "failed" (no model or no network: the
// dialog then falls back to the manual "Capture now" button).
export function useFaceDetector(enabled) {
  const [status, setStatus] = useState("loading");
  const detector = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const create = (delegate) =>
          FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.6,
          });
        const instance = await create("GPU").catch(() => create("CPU"));
        if (cancelled) {
          instance.close();
          return;
        }
        detector.current = instance;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
      detector.current?.close();
      detector.current = null;
    };
  }, [enabled]);

  // The faces in the video's current frame: [{ box (video px), keypoints }].
  const detect = (video, timestamp) => {
    if (!detector.current) return [];
    const { detections } = detector.current.detectForVideo(video, timestamp);
    return detections.map((d) => ({
      box: { x: d.boundingBox.originX, y: d.boundingBox.originY, w: d.boundingBox.width, h: d.boundingBox.height },
      keypoints: d.keypoints,
    }));
  };
  return { status, detect };
}
