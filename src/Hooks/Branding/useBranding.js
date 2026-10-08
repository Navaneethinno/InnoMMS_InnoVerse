import { useEffect } from "react";
import { notifications } from "@/Utils/Lib/notifications";
import { fetchBranding, fetchBrandingFile } from "@/Services/Branding/branding.api";
import {
  applyBranding,
  cacheBranding,
  readCachedBranding,
  resetBranding,
  setBrandingFavicon,
  setBrandingLoginBackground,
  setBrandingLogo,
  setBrandingLogoDark,
} from "@/Utils/Lib/branding";

// Loads the bank's colours (and logo/favicon, when it has them) once, when the portal starts. The portal's own
// colours (styles.css) are the fallback: they are used when the bank has no
// branding set up and whenever the call fails. A refusal worded by the API
// (unknown bank) is also shown.
export function useBranding() {
  useEffect(() => {
    applyBranding(readCachedBranding());
    let cancelled = false;
    fetchBranding()
      .then((branding) => {
        if (cancelled) return;
        cacheBranding(branding);
        if (!applyBranding(branding)) resetBranding();
        // Each is a stored path ("" = none). A missing image is not worth
        // an error: the portal's own mark stays.
        const load = (path, apply) => {
          if (!path) return;
          fetchBrandingFile(path)
            .then((blob) => {
              if (!cancelled) apply(blob);
            })
            .catch(() => {});
        };
        load(branding?.logo, setBrandingLogo);
        load(branding?.logo_dark, setBrandingLogoDark);
        load(branding?.favicon, setBrandingFavicon);
        load(branding?.login_background, setBrandingLoginBackground);
      })
      .catch((error) => {
        if (cancelled) return;
        cacheBranding(null);
        resetBranding();
        if (error.status) notifications.error(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
}
