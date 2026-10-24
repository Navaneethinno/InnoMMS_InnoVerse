import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import Button from "@/Components/Common/Button";
import CheckboxPill from "@/Components/Common/CheckboxPill";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { ListSearch, NoMatches, ShowMore } from "@/Components/Common/ListControls";
import { useListControls } from "@/Hooks/Common/useListControls";
import { deletePosProfile, savePosProfile, setPosProfileActive } from "@/Services/Pos/pos.api";
import { formatMoney } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";
import { ActiveToggle, DeleteButton, Pill, StatusPill } from "./posShared";

// Terminal profiles (owner): the transactions a store user may make on a
// terminal, each with optional limits, and daily totals per direction. A
// change applies from the user's next transaction.
const DIRECTIONS = ["DEBIT", "CREDIT"];
const typeName = (t, type) => t(`pos.txn.${type}`, { defaultValue: type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) });
const directionName = (t, direction) => t(`pos.direction.${direction}`, { defaultValue: { DEBIT: "Money out", CREDIT: "Money in", NONE: "No money" }[direction] ?? direction });
const asText = (value) => (value == null ? "" : String(value));
const orNull = (value) => (value === "" ? null : value);

export function ProfileDialog({ profile, txnTypes, currencies, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = Boolean(profile?.id);
  const [form, setForm] = useState(() => ({
    name: profile?.name ?? "",
    currency_code: profile?.currency_code ?? "",
    daily_debit_limit: asText(profile?.daily_debit_limit),
    daily_credit_limit: asText(profile?.daily_credit_limit),
    manager_assignable: profile?.manager_assignable ?? false,
    transactions: (profile?.transactions ?? []).map((row) => ({ txn_type: row.txn_type, max_amount: asText(row.max_amount), daily_amount: asText(row.daily_amount), daily_count: asText(row.daily_count) })),
  }));
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const decimals = profile?.currency_decimals ?? 2;
  const amount = new RegExp(`^\\d+${decimals ? `(\\.\\d{1,${decimals}})?` : ""}$`);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const setRow = (i, patch) => set("transactions", form.transactions.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const typeOf = (type) => txnTypes.find((x) => x.txn_type === type);
  const unused = txnTypes.filter((x) => !form.transactions.some((row) => row.txn_type === x.txn_type));
  const typesOf = (direction) => txnTypes.filter((x) => x.direction === direction).map((x) => typeName(t, x.txn_type)).join(", ");
  // Totals may be 0 (nothing in that direction); a transaction's limits are above 0.
  const badTotal = (value) => value !== "" && !amount.test(value);
  const badAmount = (value) => value !== "" && (!amount.test(value) || Number(value) <= 0);
  const badCount = (value) => value !== "" && !(/^\d+$/.test(value) && Number(value) > 0);
  const invalid = !form.name.trim() || badTotal(form.daily_debit_limit) || badTotal(form.daily_credit_limit) || form.transactions.some((row) => badAmount(row.max_amount) || badAmount(row.daily_amount) || badCount(row.daily_count));
  const amountRule = t("pos.amountRule", { places: decimals, defaultValue: "An amount above 0, with up to {{places}} decimal places." });
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      await savePosProfile({
        ...(editing ? { id: profile.id } : {}),
        name: form.name.trim(),
        ...(form.currency_code ? { currency_code: form.currency_code } : {}),
        daily_debit_limit: orNull(form.daily_debit_limit),
        daily_credit_limit: orNull(form.daily_credit_limit),
        manager_assignable: form.manager_assignable,
        // Only the limits a type takes; empty means no limit.
        transactions: form.transactions.map((row) => {
          const type = typeOf(row.txn_type);
          return {
            txn_type: row.txn_type,
            ...(type?.amounts ? { max_amount: orNull(row.max_amount), daily_amount: orNull(row.daily_amount) } : {}),
            ...(type?.counted ? { daily_count: row.daily_count === "" ? null : Number(row.daily_count) } : {}),
          };
        }),
      });
      notifications.success(t("pos.profileSaved", { defaultValue: "Profile saved. It applies from each user's next transaction." }));
      onSaved();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  const amountField = (name, label, value, onChange, error) => (
    <TextField name={name} inputMode="decimal" label={label} value={value} error={error ? amountRule : undefined} onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))} />
  );
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={pending} size="lg" title={editing ? t("pos.editProfile", { defaultValue: "Edit terminal profile" }) : t("pos.addProfile", { defaultValue: "Add a terminal profile" })}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" maxLength={64} label={t("pos.name", { defaultValue: "Name" })} value={form.name} onChange={(event) => set("name", event.target.value)} />
          {currencies.length > 1 && (
            <FilterSelect
              label={t("pos.currency", { defaultValue: "Currency" })}
              value={form.currency_code}
              onChange={(code) => set("currency_code", code)}
              placeholder={t("pos.mainCurrency", { defaultValue: "Main wallet's currency" })}
              options={currencies.map((code) => ({ value: code, label: code }))}
            />
          )}
          {DIRECTIONS.map((direction) => {
            const key = direction === "DEBIT" ? "daily_debit_limit" : "daily_credit_limit";
            return (
              <div key={direction}>
                <TextField
                  name={key}
                  inputMode="decimal"
                  label={direction === "DEBIT" ? t("pos.dailyDebit", { defaultValue: "Daily money-out limit (empty: no limit)" }) : t("pos.dailyCredit", { defaultValue: "Daily money-in limit (empty: no limit)" })}
                  value={form[key]}
                  error={badTotal(form[key]) ? t("pos.totalRule", { places: decimals, defaultValue: "An amount of 0 or more, with up to {{places}} decimal places." }) : undefined}
                  onChange={(event) => set(key, event.target.value.replace(/[^\d.]/g, ""))}
                />
                <p className="mt-1 text-xs text-slate-500">{t("pos.covers", { types: typesOf(direction), defaultValue: "Covers: {{types}}. 0 allows none." })}</p>
              </div>
            );
          })}
        </div>
        <CheckboxPill label={t("pos.managerAssignable", { defaultValue: "Store managers may give this profile to their cashiers" })} checked={form.manager_assignable} onChange={(event) => set("manager_assignable", event.target.checked)} />
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{t("pos.transactions", { defaultValue: "Transactions allowed" })}</p>
          {!form.transactions.length && <p className="text-xs text-slate-500">{t("pos.noTransactions", { defaultValue: "None yet: a user with this profile can't make any transaction." })}</p>}
          {form.transactions.map((row, i) => {
            const type = typeOf(row.txn_type);
            return (
              <div key={row.txn_type} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {typeName(t, row.txn_type)} <span className="font-normal text-slate-500">· {directionName(t, type?.direction)}</span>
                    </p>
                    {type?.description && <p className="text-xs text-slate-500">{type.description}</p>}
                  </div>
                  <button type="button" aria-label={t("pos.removeTransaction", { defaultValue: "Remove" })} onClick={() => set("transactions", form.transactions.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
                {(type?.amounts || type?.counted) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {type.amounts && amountField(`max_${i}`, t("pos.maxAmount", { defaultValue: "Largest amount" }), row.max_amount, (v) => setRow(i, { max_amount: v }), badAmount(row.max_amount))}
                    {type.amounts && amountField(`daily_${i}`, t("pos.dailyAmount", { defaultValue: "Daily amount" }), row.daily_amount, (v) => setRow(i, { daily_amount: v }), badAmount(row.daily_amount))}
                    {type.counted && (
                      <TextField name={`count_${i}`} inputMode="numeric" label={t("pos.dailyCount", { defaultValue: "Daily count" })} value={row.daily_count} error={badCount(row.daily_count) ? t("pos.countRule", { defaultValue: "A whole number above 0." }) : undefined} onChange={(event) => setRow(i, { daily_count: event.target.value.replace(/\D/g, "") })} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {unused.length > 0 && (
            <FilterSelect
              value=""
              onChange={(txn_type) => txn_type && set("transactions", [...form.transactions, { txn_type, max_amount: "", daily_amount: "", daily_count: "" }])}
              placeholder={t("pos.addTransaction", { defaultValue: "Allow a transaction…" })}
              options={unused.map((x) => ({ value: x.txn_type, label: typeName(t, x.txn_type), description: x.description }))}
            />
          )}
          <p className="text-xs text-slate-500">{t("pos.limitsHint", { defaultValue: "Empty limits mean no limit." })}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" pending={pending} disabled={invalid}>
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// One line per limit that is set: "Largest 5,000.00 · 50 a day".
function limitsText(t, row, currency) {
  return [
    row.max_amount != null && t("pos.maxShort", { amount: formatMoney(row.max_amount, currency), defaultValue: "Up to {{amount}} each" }),
    row.daily_amount != null && t("pos.dailyShort", { amount: formatMoney(row.daily_amount, currency), defaultValue: "{{amount}} a day" }),
    row.daily_count != null && t("pos.countShort", { n: row.daily_count, defaultValue: "{{n}} times a day" }),
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function PosProfiles({ profiles, onEdit, onChanged }) {
  const { t } = useTranslation();
  const list = useListControls(profiles, { textOf: (p) => [p.name, p.currency_code, p.status, ...(p.transactions ?? []).map((row) => row.txn_type)] });
  if (profiles === null) return <LoadingState />;
  if (!profiles.length)
    return (
      <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
        <EmptyState icon={ShieldCheck} title={t("pos.noProfiles", { defaultValue: "No terminal profiles yet" })} description={t("pos.noProfilesHint", { defaultValue: "A profile sets which transactions a store user may make on a terminal, and up to how much." })} />
      </div>
    );
  const total = (value, currency) => (value == null ? t("pos.noLimit", { defaultValue: "no limit" }) : formatMoney(value, currency));
  return (
    <>
      <ListSearch list={list} placeholder={t("pos.searchProfiles", { defaultValue: "Search profiles" })} />
      <NoMatches list={list} />
      <ul className="grid gap-4 md:grid-cols-2">
        {list.visible.map((profile) => (
          <li key={profile.id} className="flex flex-col rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{profile.name}</p>
                <p className="text-xs text-slate-500">
                  {[profile.currency_code, t("pos.userCount", { count: profile.user_count ?? 0, defaultValue: "{{count}} users" })].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="flex shrink-0 gap-1.5">
                {profile.manager_assignable && <Pill tone="bg-ink/5 text-ink">{t("pos.assignable", { defaultValue: "Managers may assign" })}</Pill>}
                <StatusPill status={profile.status} />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              {t("pos.totals", { out: total(profile.daily_debit_limit, profile.currency_code), in: total(profile.daily_credit_limit, profile.currency_code), defaultValue: "Each day: money out {{out}}, money in {{in}}" })}
            </p>
            <ul className="mt-2 space-y-1">
              {(profile.transactions ?? []).map((row) => (
                <li key={row.txn_type} className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{typeName(t, row.txn_type)}</span>
                  {limitsText(t, row, profile.currency_code) && ` · ${limitsText(t, row, profile.currency_code)}`}
                </li>
              ))}
              {!profile.transactions?.length && <li className="text-xs text-slate-500">{t("pos.noTransactionsShort", { defaultValue: "No transactions allowed" })}</li>}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onEdit(profile)} className="px-3 py-2">
                <Pencil size={14} /> {t("stores.editShort", { defaultValue: "Edit" })}
              </Button>
              <ActiveToggle item={profile} onToggle={setPosProfileActive} onDone={onChanged} warning={t("pos.profileOffWarning", { defaultValue: "Users with this profile can't make transactions until you activate it or give them another profile." })} />
              <DeleteButton item={profile} onDelete={deletePosProfile} onDone={onChanged} />
            </div>
          </li>
        ))}
      </ul>
      <ShowMore list={list} />
    </>
  );
}
