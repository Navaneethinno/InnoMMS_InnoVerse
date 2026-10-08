import { useRef } from "react";
import { cn } from "@/Utils/Lib/utils";

// One box per digit. Typing moves to the next box, Backspace to the
// previous, arrow keys move between boxes, and pasting a code fills every
// box at once. Reports the whole code as a string through `onChange`.
export default function OtpInput({ length, value, onChange, disabled = false, invalid = false, autoFocus = true, label }) {
  const boxes = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusBox = (index) => boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const setFrom = (index, text) => {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < length; i += 1) next[index + i] = clean[i];
    onChange(next.join("").slice(0, length));
    focusBox(index + clean.length);
  };

  const handleKey = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        focusBox(index - 1);
      }
      onChange(next.join(""));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  return (
    <div role="group" aria-label={label} className="flex w-full justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => (boxes.current[index] = node)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          name={`otp-${index + 1}`}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          maxLength={1}
          aria-label={`${label} ${index + 1}`}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          value={digit}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setFrom(index, event.target.value.slice(-1))}
          onPaste={(event) => {
            event.preventDefault();
            setFrom(index, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => handleKey(index, event)}
          className={cn(
            "h-14 min-w-0 max-w-12 flex-1 rounded-xl border bg-surface text-center text-xl font-semibold text-slate-900 outline-none transition sm:h-16 sm:max-w-14 sm:text-2xl",
            "focus:border-ink focus:shadow-[0_0_0_4px_rgb(var(--color-primary)/0.14)] dark:focus:shadow-[0_0_0_4px_rgb(var(--color-secondary)/0.18)]",
            digit ? "border-ink/40 bg-ink/[0.06]" : "border-slate-200",
            invalid && "border-red-400 focus:border-red-400",
            disabled && "opacity-70",
          )}
        />
      ))}
    </div>
  );
}
