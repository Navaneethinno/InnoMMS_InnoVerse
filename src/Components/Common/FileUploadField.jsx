import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, ExternalLink, FileText, Upload, X } from "lucide-react";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import Spinner from "./Spinner";
import FieldError from "./FieldError";
import CameraCapture from "./CameraCapture";

// Upload control for `file` fields. The file is stored on the server first
// (`upload(file)` resolves to { path, file_name, content_type }) and its
// `path` becomes the field value; an existing value is previewed through
// `download(path)`, which resolves to the file as a Blob. Refusals show the
// API's own message.
const MIME_BY_FORMAT = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const acceptFor = (formats) =>
  formats.flatMap((f) => [`.${f}`, MIME_BY_FORMAT[f]].filter(Boolean)).join(",");

const sizeLabel = (bytes) =>
  bytes >= 1024 * 1024 ? `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB` : `${Math.round(bytes / 1024)} KB`;

const baseName = (path) => String(path).split("/").pop();

export default function FileUploadField({ value, onChange, upload, download, formats = [], maxBytes, capture, disabled = false, className }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  // `liveness`: the photo must be taken live with the camera, never picked.
  const live = capture === "liveness";
  const [cameraOpen, setCameraOpen] = useState(false);
  const choose = () => (live ? setCameraOpen(true) : inputRef.current?.click());
  const [error, setError] = useState("");
  // What the chosen/stored file looks like: { url, isImage, name }.
  const [preview, setPreview] = useState(null);
  const localFor = useRef(null);
  // The parent passes fresh `download`/`t` functions on each render; read
  // them through refs so the preview is fetched once per path, not on every
  // keystroke elsewhere in the form.
  const downloadRef = useRef(download);
  downloadRef.current = download;
  const tRef = useRef(t);
  tRef.current = t;

  // Stored files are fetched for preview; a file just uploaded from this
  // browser is previewed from the local copy instead.
  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    if (localFor.current === value) return;
    if (String(value).startsWith("data:")) {
      setPreview({ url: value, isImage: value.startsWith("data:image/"), name: tRef.current("file.uploaded") });
      return;
    }
    if (!downloadRef.current) return;
    let url = null;
    let cancelled = false;
    downloadRef.current(value)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview({ url, isImage: blob.type.startsWith("image/"), name: baseName(value) });
      })
      .catch(() => {
        if (!cancelled) setPreview({ url: null, isImage: false, name: baseName(value) });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [value]);

  // The local copy's URL, released when replaced or on unmount.
  const localUrl = useRef(null);
  const setLocalUrl = (url) => {
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = url;
  };
  useEffect(() => () => setLocalUrl(null), []);

  const handleFile = async (file) => {
    if (!file) return;
    if (maxBytes && file.size > maxBytes) {
      setError(t("file.tooLarge", { size: sizeLabel(maxBytes) }));
      return;
    }
    setError("");
    setUploading(true);
    try {
      const stored = await upload(file);
      localFor.current = stored.path;
      setLocalUrl(URL.createObjectURL(file));
      setPreview({ url: localUrl.current, isImage: file.type.startsWith("image/"), name: stored.file_name || file.name });
      onChange(stored.path);
    } catch (uploadError) {
      setError(uploadError.message);
      notifications.error(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  const hint = [formats.map((f) => f.toUpperCase()).join(", "), maxBytes && t("file.upTo", { size: sizeLabel(maxBytes) })]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={capture === "camera" ? "image/*" : formats.length ? acceptFor(formats) : undefined}
        capture={capture === "camera" ? "environment" : undefined}
        disabled={disabled || uploading}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value && !uploading ? (
        <div className={cn("flex items-center gap-2 rounded-xl border border-ink/25 bg-surface p-2", className)}>
          {preview?.isImage && preview.url ? (
            <img src={preview.url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FileText size={16} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{preview?.name || t("file.uploaded")}</span>
          {preview?.url && (
            <a href={preview.url} target="_blank" rel="noreferrer" className="shrink-0 text-slate-500 hover:text-ink" aria-label={t("file.view")}>
              <ExternalLink size={14} />
            </a>
          )}
          {!disabled && (
            <>
              <button type="button" onClick={choose} className="shrink-0 whitespace-nowrap text-xs font-bold text-ink">
                {t("file.change")}
              </button>
              <button
                type="button"
                onClick={() => {
                  localFor.current = null;
                  onChange("");
                }}
                className="shrink-0 text-slate-400 hover:text-red-600"
                aria-label={t("file.remove")}
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={choose}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/40 bg-surface px-3 py-3 text-sm font-bold text-ink hover:bg-ink/5 disabled:opacity-50",
            className,
          )}
        >
          {uploading ? (
            <>
              <Spinner /> {t("file.uploading")}
            </>
          ) : (
            <>
              {live ? <Camera size={15} /> : <Upload size={15} />} {live ? t("file.takePhoto") : t("file.upload")}
            </>
          )}
        </button>
      )}
      {live && <CameraCapture open={cameraOpen} onOpenChange={setCameraOpen} onCapture={(file) => void handleFile(file)} />}
      {hint && !disabled && <p className="mt-1 text-[11px] font-normal text-slate-400">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
