import i18n from "@/Utils/I18n/i18n";

export class ApiConfigurationError extends Error {
  constructor() {
    super("Merchant API contract is not configured");
    this.code = "API_NOT_CONFIGURED";
  }
}
// A refusal from the merchant-portal API. `message` is the API's own
// plain-language text (already in the caller's language) and is shown as
// is; `problems` is the optional list of reasons under it
// (`data[0].problems`, or `data.problems`); `status` is the HTTP status, which decides the kind
// of state to show (403 = channel not offered, 409 = conflict, ...). The
// English `remark` is technical detail and is never used.
class ApiRequestError extends Error {
  constructor(
    message,
    {
      status = null,
      problems = [],
      errorCode = null,
      remark = "",
      retryAfterSeconds = null,
      lockedUntil = null,
      problemKeys = [],
    } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    // A stable key (`portal.otp_wrong`, `portal.pin_locked`, ...): branch on
    // this, never on `message`, which is translated text.
    this.errorCode = errorCode;
    this.problems = problems;
    // The API's technical note (English). Only read for a fact in it, like "locked until <time>".
    this.remark = remark;
    // A locked sign-in says when it opens again: seconds from now, and the UTC time.
    this.retryAfterSeconds = retryAfterSeconds;
    this.lockedUntil = lockedUntil;
    // Where each problem is (`problem_keys`: key, section, field, params).
    this.problemKeys = problemKeys;
  }
}

// Card answers carry `message_key` (card.rc_51, ...) and refused merchant
// payments txn.merchant_blocked: the backend asks that these show the
// portal's own text for the key, in the user's language, never the raw
// `message`. Any other key keeps the API's message.
const KEYED_MESSAGE = /^(card\.rc_\w+|txn\.merchant_blocked)$/;
export function keyedMessage(payload) {
  const key = payload?.message_key ?? payload?.data?.[0]?.message_key ?? payload?.data?.message_key ?? payload?.error_code;
  if (typeof key !== "string" || !KEYED_MESSAGE.test(key) || !i18n.exists(key)) return payload?.message ?? "";
  return i18n.t(key);
}

export function toApiRequestError(payload, status, fallbackMessage) {
  const problems = payload?.data?.[0]?.problems ?? payload?.data?.problems;
  const problemKeys = payload?.data?.[0]?.problem_keys ?? payload?.data?.problem_keys;
  return new ApiRequestError(keyedMessage(payload) || fallbackMessage, {
    status,
    problems: Array.isArray(problems) ? problems : [],
    errorCode: payload?.error_code ?? null,
    remark: payload?.remark ?? "",
    retryAfterSeconds: payload?.data?.[0]?.retry_after_seconds ?? null,
    lockedUntil: payload?.data?.[0]?.locked_until ?? null,
    problemKeys: Array.isArray(problemKeys) ? problemKeys : [],
  });
}

// Calls that answer with a file (responseType "blob") still refuse in the
// API's JSON format; read that body back so its message can be shown.
export async function readBlobPayload(data) {
  if (!(data instanceof Blob)) return data;
  try {
    return JSON.parse(await data.text());
  } catch {
    return null;
  }
}
