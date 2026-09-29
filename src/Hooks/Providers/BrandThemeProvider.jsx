import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { fetchMerchantBranding } from "@/Services/Onboarding/merchantBranding.api";
import { deriveBrandThemeVars } from "@/Utils/Lib/colorTheme";

const STORAGE_KEY = "innoverse-brand-theme";
const PORTAL_STORAGE_KEY = "innomms-portal-brand-theme";
const BrandThemeContext = createContext(null);

function readStoredColors(key = STORAGE_KEY) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Clears every custom property this provider may have set, letting
// theme.css's :root/.dark fallback values take back over untouched — this
// is the "no tenant colors yet / logged out" state, not a second palette.
function clearBrandVars() {
  const root = document.documentElement;
  const tokens = [
    "--primary",
    "--primary-hover",
    "--primary-light",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--ring",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--accent-foreground",
    "--chart-1",
    "--chart-4",
    "--gradient-start",
    "--gradient-end",
    "--glass-gradient",
    "--mesh-1",
    "--mesh-2",
    "--bg-tint-primary",
    "--bg-tint-secondary",
    "--bg-tint-accent",
  ];
  tokens.forEach((token) => root.style.removeProperty(token));
}

function applyBrandVars(colors, mode) {
  const root = document.documentElement;
  clearBrandVars();
  if (!colors) return;
  const vars = deriveBrandThemeVars(colors, mode);
  Object.entries(vars).forEach(([token, value]) => root.style.setProperty(token, value));
}

// Applies a tenant's primary/secondary brand colors (from the login
// response) as inline CSS custom properties on <html>, which take
// precedence over theme.css's :root/.dark rules without touching those
// rules at all — so every existing component that already reads
// var(--primary) etc. themes correctly with zero changes, and any tenant
// with no colors configured (or before login resolves) transparently falls
// back to the current fixed light/dark palette in theme.css.
//
// Before sign-in (and after sign-out) the portal wears the institution's
// merchant-portal branding (POST /merchant/web/branding), loaded once at
// start and cached so a reload paints in those colours straight away. The
// signed-in user's colours (login reply) take precedence while signed in.
export function BrandThemeProvider({ children }) {
  const { mode } = useColorMode();
  const [colors, setColors] = useState(readStoredColors);
  const [portalColors, setPortalColors] = useState(() => readStoredColors(PORTAL_STORAGE_KEY));

  useEffect(() => {
    let cancelled = false;
    fetchMerchantBranding()
      .then((branding) => {
        if (cancelled) return;
        const next = branding ? { primary: branding.primary_color || null, secondary: branding.secondary_color || null } : null;
        setPortalColors(next?.primary || next?.secondary ? next : null);
        try {
          if (next?.primary || next?.secondary) window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(next));
          else window.localStorage.removeItem(PORTAL_STORAGE_KEY);
        } catch {
          // Caching is only a nicety.
        }
      })
      // No branding reachable: theme.css's own colours stay.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const active = colors ?? portalColors;
  useEffect(() => {
    applyBrandVars(active, mode);
  }, [active, mode]);

  const setBrandTheme = useCallback((nextColors) => {
    setColors(nextColors ?? null);
    try {
      if (nextColors) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextColors));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage failures should not prevent the in-memory theme from updating.
    }
  }, []);

  const clearBrandTheme = useCallback(() => setBrandTheme(null), [setBrandTheme]);

  const value = useMemo(
    () => ({ colors, setBrandTheme, clearBrandTheme }),
    [colors, setBrandTheme, clearBrandTheme],
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const ctx = useContext(BrandThemeContext);
  if (!ctx) throw new Error("useBrandTheme must be used within a BrandThemeProvider");
  return ctx;
}
