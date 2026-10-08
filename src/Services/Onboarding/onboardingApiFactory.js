import i18n from "@/Utils/I18n/i18n";
import { INST_PROFILE_ID, PORTAL_AUTHORIZATION } from "@/Utils/Constant";
import { api, requireEndpoint } from "@/Services/api/client";
import { readBlobPayload, toApiRequestError } from "@/Services/api/apiErrors";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Shared runtime for every self-service onboarding flow (individual,
// corporate, and any future one): same envelope, same headers, same error
// handling. Only the endpoint paths and the options/add payloads differ per
// flow, and those stay in each flow's own service file.
//
// Every call is a POST carrying the portal's one fixed Basic credential (no
// login, no token). Every reply is { status, message, data: [ ... ] }:
// `message` is the API's own text and is what gets shown, and a refusal
// carries its reasons in `data[0].problems` — none of it is re-worded here.
function createRequest(endpoints) {
  // `responseType: "blob"` is for calls that answer with a file; their
  // refusals are still JSON, read back from the blob.
  return async function request(endpointKey, body = {}, { responseType } = {}) {
    const endpoint = requireEndpoint(endpoints[endpointKey]);
    try {
      // A FormData body goes out as multipart; axios lets the browser set
      // Content-Type with its boundary.
      const response = await api.post(endpoint, body, {
        skipAuth: true,
        responseType,
        headers: {
          ...(PORTAL_AUTHORIZATION ? { Authorization: PORTAL_AUTHORIZATION } : {}),
          ...apiLanguageHeader(),
        },
      });
      if (responseType === "blob") return response.data;
      const payload = response.data;
      if (String(payload?.status).toLowerCase() === "fail" || payload?.code === 0) {
        throw toApiRequestError(payload, response.status, i18n.t("common.requestFailed"));
      }
      return payload;
    } catch (error) {
      if (error.response) {
        const payload = await readBlobPayload(error.response.data);
        throw toApiRequestError(payload, error.response.status, i18n.t("common.requestFailed"));
      }
      // No reply at all (offline, blocked, misconfigured): there is no API
      // message to show, so use the app's own generic one.
      throw error.name === "ApiRequestError" ? error : new Error(i18n.t("common.requestFailed"));
    }
  };
}

const firstOf = (payload) => (Array.isArray(payload?.data) ? payload.data[0] : payload?.data) ?? null;
const result = (payload) => ({ data: firstOf(payload), message: payload?.message ?? "" });

// Builds one flow's { api, loadOptions, start, resume, loadWizard, next, back,
// submit, discard, uploadFile, downloadFile } from its
// OPTIONS/ADD/GET/NEXT/BACK/SUBMIT/DISCARD/UPLOAD/FILE paths. Everything
// but `loadOptions` resolves to { data: <the screen>, message } (one section
// per reply) so callers can show the API's own message; `loadOptions`
// resolves to the options object itself.
export function createOnboardingApi(endpoints) {
  const request = createRequest(endpoints);
  // `options` and `add` name the bank; the other calls work from the
  // onboarding's reference_id.
  const withBank = (payload = {}) => (INST_PROFILE_ID ? { inst_profile_id: INST_PROFILE_ID, ...payload } : payload);
  const rawApi = {
    options: (payload) => request("OPTIONS", withBank(payload)),
    add: (payload) => request("ADD", withBank(payload)),
    resume: (payload) => request("RESUME", payload),
    next: (payload) => request("NEXT", payload),
    back: (payload) => request("BACK", payload),
    get: (referenceId, sectionKey) => request("GET", { reference_id: referenceId, ...(sectionKey ? { section_key: sectionKey } : {}) }),
    submit: (payload) => request("SUBMIT", payload),
    upload: (form) => request("UPLOAD", form),
    file: (payload) => request("FILE", payload, { responseType: "blob" }),
    discard: (referenceId) => request("DISCARD", { reference_id: referenceId }),
    respond: (payload) => request("RESPOND", payload),
    respondUpload: (form) => request("RESPOND_UPLOAD", form),
    action: (payload) => request("ACTION", payload),
  };
  return {
    api: rawApi,
    loadOptions: async (payload) => firstOf(await rawApi.options(payload)),
    // For a contact with an application in progress `start` answers with
    // `resume_required` (a code was sent to the application's own email or
    // phone: { otp_ref, expires_at, sent_to }) instead of the application.
    start: async (payload) => result(await rawApi.add(payload)),
    // The code from that message opens the application: the same reply the
    // old resumed `add` gave (the section where the customer stopped).
    resume: async ({ otpRef, otp }) => result(await rawApi.resume({ otp_ref: otpRef, otp })),
    // `sectionKey` shows that section instead of where the customer stopped
    // (what a request from the institution reopens).
    loadWizard: async (referenceId, sectionKey) => result(await rawApi.get(referenceId, sectionKey)),
    // Saves the section's answers (`data`; leave it out to move on without
    // changing anything) and answers with the next section.
    next: async (payload) => result(await rawApi.next(payload)),
    // The section before `section_key`; saves nothing.
    back: async (payload) => result(await rawApi.back(payload)),
    submit: async (payload) => result(await rawApi.submit(payload)),
    // Throws away an unfinished onboarding (answers and files) so the
    // contact can start afresh or in another role. A completed one can't be.
    discard: async (referenceId) => result(await rawApi.discard(referenceId)),
    // Stores one file for a FILE field. Resolves to { path, file_name,
    // content_type, size }; `path` is what the section is then saved with.
    // `side` (`front` / `back`) only applies to a front-and-back field.
    uploadFile: async ({ referenceId, field, side, file }) => {
      const form = new FormData();
      form.append("reference_id", referenceId);
      form.append("field", field);
      if (side) form.append("side", side);
      form.append("file", file);
      return firstOf(await rawApi.upload(form));
    },
    // Answers one of the institution's requests (`request_id`) once the
    // application is submitted: `data` (FIELDS / SECTION), `files`
    // (DOCUMENT) or `answer` (QUESTION). Resolves to the wizard with its
    // updated `review`.
    respond: async (payload) => result(await rawApi.respond(payload)),
    // Stores a file for a request. For a FIELDS / SECTION request that
    // reopened a FILE field, pass `field` (and `side`): the path returned is
    // that field's answer in `respond`'s `data`.
    respondUploadFile: async ({ referenceId, requestId, field, side, file }) => {
      const form = new FormData();
      form.append("reference_id", referenceId);
      form.append("request_id", requestId);
      if (field) form.append("field", field);
      if (side) form.append("side", side);
      form.append("file", file);
      return firstOf(await rawApi.respondUpload(form));
    },
    // A checkpoint button the server acts on (`GUARDIAN_REQUEST`); the reply is
    // the next screen.
    action: async ({ referenceId, action }) => result(await rawApi.action({ reference_id: referenceId, action })),
    // Resolves to the stored file itself, as a Blob.
    downloadFile: (referenceId, path) => rawApi.file({ reference_id: referenceId, path }),
  };
}
