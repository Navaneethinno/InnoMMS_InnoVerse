import { useSyncExternalStore } from "react";
import { getBrandingLinks, subscribeBrandingLogo } from "@/Utils/Lib/branding";

// The institution's { terms, privacy } addresses from its branding ("" when it
// has not set one).
export function useBrandingLinks() {
  return useSyncExternalStore(subscribeBrandingLogo, getBrandingLinks);
}
