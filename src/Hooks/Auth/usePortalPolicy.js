import { useEffect, useState } from "react";
import { loadPolicy } from "@/Services/Auth/auth.api";
import { DEFAULT_POLICY, policyFrom } from "@/Utils/Lib/policy";

// The institution's rules before sign-in (auth/policy): how merchants sign in,
// the PIN and password rules, the codes, phone countries and currencies. With
// an activation's `otpRef` they include the PIN rules of that account. The
// general ones are fetched once. `status` is "loading", "ready" or "failed"
// (the defaults then stand: password sign-in, 6-digit codes).
let general = null;
const generalPolicy = () => (general ??= loadPolicy().then(policyFrom).catch((error) => {
  general = null;
  throw error;
}));

export function usePortalPolicy(otpRef) {
  const [state, setState] = useState({ policy: DEFAULT_POLICY, status: "loading" });
  useEffect(() => {
    let cancelled = false;
    (otpRef ? loadPolicy(otpRef).then(policyFrom) : generalPolicy())
      .then((policy) => !cancelled && setState({ policy, status: "ready" }))
      .catch(() => !cancelled && setState((previous) => ({ ...previous, status: "failed" })));
    return () => {
      cancelled = true;
    };
  }, [otpRef]);
  return { ...state.policy, status: state.status };
}
