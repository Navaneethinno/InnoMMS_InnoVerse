import { STORAGE_KEYS } from "@/Utils/Constant";

const MAX = 8;

// The numbers this merchant sent money to lately, newest first, kept in this
// browser only (a convenience: empty when storage is blocked).
export const readRecentPayees = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.recentPayees) || "[]");
    return Array.isArray(list) ? list.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export const rememberPayee = (phoneNumber) => {
  if (!phoneNumber) return;
  try {
    const list = [phoneNumber, ...readRecentPayees().filter((item) => item !== phoneNumber)].slice(0, MAX);
    localStorage.setItem(STORAGE_KEYS.recentPayees, JSON.stringify(list));
  } catch {
    // Storage blocked: nothing is remembered.
  }
};
