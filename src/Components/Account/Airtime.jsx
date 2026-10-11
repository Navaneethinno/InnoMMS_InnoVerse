import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PhoneField from "@/Components/Common/PhoneField";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import ExtFlow, {
  Chips,
  cleanAmount,
  digitsOnly,
  useProviders,
} from "@/Components/Account/ExtFlow";
import SavedAccounts, {
  SaveAccount,
  useSavedAccounts,
} from "@/Components/Account/SavedAccounts";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { loadExtLast } from "@/Services/Account/account.api";
import { formatMoney } from "@/Utils/Lib/format";
import { RotateCcw } from "lucide-react";

// Airtime (AIRTIME) for the merchant's own number, another number, or a saved
// one. The operator comes from the number's prefix unless one is picked.
const EMPTY = { who: "own", phone: "", saved: null, provider: "", amount: "" };
const QUICK = ["20", "50", "100", "200", "500"];

export default function Airtime() {
  const { t } = useTranslation();
  const portalPolicy = usePortalPolicy();
  const { list, problem } = useProviders("AIRTIME");
  const saved = useSavedAccounts("AIRTIME");
  const [form, setForm] = useState(EMPTY);
  const digits = digitsOnly(form.phone).replace(/^258/, "");
  const guessed =
    digits.length >= 2
      ? (list ?? []).find((p) =>
          (p.prefixes ?? []).some((prefix) => digits.startsWith(prefix)),
        )
      : null;
  const target =
    form.who === "saved" && form.saved
      ? { saved_account_id: form.saved.id }
      : form.who === "other"
        ? { to_phone_number: form.phone.trim() }
        : {};
  const ready =
    Number(form.amount) > 0 &&
    (form.who === "own" ||
      (form.who === "other" ? digits.length >= 9 : Boolean(form.saved)));
  const request = {
    txn_type: "AIRTIME",
    amount: form.amount,
    ...target,
    ...(form.provider ? { provider: form.provider } : {}),
  };
  const number =
    form.who === "other"
      ? form.phone.trim()
      : form.who === "saved"
        ? form.saved?.account
        : "";
  const tabs = [
    { key: "own", label: t("airtime.own", { defaultValue: "My number" }) },
    {
      key: "other",
      label: t("airtime.other", { defaultValue: "Another number" }),
    },
    ...(saved.items.length
      ? [{ key: "saved", label: t("airtime.saved", { defaultValue: "Saved" }) }]
      : []),
  ];

  return (
    <ExtFlow
      title={t("airtime.title", { defaultValue: "Airtime" })}
      subtitle={t("airtime.subtitle", {
        defaultValue: "Buy airtime for your number or anyone's.",
      })}
      featureKey="airtime"
      providers={list}
      providersProblem={problem}
      request={request}
      ready={ready}
      onReset={() => setForm(EMPTY)}
      lines={(quote) => [
        [t("ext.type"), t("airtime.title")],
        [
          t("airtime.number", { defaultValue: "Number" }),
          quote.external?.account ?? (number || t("airtime.own")),
        ],
      ]}
      extra={(done) =>
        form.who === "other" && (
          <SaveAccount
            saved={saved}
            kind="AIRTIME"
            account={done.external?.account ?? form.phone.trim()}
            label={t("airtime.saveAs", { defaultValue: "Save this number as" })}
          />
        )
      }
    >
      <SegmentedTabs
        items={tabs}
        value={form.who}
        onChange={(who) => setForm((f) => ({ ...f, who }))}
      />
      <BuyAgain
        currency={list?.[0]?.currency_code}
        onPick={(last) =>
          setForm({
            ...EMPTY,
            who: "other",
            phone: last.account ?? "",
            amount: String(last.amount ?? ""),
            provider: last.provider_code ?? "",
          })
        }
      />
      {form.who === "other" && (
        <PhoneField
          name="phone"
          label={t("airtime.number")}
          countries={portalPolicy.phone.countries}
          value={form.phone}
          onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
        />
      )}
      {form.who === "saved" && (
        <SavedAccounts
          saved={saved}
          value={form.saved?.id}
          onPick={(item) => setForm((f) => ({ ...f, saved: item }))}
          title={t("airtime.savedNumbers", { defaultValue: "Saved numbers" })}
        />
      )}
      {list?.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {t("airtime.operator", { defaultValue: "Operator" })}
          </p>
          <Chips
            allowNone
            options={list.map((p) => ({ value: p.code, label: p.name }))}
            value={form.provider || (guessed?.code ?? "")}
            onChange={(provider) => setForm((f) => ({ ...f, provider }))}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {t("airtime.operatorHint", {
              defaultValue:
                "Found from the number; pick one only to change it.",
            })}
          </p>
        </div>
      )}
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

// The last top-up, one tap to fill the form again.
function BuyAgain({ onPick, currency }) {
  const { t } = useTranslation();
  const [last, setLast] = useState(null);
  useEffect(() => {
    loadExtLast({ txnType: "AIRTIME" })
      .then((order) => order?.account && setLast(order))
      .catch(() => {});
  }, []);
  if (!last) return null;
  return (
    <button
      type="button"
      onClick={() => onPick(last)}
      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-ink/40 hover:text-ink"
    >
      <RotateCcw size={13} />
      {t("airtime.again", {
        amount: formatMoney(last.amount, last.currency_code ?? currency),
        number: last.account,
        defaultValue: "Buy again: {{amount}} for {{number}}",
      })}
    </button>
  );
}
