import { STORAGE_KEYS } from "@/Utils/Constant";
import i18n from "@/Utils/I18n/i18n";

// Applies the bank's theme to the portal. Every `forest` / `lime` Tailwind
// colour reads the CSS variables --color-primary / --color-secondary (RGB
// channels, see styles.css), so setting them restyles the whole UI.
//
// The portal's design uses one dark colour (backgrounds, buttons, text on
// light) and one light accent (highlights on dark). The API's two colours
// are assigned by lightness, not by name, so text always stays readable
// whichever way round the bank entered them.

function toChannels(hex) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
  if (!match) return null;
  let value = match[1];
  if (value.length === 3) value = [...value].map((c) => c + c).join("");
  const n = parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Relative luminance (WCAG).
function luminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// The API sends one colour pair per theme (`*_light`, `*_dark`); a theme
// without its own pair uses the light one. Older responses had a single
// primary_color / secondary_color pair, which still works.
const colourPair = (branding, dark) => {
  const pick = (name) => (dark ? branding?.[`${name}_color_dark`] : null) || branding?.[`${name}_color_light`] || branding?.[`${name}_color`];
  return [toChannels(pick("primary")), toChannels(pick("secondary"))];
};
const isDark = () => document.documentElement.classList.contains("dark");

let current = null;
function paint() {
  const [primary, secondary] = colourPair(current, isDark());
  if (!primary || !secondary) return false;
  const [dark, light] = luminance(primary) <= luminance(secondary) ? [primary, secondary] : [secondary, primary];
  const root = document.documentElement.style;
  root.setProperty("--color-primary", dark.join(" "));
  root.setProperty("--color-secondary", light.join(" "));
  // Text on the light colour (dark-mode buttons): dark or white, whichever
  // reads better against it.
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const onDark = [11, 18, 32];
  const l = luminance(light);
  root.setProperty("--color-on-secondary", (contrast(l, luminance(onDark)) >= contrast(l, 1) ? onDark : [255, 255, 255]).join(" "));
  // The API sends no background colour, so the page and card backgrounds are
  // tints of the bank's dark colour: nearly white in light mode, the dark
  // colour itself (with lighter steps for cards and borders) in dark mode.
  const mix = (amount, base, towards) => base.map((c, i) => Math.round(c + (towards[i] - c) * amount));
  const white = [255, 255, 255];
  const channels = (rgb) => rgb.join(" ");
  const lift = (amount) => channels(mix(amount, dark, white));
  root.setProperty("--paper-light", channels(mix(0.04, white, dark)));
  root.setProperty("--paper-dark", channels(dark.map((c) => Math.round(c * 0.9))));
  root.setProperty("--surface-dark", lift(0.07));
  [["50", 0.1], ["100", 0.14], ["200", 0.22], ["300", 0.32]].forEach(([step, amount]) => root.setProperty(`--slate-dark-${step}`, lift(amount)));
  return true;
}

// Colours follow the theme switch; so does the logo (see below).
let watching = false;
function watchTheme() {
  if (watching || typeof MutationObserver === "undefined") return;
  watching = true;
  new MutationObserver(() => {
    if (current) paint();
    notifyAssets();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

// The bank's name replaces "InnoVerse" wherever the texts say {{brand}}.
const DEFAULT_BRAND_NAME = "InnoVerse";
// The browser tab shows the institution's display name (from the API) and
// nothing else, on every page.
function setBrandName(name) {
  const brand = String(name ?? "").trim() || DEFAULT_BRAND_NAME;
  document.title = brand;
  if (i18n.options.interpolation.defaultVariables?.brand === brand) return;
  i18n.options.interpolation.defaultVariables = { ...i18n.options.interpolation.defaultVariables, brand };
  // Re-render everything that already drew a text.
  void i18n.changeLanguage(i18n.language);
}

// The institution's legal pages, from its branding (`terms_url`, `privacy_url`).
let links = { terms: "", privacy: "" };
function updateLinks() {
  const next = { terms: String(current?.terms_url ?? "").trim(), privacy: String(current?.privacy_url ?? "").trim() };
  if (next.terms === links.terms && next.privacy === links.privacy) return;
  links = next;
  notifyAssets();
}
export const getBrandingLinks = () => links;

export function applyBranding(branding) {
  current = branding ?? null;
  updateLinks();
  watchTheme();
  const applied = paint();
  setBrandName(applied ? branding.display_name : null);
  return applied;
}

export function resetBranding() {
  current = null;
  updateLinks();
  const root = document.documentElement.style;
  root.removeProperty("--color-primary");
  root.removeProperty("--color-secondary");
  root.removeProperty("--color-on-secondary");
  ["--paper-light", "--paper-dark", "--surface-dark", "--slate-dark-50", "--slate-dark-100", "--slate-dark-200", "--slate-dark-300"].forEach((name) => root.removeProperty(name));
  setBrandName(null);
}

// Last colours seen, so a reload paints in the bank's colours straight away
// instead of flashing the defaults while the call is in flight.
export function readCachedBranding() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.branding) ?? "null");
  } catch {
    return null;
  }
}
export function cacheBranding(branding) {
  try {
    if (branding) window.localStorage.setItem(STORAGE_KEYS.branding, JSON.stringify(branding));
    else window.localStorage.removeItem(STORAGE_KEYS.branding);
  } catch {
    /* Caching is only a nicety. */
  }
}

// The bank's images as object URLs (null = show the portal's own). Kept
// outside React so every header reads the one copy. The dark-theme logo is
// used in dark mode when the bank has one.
const logoListeners = new Set();
const notifyAssets = () => logoListeners.forEach((listener) => listener());
const urls = { logo: null, logoDark: null, loginBackground: null };
function setAsset(name, blob) {
  if (urls[name]) URL.revokeObjectURL(urls[name]);
  urls[name] = blob ? URL.createObjectURL(blob) : null;
  notifyAssets();
}
export const getBrandingLogo = () => (isDark() && urls.logoDark) || urls.logo;
export const setBrandingLogo = (blob) => setAsset("logo", blob);
export const setBrandingLogoDark = (blob) => setAsset("logoDark", blob);
export const getBrandingLoginBackground = () => urls.loginBackground;
export const setBrandingLoginBackground = (blob) => setAsset("loginBackground", blob);
// The bank's favicon in the browser tab; null puts the portal's own back.
const defaultFavicon = typeof document !== "undefined" ? document.querySelector("link[rel~='icon']")?.href ?? null : null;
let faviconUrl = null;
export function setBrandingFavicon(blob) {
  if (faviconUrl) URL.revokeObjectURL(faviconUrl);
  faviconUrl = blob ? URL.createObjectURL(blob) : null;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    if (!faviconUrl) return;
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (faviconUrl) link.href = faviconUrl;
  else if (defaultFavicon) link.href = defaultFavicon;
  else link.remove();
}
export function subscribeBrandingLogo(listener) {
  logoListeners.add(listener);
  return () => logoListeners.delete(listener);
}
