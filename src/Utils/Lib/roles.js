// Who the signed-in person is in the merchant portal (Agents, stores and POS
// handoff). `party` is always MERCHANT here: it is the portal, not the role.
//  - roles: any of MERCHANT, AGENT, SUPER_AGENT (from auth/me or the menu);
//  - staff: present for a store manager or cashier, who works only in their
//    stores; the owner (the merchant) has none.

export const rolesOf = (user) => (Array.isArray(user?.roles) ? user.roles : []);
export const isStaff = (user) => Boolean(user?.staff);
export const staffRole = (user) => user?.staff?.role ?? null;
export const isOwner = (user) => !isStaff(user);
export const isSuperAgent = (user) => rolesOf(user).includes("SUPER_AGENT");
export const isAgent = (user) =>
  rolesOf(user).includes("AGENT") || isSuperAgent(user);
export const isMerchant = (user) => rolesOf(user).includes("MERCHANT");

const ROLE_LABEL = {
  MERCHANT: ["roles.merchant", "Merchant"],
  AGENT: ["roles.agent", "Agent"],
  SUPER_AGENT: ["roles.superAgent", "Super agent"],
  STORE_MANAGER: ["roles.storeManager", "Store manager"],
  CASHIER: ["roles.cashier", "Cashier"],
};
export const roleName = (role, t) => {
  const [key, fallback] = ROLE_LABEL[role] ?? [
    null,
    String(role ?? "")
      .replaceAll("_", " ")
      .toLowerCase(),
  ];
  return key ? t(key, { defaultValue: fallback }) : fallback;
};

// The line under the name in the header: "Merchant · Agent", "Super agent", or a
// store user's role. Empty while nothing is known.
export function roleLine(user, t) {
  if (isStaff(user)) return roleName(staffRole(user), t);
  return rolesOf(user)
    .map((role) => roleName(role, t))
    .join(" · ");
}

// "Agent of Mondlane Super Agente", for an agent under a super agent.
export const superAgentLine = (user, t) =>
  user?.superAgent?.name
    ? t("roles.agentOf", {
        name: user.superAgent.name,
        defaultValue: "Agent of {{name}}",
      })
    : "";

// Wallets by what they are for (account/wallets `wallet_purpose`): PERSONAL
// (or none) is the merchant's own money; AGENT_FLOAT is only for cash-in,
// cash-out and float; STORE is a store's own wallet (moved with a sweep).
export const isOwnMoney = (wallet) =>
  !wallet?.wallet_purpose || wallet.wallet_purpose === "PERSONAL";
// The wallets Send may pay from: never the float; an owner's store wallets move
// only by sweep, but a store manager's wallets are its stores' own (refunds).
export const sendableWallets = (list, user) =>
  (list ?? []).filter(
    (w) => isOwnMoney(w) || (isStaff(user) && w.wallet_purpose === "STORE"),
  );
