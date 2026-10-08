import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, storeTheme, systemTheme } from "@/Utils/Lib/theme";

// Current theme plus a toggle. Every component using it stays in sync
// through the `dark` class on <html>.
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // Follow the system setting until the customer picks one themselves.
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!readStoredTheme()) applyTheme(systemTheme());
    };
    media?.addEventListener?.("change", onSystemChange);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", onSystemChange);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    storeTheme(next);
    applyTheme(next);
  };

  return { theme, toggleTheme };
}
