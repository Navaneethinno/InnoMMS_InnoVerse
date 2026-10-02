import { useEffect, useRef, useState } from "react";
import { Camera, Eye, EyeOff, Upload, X } from "lucide-react";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications } from "@/Utils/Lib/notifications";

export const fieldControl =
  "w-full rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60";

function FileField({ value, onChange, disabled, field, file }) {
  const [uploading, setUploading] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);
  const upload = async (picked, side) => {
    if (!picked) return;
    if (field.options?.max_size_kb && picked.size > field.options.max_size_kb * 1024) {
      notifications.error(`File must be at most ${field.options.max_size_kb} KB.`);
      return;
    }
    setUploading(true);
    try {
      const stored = await file.upload(picked, side);
      const path = stored?.path ?? stored;
      onChange(side ? { ...(value ?? {}), [side]: path } : path);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setUploading(false);
    }
  };
  const view = async (path) => {
    try {
      const url = URL.createObjectURL(await file.download(path));
      window.open(url, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const liveness = field.options?.capture === "liveness";
  const sides = field.options?.sides === "front_back" ? ["front", "back"] : [null];
  const openCamera = async () => {
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStream(nextStream);
      window.setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = nextStream; }, 0);
    } catch {
      notifications.error("Camera access is required for the liveness photo.");
    }
  };
  const closeCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };
  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    closeCamera();
    if (blob) await upload(new File([blob], `${field.key}-liveness.jpg`, { type: "image/jpeg" }), null);
  };
  return (
    <div className="space-y-2">
      {liveness && stream && <div className="space-y-2 rounded-2xl border border-border p-3"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black object-cover" /><div className="flex gap-2"><button type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground" onClick={() => void capture()}><Camera size={14} />Capture</button><button type="button" className="rounded-xl border border-border px-3 py-2 text-sm" onClick={closeCamera}>Cancel</button></div></div>}
      {sides.map((side) => {
        const path = side ? value?.[side] : value;
        const id = `${field.key}-${side ?? "file"}`;
        return (
          <div key={side ?? "file"} className="flex flex-wrap items-center gap-2">
            {!liveness && <input
              id={id}
              type="file"
              className="hidden"
              disabled={disabled || uploading}
              accept={liveness ? "image/*" : (field.options?.allowed_types ?? []).join(",")}
              capture={liveness ? "user" : field.options?.capture === "camera" ? "environment" : undefined}
              onChange={(event) => void upload(event.target.files?.[0], side)}
            />}
            {liveness ? <button type="button" disabled={disabled || uploading || Boolean(stream)} onClick={() => void openCamera()} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-sm font-semibold text-primary"><Camera size={14} />{uploading ? "Uploading…" : "Open camera"}</button> : <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-sm font-semibold text-primary">
              {uploading ? <Spinner size={13} /> : liveness ? <Camera size={14} /> : <Upload size={14} />}
              {liveness ? "Take live photo" : side ? `Upload ${side}` : "Upload file"}
            </label>}
            {path && (
              <>
                <span className="max-w-52 truncate text-xs">{String(path).split("/").pop()}</span>
                <button type="button" onClick={() => void view(path)} className="text-primary" aria-label="View file"><Eye size={14} /></button>
                <button type="button" disabled={disabled} onClick={() => onChange(side ? { ...value, [side]: "" } : "")} aria-label="Remove file"><X size={14} /></button>
              </>
            )}
            {liveness && <p className="basis-full text-xs text-muted-foreground">A live camera photo is required. Gallery and file selection are disabled.</p>}
          </div>
        );
      })}
    </div>
  );
}

function PinField({ field, value, onChange, disabled }) {
  const saved = value === "********";
  const [visible, setVisible] = useState(false);
  const current = value && typeof value === "object" ? value : { pin: "", confirm: "" };
  const options = field.options ?? {};
  const update = (key, next) => onChange({ ...current, [key]: next.replace(/\D/g, "").slice(0, options.max_length ?? 6) });
  if (saved) {
    return <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm"><span>PIN set</span><button type="button" disabled={disabled} onClick={() => onChange({ pin: "", confirm: "" })} className="font-semibold text-primary">Change PIN</button></div>;
  }
  return (
    <div className="space-y-3">
      <div className="relative">
        <input type={visible ? "text" : "password"} inputMode="numeric" autoComplete="new-password" className={`${fieldControl} pr-10`} disabled={disabled} value={current.pin} minLength={options.min_length ?? 4} maxLength={options.max_length ?? 6} onChange={(e) => update("pin", e.target.value)} />
        <button type="button" onClick={() => setVisible((shown) => !shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={visible ? "Hide PIN" : "Show PIN"}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button>
      </div>
      {options.confirm !== false && <input type={visible ? "text" : "password"} inputMode="numeric" autoComplete="new-password" className={fieldControl} disabled={disabled} value={current.confirm} placeholder="Confirm PIN" maxLength={options.max_length ?? 6} onChange={(e) => update("confirm", e.target.value)} />}
      <p className="text-[11px] text-muted-foreground">{options.min_length === options.max_length ? `${options.min_length} digits` : `${options.min_length ?? 4}–${options.max_length ?? 6} digits`}{options.block_simple !== false ? "; avoid repeated or consecutive digits" : ""}.</p>
    </div>
  );
}

export function OnboardingField({ field, value, onChange, error, options, file }) {
  const disabled = Boolean(field.read_only);
  const type = field.field_type ?? field.type;
  const list = options ?? field.choices ?? [];
  let control;
  if (type === "DROPDOWN" || type === "RADIO") {
    control = type === "DROPDOWN" ? (
      <FilterSelect disabled={disabled} value={value ?? ""} onChange={onChange} options={[{ value: "", label: `— ${field.label} —` }, ...list.map((item) => ({ value: String(item.value), label: item.label }))]} />
    ) : <div className="space-y-2">{list.map((item) => <label key={item.value} className="flex gap-2 text-sm"><input type="radio" disabled={disabled} checked={String(value) === String(item.value)} onChange={() => onChange(item.value)} />{item.label}</label>)}</div>;
  } else if (type === "CHECKBOXES") {
    control = <div className="space-y-2">{list.map((item) => <CheckboxPill key={item.value} label={item.label} disabled={disabled} checked={(value ?? []).map(String).includes(String(item.value))} onChange={(checked) => onChange(checked ? [...(value ?? []), item.value] : (value ?? []).filter((entry) => String(entry) !== String(item.value)))} />)}</div>;
  } else if (type === "YES_NO") {
    control = <CheckboxPill label={value ? (field.options?.yes_label ?? "Yes") : (field.options?.no_label ?? "No")} disabled={disabled} checked={Boolean(value)} onChange={onChange} />;
  } else if (type === "FILE") {
    control = <FileField value={value} onChange={onChange} disabled={disabled} field={field} file={file} />;
  } else if (type === "PIN") {
    control = <PinField field={field} value={value} onChange={onChange} disabled={disabled} />;
  } else {
    const inputType = type === "DATE" ? "date" : type === "EMAIL" ? "email" : type === "PHONE" ? "tel" : type === "NUMBER" ? "number" : "text";
    control = <input type={inputType} className={fieldControl} disabled={disabled} value={value ?? ""} placeholder={field.hint ?? ""} min={field.options?.min} max={field.options?.max} minLength={field.options?.min_length} maxLength={field.options?.max_length} onChange={(event) => onChange(type === "NUMBER" && event.target.value !== "" ? Number(event.target.value) : event.target.value)} />;
  }
  return <div data-field={field.key}><label className="mb-1.5 block text-sm font-medium text-foreground">{field.label}{field.required && <span className="text-red-500"> *</span>}</label>{control}{field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}{error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}</div>;
}
