import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/Utils/Lib/utils";

// A single line that shrinks to fit its box instead of being cut off: a
// balance in the trillions stays whole in a narrow card. Starts at `max`
// pixels and steps down to `min` until it fits; the full text is the
// tooltip. Re-fits when the box (or the text) changes size.
export default function FitText({ children, max = 30, min = 12, className }) {
  const ref = useRef(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const fit = () => {
      element.style.fontSize = `${max}px`;
      let next = max;
      while (next > min && element.scrollWidth > element.clientWidth) {
        next -= 1;
        element.style.fontSize = `${next}px`;
      }
      setSize(next);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element.parentElement ?? element);
    return () => observer.disconnect();
  }, [children, max, min]);

  return (
    <p ref={ref} title={String(children)} style={{ fontSize: size }} className={cn("overflow-hidden whitespace-nowrap", className)}>
      {children}
    </p>
  );
}
