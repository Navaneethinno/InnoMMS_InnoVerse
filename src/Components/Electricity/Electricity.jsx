import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import TextField from "@/Components/Common/TextField";
import ExtFlow, {
  Chips,
  ExtDetails,
  cleanAmount,
  digitsOnly,
  useProviders,
} from "@/Components/Common/Payments/ExtFlow";
import SavedAccounts, {
  SaveAccount,
  useSavedAccounts,
} from "@/Components/Common/Payments/SavedAccounts";
import { loadExtLast } from "@/Services/Account/account.api";

// CREDELEC prepaid electricity (PREPAID_ELECTRICITY): a meter number (6 to 20
// digits), typed or saved. The payment returns the token to key in.
const EMPTY = { meter: "", amount: "" };
const QUICK = ["100", "200", "500", "1000"];

export default function Electricity() {
  const { t } = useTranslation();
  const { list, problem } = useProviders("ELECTRICITY");
  const saved = useSavedAccounts("ELECTRICITY");
  const [form, setForm] = useState(EMPTY);
  const meter = digitsOnly(form.meter);
  const meterOk = meter.length >= 6 && meter.length <= 20;
  const ready = meterOk && Number(form.amount) > 0;
  const request = {
    txn_type: "PREPAID_ELECTRICITY",
    amount: form.amount,
    to_meter_number: meter,
  };
  const pickedSaved = saved.items.find((i) => i.account === meter);

  return (
    <ExtFlow
      title={t("power.title", { defaultValue: "Electricity" })}
      subtitle={t("power.subtitle", {
        defaultValue:
          "Buy CREDELEC prepaid electricity and get the token here.",
      })}
      featureKey="electricity"
      providers={list}
      providersProblem={problem}
      request={request}
      ready={ready}
      onReset={() => setForm(EMPTY)}
      lines={() => [
        [t("ext.type"), t("power.type", { defaultValue: "CREDELEC prepaid" })],
        [t("power.meter", { defaultValue: "Meter number" }), meter],
      ]}
      extra={() => (
        <SaveAccount
          saved={saved}
          kind="ELECTRICITY"
          account={meter}
          label={t("power.saveAs", { defaultValue: "Save this meter as" })}
        />
      )}
    >
      <SavedAccounts
        saved={saved}
        value={pickedSaved?.id}
        onPick={(item) =>
          setForm((f) => ({ ...f, meter: item?.account ?? "" }))
        }
        title={t("power.saved", { defaultValue: "Saved meters" })}
      />
      <div>
        <TextField
          name="meter"
          inputMode="numeric"
          autoComplete="off"
          maxLength={24}
          label={t("power.meter")}
          value={form.meter}
          onChange={(event) =>
            setForm((f) => ({ ...f, meter: digitsOnly(event.target.value) }))
          }
        />
        {meter && !meterOk && (
          <p className="mt-1.5 text-xs text-red-600">
            {t("power.meterInvalid", {
              defaultValue: "A meter number has 6 to 20 digits.",
            })}
          </p>
        )}
        {meterOk && <ResendLast meter={meter} />}
      </div>
      <div>
        <TextField
          name="amount"
          inputMode="decimal"
          label={t("send.amount")}
          value={form.amount}
          onChange={(event) =>
            setForm((f) => ({ ...f, amount: cleanAmount(event.target.value) }))
          }
        />
        <div className="mt-2">
          <Chips
            options={QUICK.map((a) => ({ value: a, label: a }))}
            value={form.amount}
            onChange={(amount) => setForm((f) => ({ ...f, amount }))}
          />
        </div>
      </div>
    </ExtFlow>
  );
}

// Sends the meter's last token again (lost SMS, a mistyped key-in).
function ResendLast({ meter }) {
  const { t } = useTranslation();
  const [state, setState] = useState({
    pending: false,
    result: null,
    problem: "",
    meter,
  });
  if (state.meter !== meter)
    setState({ pending: false, result: null, problem: "", meter });
  const resend = () => {
    setState((s) => ({ ...s, pending: true, problem: "" }));
    loadExtLast({
      txnType: "PREPAID_ELECTRICITY",
      account: meter,
      resend: true,
    })
      .then((result) =>
        setState((s) => ({ ...s, pending: false, result: result ?? {} })),
      )
      .catch((error) =>
        setState((s) => ({ ...s, pending: false, problem: error.message })),
      );
  };
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={state.pending}
        onClick={resend}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
      >
        <RotateCcw
          size={13}
          className={state.pending ? "animate-spin" : undefined}
        />
        {t("power.resend", { defaultValue: "Resend the last token" })}
      </button>
      {state.problem && (
        <p className="mt-1 text-xs text-red-600">{state.problem}</p>
      )}
      {state.result && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-emerald-600">
            {state.result.message ||
              t("power.resent", { defaultValue: "The token was sent again." })}
          </p>
          <ExtDetails details={state.result.details} />
        </div>
      )}
    </div>
  );
}
