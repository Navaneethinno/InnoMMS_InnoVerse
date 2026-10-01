import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { fetchMerchantBranding, fetchMerchantBrandingFile } from "@/Services/Onboarding/merchantBranding.api";
import { deriveBrandThemeVars } from "@/Utils/Lib/colorTheme";
import { asBrand, brandColors, normalizeBranding } from "@/Utils/Lib/branding";

const STORAGE_KEY = "innoverse-brand-theme";
const PORTAL_STORAGE_KEY = "innomms-portal-brand-theme";
// Small brand images as data URLs, by stored path, so a reload shows them
// straight away.
const ASSETS_KEY = "innomms-brand-assets";
const MAX_CACHED_IMAGE = 400 * 1024;
const DEFAULT_TITLE = document.title;
const BrandThemeContext = createContext(null);

const readJson = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeJson = (key, value) => {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {
    // Caching is only a nicety.
  }
};

// Clears every custom property this provider may have set, letting
// theme.css's :root/.dark fallback values take back over untouched.
const BRAND_TOKENS = [
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

function applyBrandVars(colors, mode) {
  const root = document.documentElement;
  BRAND_TOKENS.forEach((token) => root.style.removeProperty(token));
  if (!colors) return;
  Object.entries(deriveBrandThemeVars(colors, mode)).forEach(([token, value]) => root.style.setProperty(token, value));
}

function setFavicon(href) {
  let link = document.querySelector("link[rel~='icon']");
  if (!href) {
    if (link?.dataset.brand) link.remove();
    return;
  }
  if (!link) {
    link = Object.assign(document.createElement("link"), { rel: "icon" });
    document.head.appendChild(link);
  }
  link.dataset.brand = "1";
  link.href = href;
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const IMAGE_FIELDS = ["logo", "logoDark", "favicon", "loginBackground"];

// Applies the institution's branding: colours as inline CSS custom
// properties on <html> (dark-mode colours in dark mode), plus its name,
// logo, favicon and login background. Inline properties beat theme.css's
// :root/.dark rules, so every component reading var(--primary) etc. follows
// the brand with no changes.
//
// Before sign-in (and after sign-out) the portal wears the institution's
// public merchant-portal branding (POST /merchant/web/branding), cached so a
// reload paints straight away. The login reply's branding takes precedence
// while signed in. Images come from the public branding file endpoint, so
// they show on the login page too.
export function BrandThemeProvider({ children }) {
  const { mode } = useColorMode();
  const [userBrand, setUserBrand] = useState(() => asBrand(readJson(STORAGE_KEY)));
  const [portalBrand, setPortalBrand] = useState(() => asBrand(readJson(PORTAL_STORAGE_KEY)));
  const [images, setImages] = useState(() => readJson(ASSETS_KEY) ?? {});

  useEffect(() => {
    let cancelled = false;
    fetchMerchantBranding()
      .then((raw) => {
        if (cancelled) return;
        const next = normalizeBranding(raw);
        setPortalBrand(next);
        writeJson(PORTAL_STORAGE_KEY, next);
      })
      // No branding reachable: theme.css's own colours stay.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const brand = userBrand ?? portalBrand;

  useEffect(() => {
    applyBrandVars(brandColors(brand, mode), mode);
  }, [brand, mode]);

  // Images by stored path; each path is fetched once.
  useEffect(() => {
    const wanted = new Set(IMAGE_FIELDS.map((field) => brand?.[field]).filter(Boolean));
    const missing = [...wanted].filter((path) => !images[path]);
    if (!missing.length) return undefined;
    let cancelled = false;
    void Promise.all(
      missing.map(async (path) => {
        try {
          const blob = await fetchMerchantBrandingFile(path);
          const small = blob.size <= MAX_CACHED_IMAGE;
          return { path, url: small ? await blobToDataUrl(blob) : URL.createObjectURL(blob), small };
        } catch {
          return null;
        }
      }),
    ).then((loaded) => {
      const found = loaded.filter(Boolean);
      if (cancelled || !found.length) return;
      setImages((prev) => ({ ...prev, ...Object.fromEntries(found.map((f) => [f.path, f.url])) }));
      const cached = readJson(ASSETS_KEY) ?? {};
      found.filter((f) => f.small).forEach((f) => (cached[f.path] = f.url));
      writeJson(ASSETS_KEY, Object.fromEntries(Object.entries(cached).filter(([path]) => wanted.has(path))));
    });
    return () => {
      cancelled = true;
    };
  }, [brand, images]);

  const imageUrl = (path) => (path ? (images[path] ?? null) : null);
  const logoUrl = imageUrl(mode === "dark" && brand?.logoDark ? brand.logoDark : brand?.logo);
  const faviconUrl = imageUrl(brand?.favicon);
  const loginBackgroundUrl = imageUrl(brand?.loginBackground);

  useEffect(() => {
    document.title = brand?.displayName ?? DEFAULT_TITLE;
    setFavicon(faviconUrl);
  }, [brand?.displayName, faviconUrl]);

  const setBrandTheme = useCallback((next) => {
    const value = asBrand(next);
    setUserBrand(value);
    writeJson(STORAGE_KEY, value);
  }, []);

  const clearBrandTheme = useCallback(() => setBrandTheme(null), [setBrandTheme]);

  const value = useMemo(
    () => ({
      colors: brandColors(brand, mode),
      displayName: brand?.displayName ?? null,
      logoUrl,
      loginBackgroundUrl,
      setBrandTheme,
      clearBrandTheme,
    }),
    [brand, mode, logoUrl, loginBackgroundUrl, setBrandTheme, clearBrandTheme],
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const ctx = useContext(BrandThemeContext);
  if (!ctx) throw new Error("useBrandTheme must be used within a BrandThemeProvider");
  return ctx;
}
