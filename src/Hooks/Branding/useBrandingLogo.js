import { useSyncExternalStore } from "react";
import { getBrandingLogo, subscribeBrandingLogo } from "@/Utils/Lib/branding";

// The bank's logo URL once loaded by useBranding, or null.
export function useBrandingLogo() {
  return useSyncExternalStore(subscribeBrandingLogo, getBrandingLogo);
}
