import { useTranslation } from "react-i18next";
import { ArrowRight, Check, CircleAlert, Hourglass, Info, UserCheck } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";

// What a checkpoint screen says, by the `code` the bank chose. A code the
// portal does not know is drawn plainly with the reply's own message.
const TEXT = {
  READY_TO_SUBMIT: ["Setup complete", "Everything is filled in. Ready to submit?"],
  UNDER_AGE: ["You need to be 16 or older", "Your answers are saved. Come back once you turn 16 and carry on from here."],
  IS_MINOR: ["You need a parent or tutor", "At {{age}}, a parent or tutor has to open the account with you."],
  GUARDIAN_MUST_REGISTER: ["They need to register first", "This number is not a customer yet. Once they have registered, check again."],
  GUARDIAN_FOUND: ["We found their account", "Check it is the right person, then send them the approval request."],
  AWAITING_GUARDIAN: ["Waiting for approval", "We asked them to approve. Check again once they have."],
  GUARDIAN_DECLINED: ["They declined", "Use another parent or tutor to carry on."],
  GUARDIAN_APPROVED: ["Approved", "Linked to your account."],
  GUARDIAN_LEVEL_PENDING: ["Ready to send", "Your sign-up goes ahead on its own as soon as they finish what is still waiting on them."],
  HELD_FOR_GUARDIAN: ["Waiting on your parent", "Your sign-up goes ahead as soon as they finish what is still waiting on them."],
};
// The words on a button, by code and action. EDIT shows an earlier screen
// again; GUARDIAN_REQUEST sends the approval request.
const ACTION_TEXT = {
  IS_MINOR: { EDIT: "Change date of birth" },
  GUARDIAN_MUST_REGISTER: { EDIT: "Change the number" },
  GUARDIAN_FOUND: { GUARDIAN_REQUEST: "Send approval request", EDIT: "Wrong number" },
  AWAITING_GUARDIAN: { GUARDIAN_REQUEST: "Send the request again", EDIT: "Use a different number" },
  GUARDIAN_DECLINED: { EDIT: "Use another number" },
};
const ACTION_FALLBACK = { EDIT: "Edit", GUARDIAN_REQUEST: "Send the request" };

// A list from the API ("what they still have to provide"): text, or objects.
const itemText = (item) => (typeof item === "string" ? item : String(item?.label ?? item?.name ?? item?.message ?? item?.key ?? ""));

function GuardianCard({ guardian, t }) {
  const missing = (guardian.missing ?? []).map(itemText).filter(Boolean);
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-paper/60 p-4 text-left">
      <div className="flex items-center gap-3">
        <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lime">
          <UserCheck size={18} />
        </span>
        <div className="min-w-0">
          {guardian.name && <p className="font-semibold text-ink [overflow-wrap:anywhere]">{guardian.name}</p>}
          {guardian.kyc_level_name && (
            <p className="text-xs text-slate-500">{t("onb.cp.level", { defaultValue: "Account level: {{level}}", level: guardian.kyc_level_name })}</p>
          )}
        </div>
      </div>
      {missing.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-500">{t("onb.cp.missing", { defaultValue: "Still waiting on them" })}</p>
          <ul className="mt-1.5 grid gap-1 text-sm text-ink">
            {missing.map((text, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// One checkpoint of the sign-up (or of the signed-in KYC upgrade): the screen
// the bank asks the merchant to see between two sections. `outcome` says what
// can happen next: CONTINUE (show the next section), SUBMIT (ready to send),
// STOP (cannot go on), WAIT (something outside the page has to happen first).
export default function CheckpointScreen({ flow }) {
  const { t } = useTranslation();
  const { checkpoint, checkpointMessage, acting, navigating, submitting, problemInfo, dismissCheckpoint, editFromCheckpoint, recheckCheckpoint, runCheckpointAction, submitForApproval } = flow;
  const { code, outcome, at, data = {} } = checkpoint;
  const known = TEXT[code];
  const guardian = data.guardian;
  const busy = Boolean(acting) || navigating || submitting;

  // A code the portal does not know is titled with the institution's own name for it.
  const title = known ? t(`onb.cp.${code}.title`, { defaultValue: known[0] }) : checkpoint.name || checkpointMessage;
  const body = known ? t(`onb.cp.${code}.body`, { defaultValue: known[1], ...data }) : "";
  const Icon = outcome === "STOP" ? CircleAlert : outcome === "WAIT" ? Hourglass : outcome === "SUBMIT" || code === "GUARDIAN_APPROVED" ? Check : Info;

  // Buttons the bank asked for. "Send the request again" is only offered while
  // the server allows another one (`can_resend`).
  const actions = (checkpoint.actions ?? []).filter((action) => !(code === "AWAITING_GUARDIAN" && action.code === "GUARDIAN_REQUEST" && guardian?.can_resend !== true));
  const actionLabel = (action) =>
    t(`onb.cp.${code}.${action.code}`, { defaultValue: ACTION_TEXT[code]?.[action.code] ?? ACTION_FALLBACK[action.code] ?? action.code });
  const runAction = (action) => (action.code === "EDIT" ? void editFromCheckpoint(action.section ?? at) : void runCheckpointAction(action.code));

  const submits = outcome === "SUBMIT";
  const continues = outcome === "CONTINUE";
  const waits = outcome !== "CONTINUE" && outcome !== "SUBMIT" && outcome !== "STOP";
  // A stop with no button of its own ("Okay") shows the screen it follows.
  const okay = outcome === "STOP" && actions.length === 0;

  return (
    <div className="mx-auto w-full max-w-xl">
      {problemInfo && (
        <div className="mb-5">
          <ErrorState message={problemInfo.message} problems={problemInfo.problems} />
        </div>
      )}
      <div className="rounded-3xl border border-slate-200 bg-surface p-6 text-center shadow-sm sm:p-8">
        <span className="brand-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-lime">
          <Icon size={26} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {body && <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>}
        {guardian && <GuardianCard guardian={guardian} t={t} />}

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {continues && (
            <Button onClick={dismissCheckpoint} disabled={busy} className="px-8">
              {t("onb.cp.continue", { defaultValue: "Continue" })}
              <ArrowRight size={16} />
            </Button>
          )}
          {submits && (
            <Button pending={submitting} disabled={busy} onClick={() => void submitForApproval()} className="px-8">
              {code === "GUARDIAN_LEVEL_PENDING" ? t("onb.cp.continue", { defaultValue: "Continue" }) : t("onb.submit")}
              {!submitting && <Check size={16} />}
            </Button>
          )}
          {okay && (
            <Button pending={navigating} disabled={busy} onClick={() => void editFromCheckpoint(at)} className="px-8">
              {t("common.ok", { defaultValue: "Okay" })}
            </Button>
          )}
          {actions.map((action, index) => (
            <Button
              key={`${action.code}:${action.section ?? ""}`}
              variant={index === 0 && !continues && !submits && !okay ? "primary" : "secondary"}
              pending={acting === action.code}
              disabled={busy}
              onClick={() => runAction(action)}
              className="px-6"
            >
              {actionLabel(action)}
            </Button>
          ))}
          {waits && (
            <Button variant="secondary" pending={navigating} disabled={busy} onClick={() => void recheckCheckpoint()} className="px-6">
              {t("onb.cp.checkAgain", { defaultValue: "Check again" })}
            </Button>
          )}
          {submits && (
            <Button variant="secondary" disabled={busy} onClick={dismissCheckpoint} className="px-6">
              {t("onb.cp.review", { defaultValue: "Review my answers" })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
