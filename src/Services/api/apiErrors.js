export class ApiConfigurationError extends Error {
  constructor() {
    super("Customer API contract is not configured");
    this.code = "API_NOT_CONFIGURED";
  }
}
export function normalizeApiError(error) {
  return {
    code: error.code || "REQUEST_FAILED",
    status: error.response?.status || null,
    messageKey:
      error.code === "API_NOT_CONFIGURED"
        ? "auth.notConnected"
        : error.response?.status === 401
          ? "auth.invalidCredentials"
          : "common.requestFailed",
  };
}

// A refusal from the customer-portal API. `message` is the API's own
// plain-language text (already in the caller's language) and is shown as
// is; `problems` is the optional list of reasons under it
// (`data[0].problems`, or `data.problems`); `status` is the HTTP status, which decides the kind
// of state to show (403 = channel not offered, 409 = conflict, ...). The
// English `remark` is technical detail and is never used.
export class ApiRequestError extends Error {
  constructor(message, { status = null, problems = [], errorCode = null, remark = "", retryAfterSeconds = null, lockedUntil = null } = {}) {
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
  }
}

export function toApiRequestError(payload, status, fallbackMessage) {
  const problems = payload?.data?.[0]?.problems ?? payload?.data?.problems;
  return new ApiRequestError(payload?.message || fallbackMessage, {
    status,
    problems: Array.isArray(problems) ? problems : [],
    errorCode: payload?.error_code ?? null,
    remark: payload?.remark ?? "",
    retryAfterSeconds: payload?.data?.[0]?.retry_after_seconds ?? null,
    lockedUntil: payload?.data?.[0]?.locked_until ?? null,
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
