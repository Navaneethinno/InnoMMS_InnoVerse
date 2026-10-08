// Helpers for building an `add` payload from the picker's raw values: only
// what the merchant actually gave is sent (an `add` with just the contact
// resumes that contact's open onboarding), and the API answers with its own
// message when something required is missing.
export const toId = (value) => (value === "" || value == null ? undefined : Number(value));

export const compactPayload = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
