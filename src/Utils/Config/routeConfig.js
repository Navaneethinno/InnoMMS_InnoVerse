// Matches by the URL's first path segment rather than the full path,
// because the sidebar's fabricated navigation (MenuItem.jsx, ported from
// payseFrontend) always appends a random id — a click lands on paths like
// /user/<uuid> or /profile/<uuid>, not the clean /users or /profiles this
// file used to list as exact/prefix matches. Matching on the full path (or
// even a full-path prefix) meant almost every real page fell through to no
// match at all, and TopBar's breadcrumb silently showed "Dashboard"
// everywhere. Segment-based matching handles every current fabricated
// route (and any future one with the same slug) without needing this file
// hand-kept in sync with the router every time a new alias route is added.
// Two-level breadcrumb (module / menu) matching the sidebar's own module
// grouping (e.g. the "USER MANAGEMENT" section header containing "User" and
// "Profile" rows) so the top bar reads as a clear route, not just a bare
// page name.
const SEGMENT_LABELS = {
  // Base pages
  dashboard: { titleKey: "crumbDashboard", breadcrumb: ["crumbDashboard"] },
  notifications: { titleKey: "crumbNotifications", breadcrumb: ["crumbNotifications"] },
  "my-profile": { titleKey: "crumbMyProfile", breadcrumb: ["crumbMyProfile"] },
  "change-password": { titleKey: "crumbChangePassword", breadcrumb: ["crumbChangePassword"] },

  // --- Example > Master > Category (sample) ------------------------------
  // Key = the route slug (sidebar menu_name slugified: lowercase, no spaces).
  // breadcrumb = [parent menu, menu] as translation keys in the "routes" ns.
  category: { titleKey: "crumbCategory", breadcrumb: ["crumbExample", "crumbCategory"] },
};

export function getRouteMetadata(pathname) {
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  return SEGMENT_LABELS[firstSegment] ?? SEGMENT_LABELS.dashboard;
}

// Reverse lookup so PageBreadcrumbs.jsx can make a crumb clickable without
// its own separate, easy-to-forget-to-update path map (the previous one
// didn't cover every possible crumb text — e.g. "Account" had no entry and
// silently fell back to /dashboard). Every SEGMENT_LABELS key IS a real
// registered route segment, so this only ever points at routes that
// actually exist.
//
// Prefers an exact match on the LEAF label (a crumb's last/most specific
// segment, e.g. "Account Product") over a MODULE-level match (a crumb's
// first segment, e.g. "Account") — a leaf route is the more specific page a
// user would expect that exact word to open; only the module-level crumb
// itself (which has no more specific route of its own) falls back to
// whichever segment represents that module's own landing page.
export function getPathForCrumb(label) {
  const entries = Object.entries(SEGMENT_LABELS);
  const leafMatch = entries.find(([, meta]) => meta.breadcrumb[meta.breadcrumb.length - 1] === label);
  if (leafMatch) return leafMatch[0];
  const moduleMatch = entries.find(([, meta]) => meta.breadcrumb[0] === label);
  if (moduleMatch) return moduleMatch[0];
  return "dashboard";
}
