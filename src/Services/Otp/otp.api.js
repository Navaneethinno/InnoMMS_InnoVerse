import { portalRequest } from "@/Services/api/request";
import { API_ENDPOINTS, MERCHANT_INST_PROFILE_ID, MERCHANT_PORTAL_AUTHORIZATION } from "@/Utils/Constant";
import { i18n } from "@/Utils/I18n/i18n";

// Contact verification: send a one-time code to the merchant's email or
// phone, then check the code they type. Same flow as the customer portal.
//
// TEMPORARY MOCK: the backend has no OTP calls yet. While
// API_ENDPOINTS.OTP.SEND / VERIFY are null, sending always succeeds and the
// only accepted code is MOCK_CODE. Once the real endpoints are set in
// Constant.js the calls below go to the API and this mock is unused.
const MOCK_CODE = "1111";
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const post = async (path, body) => {
  const payload = await portalRequest(
    path,
    { ...(MERCHANT_INST_PROFILE_ID ? { inst_profile_id: MERCHANT_INST_PROFILE_ID } : {}), ...body },
    { authorization: MERCHANT_PORTAL_AUTHORIZATION },
  );
  return { message: payload?.message ?? "" };
};

// channel: "email" | "phone"
export async function sendOtp({ channel, destination }) {
  if (API_ENDPOINTS.OTP.SEND) return post(API_ENDPOINTS.OTP.SEND, { channel, destination });
  await wait(600);
  return { message: "" };
}

export async function verifyOtp({ channel, destination, code }) {
  if (API_ENDPOINTS.OTP.VERIFY) return post(API_ENDPOINTS.OTP.VERIFY, { channel, destination, code });
  await wait(700);
  if (code !== MOCK_CODE) {
    const error = new Error(i18n.t("signup:otpWrongCode"));
    error.status = 400;
    throw error;
  }
  return { message: "" };
}
