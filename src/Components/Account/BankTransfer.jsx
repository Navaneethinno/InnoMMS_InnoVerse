import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import FilterSelect from "@/Components/Common/FilterSelect";
import TextField from "@/Components/Common/TextField";
import ExtFlow, {
  cleanAmount,
  useProviders,
} from "@/Components/Account/ExtFlow";

// Bank transfer (BANK_OUT). A NIB (21 digits) or an IBAN (MZ59…) finds its
// bank by itself; an account number needs the bank picked.
const EMPTY = { account: "", bank: "", amount: "" };
const kindOf = (account) => {
  const text = account.replace(/\s/g, "").toUpperCase();
  if (/^[A-Z]{2}\d{2}/.test(text)) return "iban";
  if (/^\d{21}$/.test(text)) return "nib";
  return text ? "account_number" : "";
};

export default function BankTransfer() {
  const { t } = useTranslation();
  const { list, problem } = useProviders("BANK");
  const [form, setForm] = useState(EMPTY);
  const account = form.account.replace(/\s/g, "").toUpperCase();
  const kind = kindOf(form.account);
  // Banks taking a plain account number need picking; NIB/IBAN banks find themselves.
  const banks = useMemo(
    () => (list ?? []).filter((b) => b.send !== false),
    [list],
  );
  const bank = banks.find((b) => b.code === form.bank);
  const needBank = kind === "account_number";
  const ready =
    account.length >= 6 &&
    Number(form.amount) > 0 &&
    (!needBank || Boolean(form.bank));
  const request = {
    txn_type: "BANK_OUT",
    to_bank_account: account,
    amount: form.amount,
    ...(form.bank ? { provider: form.bank } : {}),
  };
  const set = (k) => (event) =>
    setForm((f) => ({
      ...f,
      [k]:
        k === "amount" ? cleanAmount(event.target.value) : event.target.value,
    }));

  return (
    <ExtFlow
      title={t("bank.title", { defaultValue: "Bank transfer" })}
      subtitle={t("bank.subtitle", {
        defaultValue: "Send to a bank account by NIB, IBAN or account number.",
      })}
      featureKey="bank_transfer"
      providers={list}
      providersProblem={problem}
      request={request}
      ready={ready}
      onReset={() => setForm(EMPTY)}
      lines={() => [
        [t("ext.type"), t("bank.type", { defaultValue: "Bank transfer" })],
        [t(`bank.kind.${kind || "account_number"}`), account],
        [t("bank.bank", { defaultValue: "Bank" }), bank?.name],
      ]}
    >
      <TextField
        name="account"
        label={t("bank.account", {
          defaultValue: "NIB, IBAN or account number",
        })}
        autoComplete="off"
        value={form.account}
        onChange={set("account")}
        placeholder="0008 0000 1234 5678 9012 2"
      />
      {kind && (
        <p className="-mt-3 text-xs text-slate-500">
          {kind === "account_number"
            ? t("bank.hintAccount", {
                defaultValue: "An account number: pick the bank below.",
              })
            : t("bank.hintFound", {
                kind: t(`bank.kind.${kind}`),
                defaultValue: "A {{kind}}: we find the bank from it.",
              })}
        </p>
      )}
      {banks.length > 0 && (
        <FilterSelect
          label={
            needBank
              ? t("bank.bank")
              : t("bank.bankOptional", { defaultValue: "Bank (optional)" })
          }
          placeholder={t("bank.pickBank", { defaultValue: "Choose the bank" })}
          clearable
          value={form.bank}
          onChange={(value) => setForm((f) => ({ ...f, bank: value }))}
          options={banks.map((b) => ({
            value: b.code,
            label: b.name,
            description: b.fields?.[0]?.key
              ? t(`bank.kind.${b.fields[0].key}`, {
                  defaultValue: b.fields[0].key,
                })
              : undefined,
          }))}
        />
      )}
      <TextField
        name="amount"
        inputMode="decimal"
        label={t("send.amount")}
        value={form.amount}
        onChange={set("amount")}
      />
    </ExtFlow>
  );
}
