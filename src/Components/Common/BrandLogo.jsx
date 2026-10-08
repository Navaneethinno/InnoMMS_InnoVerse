import { cn } from "@/Utils/Lib/utils";

// The institution's logo in a tile: a thin border, rounded corners and a little
// padding, so any logo (square, wide, with or without its own background)
// looks placed rather than pasted. The image is scaled to fit inside the tile
// and never cropped or stretched. `size` is the tile's height in px; a wide
// logo may make the tile up to about twice as wide. `tone="dark"` is for use
// on a dark background (the border becomes light).
export default function BrandLogo({ src, size = 40, tone = "light", className }) {
  if (!src) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-1 shadow-sm",
        tone === "dark" ? "border-white/40" : "border-slate-300",
        className,
      )}
      style={{ height: size, minWidth: size, maxWidth: Math.round(size * 2.2) }}
    >
      <img src={src} alt="" className="h-full w-auto max-w-full rounded-md object-contain" />
    </span>
  );
}
