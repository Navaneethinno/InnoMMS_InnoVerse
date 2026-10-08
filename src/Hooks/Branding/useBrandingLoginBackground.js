import { useSyncExternalStore } from "react";
import { getBrandingLoginBackground, subscribeBrandingLogo } from "@/Utils/Lib/branding";

// The bank's login background image URL once loaded by useBranding, or null.
export function useBrandingLoginBackground() {
  return useSyncExternalStore(subscribeBrandingLogo, getBrandingLoginBackground);
}
