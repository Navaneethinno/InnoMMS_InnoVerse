import { pinRulesFrom } from "./pinRules";
import { policyFrom } from "./policy";

// What `auth/me` tells the portal about the signed-in merchant, as the fields
// kept on the user: whether their transaction PIN is set or locked, whether the
// bank has one PIN or two, the rules, the time zone and their avatar.
export function mePatchFrom(me) {
  const policy = me?.policy ? policyFrom(me.policy) : null;
  const separate = me?.separate_pins ?? me?.policy?.login?.separate_pins;
  return {
    pinSet: me?.pin_set,
    pinLocked: me?.pin_locked,
    ...(typeof separate === "boolean" ? { separatePins: separate } : {}),
    ...(me?.pin_rules || policy ? { pinRules: pinRulesFrom(me?.pin_rules ?? me?.policy?.txn_pin) } : {}),
    ...(policy ? { policy } : {}),
    ...(typeof me?.password_set === "boolean" ? { passwordSet: me.password_set } : {}),
    ...(me?.timezone ? { timezone: me.timezone } : {}),
    ...(me?.avatar ? { avatar: me.avatar } : {}),
  };
}
