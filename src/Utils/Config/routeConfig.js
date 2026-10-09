import { ArrowRightLeft, Banknote, Bell, CreditCard, FileText, History, LayoutDashboard, MonitorSmartphone, ShieldCheck, Store, UserPlus, UserRound, Users } from "lucide-react";

// Ordered by merchant navigation. Extend only when actual screens are added.
export const routeConfig = { login: { titleKey: "auth.title" } };

// The screens the portal has, by the key the API's menu uses. The menu itself
// (which items, in what order, with what label) comes from the API; a key not
// listed here is not shown, and a screen the API does not list is not offered.
export const navScreens = {
  dashboard: { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  send: { to: "/send", labelKey: "nav.send", icon: ArrowRightLeft },
  history: { to: "/history", labelKey: "nav.history", icon: History },
  cards: { to: "/cards", labelKey: "nav.cards", icon: CreditCard },
  statements: { to: "/statements", labelKey: "nav.statements", icon: FileText },
  notifications: { to: "/notifications", labelKey: "nav.notifications", icon: Bell },
  profile: { to: "/profile", labelKey: "nav.profile", icon: UserRound },
  security: { to: "/security", labelKey: "nav.security", icon: ShieldCheck },
  // Agents, stores and POS (shown only when the API's menu lists them).
  agent: { to: "/agent", labelKey: "nav.agent", icon: Banknote },
  signups: { to: "/signups", labelKey: "nav.signups", icon: UserPlus },
  my_agents: { to: "/my-agents", labelKey: "nav.myAgents", icon: Users },
  stores: { to: "/stores", labelKey: "nav.stores", icon: Store },
  terminals: { to: "/terminals", labelKey: "nav.terminals", icon: MonitorSmartphone },
};

// What the sidebar shows until the menu has been fetched (or when it cannot be).
export const navItems = ["dashboard", "send", "history", "cards", "security"].map((key) => ({ key, ...navScreens[key] }));

// The API's menu -> the sidebar's items, in its order, unknown keys dropped.
export const navFromMenu = (menu) =>
  [...(menu ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((item) => navScreens[item.key])
    .map((item) => ({ key: item.key, ...navScreens[item.key], label: item.label }));
