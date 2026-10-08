import { INST_PROFILE_ID } from "@/Utils/Constant";
// The merchant auth contract: the request bodies and how a sign-in / refresh
// reply becomes the stored session.
const first = (payload) => (Array.isArray(payload?.data) ? payload.data[0] : payload?.data) ?? {};

export const authContract = {
  // A PIN or a password, whichever the portal signs in with (both are sealed).
  loginPayload({ username, password, pin }) {
    return { ...(INST_PROFILE_ID ? { inst_profile_id: INST_PROFILE_ID } : {}), login_id: username, ...(pin ? { pin } : { password }) };
  },
  refreshPayload(refreshToken) {
    return { refresh_token: refreshToken };
  },
  // `previousUser` fills in what a refresh reply may not repeat (login_id).
  session(payload, previousUser = null) {
    const data = first(payload);
    return {
      user: {
        id: data.entity_id ?? previousUser?.id,
        name: data.name ?? previousUser?.name,
        username: previousUser?.username,
        party: data.party ?? previousUser?.party,
        entityType: data.entity_type ?? previousUser?.entityType,
        sessionId: data.session_id ?? previousUser?.sessionId,
        pinSet: data.pin_set ?? previousUser?.pinSet,
        pinLocked: data.pin_locked ?? previousUser?.pinLocked,
        separatePins: data.separate_pins ?? previousUser?.separatePins,
      },
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      refreshExpiresAt: data.refresh_expires_at,
      // { idle_timeout_seconds, access_ttl_seconds, max_seconds }
      sessionPolicy: data.session ?? null,
    };
  },
};
