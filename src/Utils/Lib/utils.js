import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...values) => twMerge(clsx(values));

export const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
export const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
// Answers can arrive as a number or a string.
export const sameValue = (a, b) => String(a) === String(b);
