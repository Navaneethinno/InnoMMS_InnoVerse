import { useMemo } from "react";
import { useSelector } from "react-redux";
import { DEFAULT_PIN_RULES } from "@/Utils/Lib/pinRules";

// The signed-in customer's transaction PIN rules (loaded with auth/me when the
// signed-in area opens); `known` is false until then.
export function usePinRules() {
  const stored = useSelector((state) => state.auth.user?.pinRules);
  // `entryMin`: the least a PIN being typed in (to sign in, pay, confirm) must have.
  // The rules are for choosing a new PIN; older PINs can be shorter (4 digits), so
  // typing one in is never held to the new length.
  return useMemo(() => {
    const rules = stored ?? DEFAULT_PIN_RULES;
    return { ...rules, entryMin: Math.min(rules.minLength, 4), known: Boolean(stored) };
  }, [stored]);
}
