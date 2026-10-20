import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import ModeSwitch from "@/Components/Common/ModeSwitch";
import PhoneField from "@/Components/Common/PhoneField";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import ExtFlow, {
  Chips,
  cleanAmount,
  digitsOnly,
  useProviders,
} from "@/Components/Common/Payments/ExtFlow";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { formatMoney } from "@/Utils/Lib/format";

// Mobile money (M-Pesa, e-Mola, mKesh), for the merchant owner, on the shared
// payment flow:
//  - Send (EXT_WALLET_OUT): to a mobile-wallet number. The providers don't say
//    whose a number is, so there is no recipient name.
//  - Top up (EXT_WALLET_IN): pulls from the merchant's own number (or another
//    of theirs); they approve on that phone and the wallet is credited then.
const TXN = { send: "EXT_WALLET_OUT", topUp: "EXT_WALLET_IN" };
const EMPTY = { phone: "", amount: "", other: false };
const QUICK = ["100", "500", "1000", "2500", "5000"];

export default function MobileMoney() {
  const { t } = useTranslation();
  const portalPolicy = usePortalPolicy();
  const { list, problem } = useProviders("MOBILE_WALLET");
  const [mode, setMode] = useState("send");
  const [form, setForm] = useState(EMPTY);
  const sending = mode === "send";

  const offered = (list ?? []).filter((p) => (sending ? p.send : p.top_up));
  const names = offered.map((p) => p.name);
  const namesText =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} ${t("ext.or", { defaultValue: "or" })} ${names.at(-1)}`
      : (names[0] ?? "");
  // The provider the typed number belongs to (the server decides; this lights its chip).
  const digits = digitsOnly(form.phone).replace(/^258/, "");
  const guessed =
    digits.length >= 2
      ? offered.find((p) =>
          (p.prefixes ?? []).some((prefix) => digits.startsWith(prefix)),
        )
      : null;
  const typed = sending || form.other;
  const phone = typed ? form.phone.trim() : "";
  const ready = Number(form.amount) > 0 && (!typed || digits.length >= 9);
  const request = sending
    ? { txn_type: TXN.send, to_phone_number: phone, amount: form.amount }
    : {
        txn_type: TXN.topUp,
        ...(phone ? { from_phone_number: phone } : {}),
        amount: form.amount,
      };
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  return (
    <ExtFlow
      title={t("ext.title", { defaultValue: "Mobile money" })}
      subtitle={
        sending
          ? t("ext.sendSubtitle", { names: namesText })
          : t("ext.topUpSubtitle", { names: namesText })
      }
      switcher={
        <ModeSwitch
          label={t("ext.title")}
          items={[
            {
              key: "send",
              icon: ArrowUpRight,
              label: t("ext.send", { defaultValue: "Send" }),
              description: t("ext.sendHint", {
                defaultValue:
                  "From your wallet to an M-Pesa, e-Mola or mKesh number.",
              }),
            },
            {
              key: "topUp",
              icon: ArrowDownLeft,
              label: t("ext.topUp", { defaultValue: "Top up" }),
              description: t("ext.topUpHint", {
                defaultValue:
                  "Into your wallet from your mobile wallet. You approve on your phone.",
              }),
            },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setForm(EMPTY);
          }}
        />
      }
      featureKey="mobile_money"
      providers={list && offered}
      providersProblem={problem}
      request={request}
      ready={ready}
      credit={!sending}
      onReset={() => setForm(EMPTY)}
      lines={(quote) => [
        [
          t("ext.type"),
          sending
            ? t("ext.typeOut", { provider: quote.external?.provider_name })
            : t("ext.typeIn", { provider: quote.external?.provider_name }),
        ],
        [
          sending ? t("ext.recipient") : t("ext.fromNumber"),
          quote.external?.account,
        ],
        [
          sending ? t("ext.amountOut") : t("ext.amountIn"),
          formatMoney(quote.amount, quote.currency_code),
        ],
      ]}
      texts={
        sending
          ? {
              submit: t("ext.sendNow"),
              confirmHint: t("ext.noName"),
              pendingTitle: () => t("ext.inProgress"),
            }
          : {
              submit: t("ext.requestTopUp"),
              pendingIcon: "phone",
              pendingTitle: (external) =>
                t("ext.approveOnPhone", { provider: external.provider_name }),
              pendingHint: (external, quote) =>
                t("ext.approveHint", {
                  amount: formatMoney(quote?.net_credit, quote?.currency_code),
                  number: external.account,
                }),
              failedTitle: () => t("ext.topUpFailed"),
              failedHint: t("ext.topUpFailedHint"),
            }
      }
    >
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">
          {t("ext.provider", { defaultValue: "Provider" })}
        </p>
        <Chips
          options={offered.map((p) => ({ value: p.code, label: p.name }))}
          highlight={guessed?.code}
        />
        {typed && (
          <p className="mt-1.5 text-xs text-slate-500">
            {t("ext.providerHint", { defaultValue: "Found from the number." })}
          </p>
        )}
      </div>
      {!sending && (
        <SegmentedTabs
          items={[
            {
              key: "own",
              label: t("ext.ownNumber", { defaultValue: "My number" }),
            },
            {
              key: "other",
              label: t("ext.otherNumber", {
                defaultValue: "Another of my numbers",
              }),
            },
          ]}
          value={form.other ? "other" : "own"}
          onChange={(key) => set({ other: key === "other" })}
        />
      )}
      {typed && (
        <PhoneField
          name="phone"
          label={
            sending
              ? t("ext.recipient", { defaultValue: "Recipient number" })
              : t("ext.fromNumber", { defaultValue: "From number" })
          }
          countries={portalPolicy.phone.countries}
          value={form.phone}
          onChange={(value) => set({ phone: value })}
        />
      )}
      <div>
        <TextField
          name="amount"
          inputMode="decimal"
          label={t("send.amount")}
          value={form.amount}
          onChange={(event) => set({ amount: cleanAmount(event.target.value) })}
        />
        <div className="mt-3">
          <Chips
            options={QUICK.map((a) => ({ value: a, label: a }))}
            value={form.amount}
            onChange={(amount) => set({ amount })}
          />
        </div>
      </div>
    </ExtFlow>
  );
}
