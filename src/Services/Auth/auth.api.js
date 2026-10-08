import { API_ENDPOINTS, INST_PROFILE_ID } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";
import { authContract } from "@/Services/api/authContract";

const { AUTH } = API_ENDPOINTS;
const bank = () => (INST_PROFILE_ID ? { inst_profile_id: INST_PROFILE_ID } : {});

// Sign in: resolves to the session ({ user, accessToken, refreshToken,
// refreshExpiresAt }) to store.
export async function login(credentials) {
  const { data } = await portalPost(AUTH.LOGIN, authContract.loginPayload(credentials), { signedIn: false });
  const session = authContract.session({ data: [data] });
  return { ...session, user: { ...session.user, username: credentials.username } };
}

// A 6-digit code to the customer's email or mobile number. `purpose` is
// ACTIVATE or RESET_PASSWORD. Resolves to { otp_ref, expires_at, sent_to };
// the reply is the same whether or not the contact belongs to a customer.
export const sendCode = async (loginId, purpose) => (await portalPost(AUTH.OTP, { ...bank(), login_id: loginId, purpose }, { signedIn: false })).data;

// First-time access: the code plus the password and transaction PIN to set.
export const activateAccess = (body) => portalPost(AUTH.ACTIVATE, body, { signedIn: false });
export const resetPassword = (body) => portalPost(AUTH.PASSWORD_RESET, body, { signedIn: false });

// The institution's rules before sign-in: how customers sign in (PIN, password
// or both), the password and transaction PIN rules, the one-time codes, the
// countries of phone numbers and its currencies; with an activation's
// `otp_ref` they include that account's PIN rules.
export const loadPolicy = async (otpRef) => (await portalPost(AUTH.POLICY, { ...bank(), ...(otpRef ? { otp_ref: otpRef } : {}) }, { signedIn: false })).data;

// A forgotten PIN, before sign-in (where the portal signs in with a PIN): the
// code from `sendCode(loginId, "RESET_PIN")` and the new PIN. Also lifts a lock.
export const forgotPin = (body) => portalPost(AUTH.PIN_FORGOT, body, { signedIn: false });

// Signed in.
export const loadMe = async () => (await portalPost(AUTH.ME)).data;
export const changePassword = (current, next) => portalPost(AUTH.PASSWORD_CHANGE, { current, new: next });
export const changePin = (current, next) => portalPost(AUTH.PIN_CHANGE, { current, new: next });
// Banks with two PINs: the first transaction PIN (confirmed with the sign-in PIN), and a new sign-in PIN.
export const setTransactionPin = (signinPin, pin) => portalPost(AUTH.PIN_SET, { signin_pin: signinPin, pin });
export const changeSigninPin = (current, next) => portalPost(AUTH.SIGNIN_PIN_CHANGE, { current, new: next });
export const startPinReset = async () => (await portalPost(AUTH.PIN_RESET_START)).data;
export const resetPin = (body) => portalPost(AUTH.PIN_RESET, body);
// The customer's open sessions, most recently used first: [{ id, channel,
// device_type, signed_in_at, last_seen_at, expires_at, current }].
export const listSessions = async () => (await portalPost(AUTH.SESSIONS)).rows;
// Signs one device out (ending the current one works like sign-out).
export const endSession = (id) => portalPost(AUTH.SESSION_END, { id });
// Ends this session, or every session of the customer (all devices).
export const logout = ({ all = false } = {}) => portalPost(AUTH.LOGOUT, all ? { all: true } : {});
