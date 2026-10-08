import { useBranding } from "@/Hooks/Branding/useBranding";

// Mounted once at the app root so the bank's colours load when the portal
// starts, whichever page is opened first.
export default function BrandingLoader() {
  useBranding();
  return null;
}
