import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { loadMe } from "@/Services/Auth/auth.api";
import { readAuthUser, updateAuthUser } from "@/Services/api/authStorage";
import { userUpdated } from "@/Redux/slices/authSlice";
import { setDisplayTimeZone } from "@/Utils/Lib/format";
import { mePatchFrom } from "@/Utils/Lib/mePatch";

// Asks `auth/me` who the customer is now (PIN set or locked, one PIN or two, the
// rules, time zone, avatar) and keeps it on the user. Never throws: if the call
// fails the portal keeps what it has.
export function useMeRefresh() {
  const dispatch = useDispatch();
  return useCallback(
    () =>
      loadMe()
        .then((me) => {
          const patch = mePatchFrom(me);
          if (patch.timezone) setDisplayTimeZone(patch.timezone);
          updateAuthUser({ ...readAuthUser(), ...patch });
          dispatch(userUpdated(patch));
        })
        .catch(() => {}),
    [dispatch],
  );
}
