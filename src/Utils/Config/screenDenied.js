// The user's own pages, open to everyone signed in.
const ALWAYS = ["dashboard", "profile", "security", "notifications"];

// Whether `pathname` is a menu screen the API's menu did not give this user.
// Nothing is denied until the menu has loaded; the server refuses the data anyway.
export function screenDenied(screens, menu, pathname) {
  if (!menu?.length) return false;
  const granted = new Set([...ALWAYS, ...menu.map((item) => item.key)]);
  const first = `/${String(pathname ?? "").split("/").filter(Boolean)[0] ?? ""}`;
  return Object.entries(screens).some(([key, screen]) => screen.to === first && !granted.has(key));
}
