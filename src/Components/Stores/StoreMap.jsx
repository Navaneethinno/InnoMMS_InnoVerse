import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Crosshair, ExternalLink } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// A point is usable when both are numbers inside the world's range.
export function validPoint(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    latitude === "" ||
    longitude === "" ||
    latitude == null ||
    longitude == null
  )
    return null;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  return { latitude: lat, longitude: lng };
}

// The store's location on an OpenStreetMap tile, with a link to the full map
// (the same view the admin portal shows the bank when it reviews the store).
export default function StoreMap({
  latitude,
  longitude,
  className,
  height = "h-56",
}) {
  const { t } = useTranslation();
  const point = validPoint(latitude, longitude);
  if (!point) return null;
  const d = 0.004;
  const bbox = [
    point.longitude - d,
    point.latitude - d,
    point.longitude + d,
    point.latitude + d,
  ].join(",");
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200",
        className,
      )}
    >
      <iframe
        title={t("stores.location", { defaultValue: "Store location" })}
        className={cn("w-full", height)}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.latitude},${point.longitude}`}
      />
      <a
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-ink hover:underline"
        href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=17/${point.latitude}/${point.longitude}`}
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink size={12} />
        {t("stores.openMap", { defaultValue: "Open map" })} ·{" "}
        {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
      </a>
    </div>
  );
}

// "Use my current location": fills the coordinates from the device (the
// browser asks the merchant first). Shows why when it can't.
export function UseMyLocation({ onLocated }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const locate = () => {
    if (!navigator.geolocation) {
      setProblem(
        t("stores.noGeolocation", {
          defaultValue: "This browser can't share your location.",
        }),
      );
      return;
    }
    setBusy(true);
    setProblem("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false);
        onLocated({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
      },
      (error) => {
        setBusy(false);
        setProblem(
          error.code === error.PERMISSION_DENIED
            ? t("stores.locationDenied", {
                defaultValue:
                  "Location access was refused. Allow it in the browser, or type the coordinates.",
              })
            : t("stores.locationFailed", {
                defaultValue:
                  "Couldn't get your location. Try again, or type the coordinates.",
              }),
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-60"
      >
        <Crosshair size={14} className={busy ? "animate-pulse" : undefined} />
        {busy
          ? t("stores.locating", { defaultValue: "Finding your location…" })
          : t("stores.useLocation", {
              defaultValue: "Use my current location",
            })}
      </button>
      {problem && <p className="mt-1.5 text-xs text-red-600">{problem}</p>}
    </div>
  );
}
