import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Search } from "lucide-react";
import Button from "@/Components/Common/Button";
import FilterSelect from "@/Components/Common/FilterSelect";
import TextField from "@/Components/Common/TextField";
import ExtFlow, {
  Chips,
  Line,
  cleanAmount,
  useProviders,
} from "@/Components/Account/ExtFlow";
import { lookupBill } from "@/Services/Account/account.api";
import { formatMoney } from "@/Utils/Lib/format";

// Pay bills (BILL_PAYMENT). The billers (providers of kind BILLER) come
// grouped by category; each biller's `services` draw the form:
//   account_types  the identifiers to choose from (then one is typed)
//   fields         more inputs (TEXT, NUMBER, PHONE, DATE, NUIT, PLATE, SELECT)
//   amount         DUE (from account/bill_lookup; `partial` allows less),
//                  ENTERED (typed), PRODUCT (a package from `products`)
//   lookup         look the bill up before paying
const CATEGORIES = [
  "TV",
  "WATER",
  "INSURANCE",
  "INSS",
  "TAX",
  "UNIVERSITY",
  "LAM",
  "GAS",
  "BETTING",
  "OTHER",
];
const idOf = (x) =>
  typeof x === "string" ? x : (x?.code ?? x?.key ?? x?.value ?? x?.id);
const nameOf = (x) =>
  typeof x === "string" ? x : (x?.name ?? x?.label ?? idOf(x));
const listOf = (value) =>
  Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([code, v]) => ({ code, ...v }))
      : [];
const modeOf = (service) =>
  (typeof service?.amount === "string"
    ? service.amount
    : (service?.amount?.mode ?? service?.amount_mode ?? "ENTERED")
  ).toUpperCase();
const priceOf = (product) => product?.amount ?? product?.price;
// "DStv Compact, 1 mês".
const productName = (product) =>
  [nameOf(product), product?.option].filter(Boolean).join(", ");
// A field's optional `pattern` (the server checks it too).
export const fitsPattern = (field, value) => {
  if (!field?.pattern || !String(value ?? "").trim()) return true;
  try {
    return new RegExp(field.pattern).test(String(value).trim());
  } catch {
    return true;
  }
};
const INPUT_MODE = { NUMBER: "numeric", PHONE: "tel", NUIT: "numeric" };
const EMPTY = {
  biller: "",
  service: "",
  accountType: "",
  account: "",
  product: "",
  fields: {},
  amount: "",
};

export default function Bills() {
  const { t } = useTranslation();
  const { list, problem } = useProviders("BILLER");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [bill, setBill] = useState(null);
  const [lookup, setLookup] = useState({ pending: false, problem: "" });

  const billers = useMemo(() => list ?? [], [list]);
  const categories = useMemo(() => {
    const present = new Set(billers.map((b) => b.category ?? "OTHER"));
    return [
      ...CATEGORIES.filter((c) => present.has(c)),
      ...[...present].filter((c) => !CATEGORIES.includes(c)),
    ];
  }, [billers]);
  const shown = billers.filter(
    (b) =>
      (!category || (b.category ?? "OTHER") === category) &&
      (!query.trim() ||
        nameOf(b).toLowerCase().includes(query.trim().toLowerCase())),
  );

  const biller = billers.find((b) => b.code === form.biller);
  const services = listOf(biller?.services);
  const service =
    services.find((s) => idOf(s) === form.service) ??
    (services.length === 1 ? services[0] : null);
  const accountTypes = listOf(service?.account_types);
  const accountType =
    accountTypes.find((a) => idOf(a) === form.accountType) ??
    (accountTypes.length === 1 ? accountTypes[0] : null);
  const fields = listOf(service?.fields);
  const products = listOf(service?.products);
  const product = products.find((p) => idOf(p) === form.product);
  const mode = modeOf(service);
  // `lookup` (and `partial`, `token`) are left out when false.
  const mustLookUp = service?.lookup === true;
  const currency = biller?.currency_code;

  const billBody = {
    provider: form.biller,
    service: idOf(service) ?? "",
    account_type: idOf(accountType) ?? "",
    bill_account: form.account.trim(),
    product: idOf(product) ?? "",
    fields: form.fields,
  };
  const amount =
    mode === "PRODUCT" ? String(priceOf(product) ?? "") : form.amount;
  const fieldsDone = fields.every(
    (f) =>
      (!f.required || String(form.fields[idOf(f)] ?? "").trim()) &&
      fitsPattern(f, form.fields[idOf(f)]),
  );
  const accountOk = fitsPattern(accountType, form.account);
  const ready =
    Boolean(service) &&
    (!accountTypes.length || Boolean(accountType)) &&
    form.account.trim().length > 0 &&
    accountOk &&
    fieldsDone &&
    (!mustLookUp || Boolean(bill)) &&
    (mode === "PRODUCT" ? Boolean(product) : Number(amount) > 0);

  // Anything that names the bill changes: look it up again.
  const change = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setBill(null);
    setLookup({ pending: false, problem: "" });
  };
  const pickBiller = (code) => change({ ...EMPTY, biller: code });
  const doLookup = () => {
    setLookup({ pending: true, problem: "" });
    lookupBill(billBody)
      .then((result) => {
        setBill(result ?? {});
        setLookup({ pending: false, problem: "" });
        if (result?.amount_due != null)
          setForm((f) => ({ ...f, amount: String(result.amount_due) }));
      })
      .catch((error) => setLookup({ pending: false, problem: error.message }));
  };
  const partial = bill?.partial ?? false;

  return (
    <ExtFlow
      title={t("bills.title", { defaultValue: "Pay bills" })}
      subtitle={t("bills.subtitle", {
        defaultValue:
          "TV, water, insurance, INSS, taxes, university fees and more.",
      })}
      featureKey="bills"
      providers={list}
      providersProblem={problem}
      request={{ txn_type: "BILL_PAYMENT", amount, ...billBody }}
      ready={ready}
      noFee={false}
      onReset={() => {
        setForm(EMPTY);
        setBill(null);
      }}
      lines={() => [
        [t("bills.biller", { defaultValue: "Biller" }), nameOf(biller)],
        [
          t("bills.service", { defaultValue: "Service" }),
          services.length > 1 ? nameOf(service) : null,
        ],
        [
          accountType
            ? nameOf(accountType)
            : t("bills.account", { defaultValue: "Account" }),
          form.account.trim(),
        ],
        [
          t("bills.accountName", { defaultValue: "Account holder" }),
          bill?.account_name,
        ],
        [
          t("bills.product", { defaultValue: "Package" }),
          product ? productName(product) : null,
        ],
        ...fields
          .filter((f) => form.fields[idOf(f)])
          .map((f) => [nameOf(f), fieldText(f, form.fields[idOf(f)])]),
      ]}
    >
      {!biller ? (
        <div className="space-y-4">
          {categories.length > 1 && (
            <Chips
              options={[
                { value: "", label: t("bills.all", { defaultValue: "All" }) },
                ...categories.map((c) => ({
                  value: c,
                  label: t(`bills.category.${c}`, { defaultValue: c }),
                })),
              ]}
              value={category}
              onChange={setCategory}
            />
          )}
          {billers.length > 8 && (
            <label className="relative block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("bills.search", {
                  defaultValue: "Search billers",
                })}
                aria-label={t("bills.search", {
                  defaultValue: "Search billers",
                })}
                className="w-full rounded-xl border border-slate-200 bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/10"
              />
            </label>
          )}
          <div className="grid max-h-[26rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {shown.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => pickBiller(b.code)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-ink/40 hover:bg-ink/5"
              >
                <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-lime">
                  {nameOf(b).slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800">
                    {nameOf(b)}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {t(`bills.category.${b.category ?? "OTHER"}`, {
                      defaultValue: b.category ?? "",
                    })}
                  </span>
                </span>
              </button>
            ))}
            {!shown.length && (
              <p className="col-span-full py-6 text-center text-sm text-slate-500">
                {t("list.noMatches", { query })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink/5 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-800">
                {nameOf(biller)}
              </p>
              <p className="text-xs text-slate-500">
                {t(`bills.category.${biller.category ?? "OTHER"}`, {
                  defaultValue: biller.category ?? "",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => pickBiller("")}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink"
            >
              <ChevronLeft size={14} />
              {t("bills.change", { defaultValue: "Change" })}
            </button>
          </div>
          {services.length > 1 && (
            <FilterSelect
              label={t("bills.service")}
              placeholder={t("bills.pickService", {
                defaultValue: "Choose the service",
              })}
              value={form.service}
              onChange={(v) =>
                change({ service: v, accountType: "", product: "", fields: {} })
              }
              options={services.map((s) => ({
                value: idOf(s),
                label: nameOf(s),
              }))}
            />
          )}
          {service && (
            <>
              {accountTypes.length > 1 && (
                <FilterSelect
                  label={t("bills.accountType", {
                    defaultValue: "Identify by",
                  })}
                  placeholder={t("bills.pickType", { defaultValue: "Choose" })}
                  value={form.accountType}
                  onChange={(v) => change({ accountType: v })}
                  options={accountTypes.map((a) => ({
                    value: idOf(a),
                    label: nameOf(a),
                  }))}
                />
              )}
              <TextField
                name="billAccount"
                autoComplete="off"
                label={accountType ? nameOf(accountType) : t("bills.account")}
                inputMode={
                  INPUT_MODE[String(accountType?.type ?? "").toUpperCase()]
                }
                value={form.account}
                onChange={(event) => change({ account: event.target.value })}
                error={
                  accountOk
                    ? undefined
                    : t("bills.invalid", { defaultValue: "Check this value." })
                }
              />
              {fields.map((f) => (
                <BillField
                  key={idOf(f)}
                  field={f}
                  value={form.fields[idOf(f)] ?? ""}
                  onChange={(v) =>
                    change({ fields: { ...form.fields, [idOf(f)]: v } })
                  }
                />
              ))}
              {mustLookUp && !bill && (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    pending={lookup.pending}
                    disabled={!form.account.trim() || !fieldsDone}
                    onClick={doLookup}
                  >
                    {t("bills.lookUp", { defaultValue: "Look up the bill" })}
                  </Button>
                  {lookup.problem && (
                    <p className="mt-2 text-xs text-red-600">
                      {lookup.problem}
                    </p>
                  )}
                </div>
              )}
              {bill && (
                <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-sm">
                  {bill.account_name && (
                    <Line label={t("bills.accountName")}>
                      {bill.account_name}
                    </Line>
                  )}
                  {bill.amount_due != null && (
                    <Line
                      label={t("bills.due", { defaultValue: "Total to pay" })}
                      strong
                    >
                      {formatMoney(bill.amount_due, currency)}
                    </Line>
                  )}
                  {Object.entries(bill.details ?? {})
                    .filter(([, v]) => v != null && typeof v !== "object")
                    .slice(0, 8)
                    .map(([k, v]) => (
                      <Line
                        key={k}
                        label={t(`bills.detail.${k}`, {
                          defaultValue: k.replace(/_/g, " "),
                        })}
                      >
                        {String(v)}
                      </Line>
                    ))}
                </dl>
              )}
              {mode === "PRODUCT" && (
                <FilterSelect
                  label={t("bills.product")}
                  placeholder={t("bills.pickProduct", {
                    defaultValue: "Choose a package",
                  })}
                  value={form.product}
                  onChange={(v) => setForm((f) => ({ ...f, product: v }))}
                  options={products.map((p) => ({
                    value: idOf(p),
                    label: productName(p),
                    description:
                      priceOf(p) != null
                        ? formatMoney(priceOf(p), currency)
                        : undefined,
                  }))}
                />
              )}
              {(mode === "ENTERED" || (mode === "DUE" && bill && partial)) && (
                <TextField
                  name="amount"
                  inputMode="decimal"
                  label={t("send.amount")}
                  value={form.amount}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      amount: cleanAmount(event.target.value),
                    }))
                  }
                />
              )}
              {mode === "DUE" && bill && partial && (
                <p className="-mt-3 text-xs text-slate-500">
                  {t("bills.partialHint", {
                    defaultValue: "You can pay part of it.",
                  })}
                </p>
              )}
            </>
          )}
        </>
      )}
    </ExtFlow>
  );
}

const fieldText = (field, value) => {
  const option = listOf(field.options).find(
    (o) => String(idOf(o)) === String(value),
  );
  return option ? nameOf(option) : value;
};

function BillField({ field, value, onChange }) {
  const { t } = useTranslation();
  const type = String(field.type ?? "TEXT").toUpperCase();
  const label = `${nameOf(field)}${field.required ? "" : ` ${t("bills.optional", { defaultValue: "(optional)" })}`}`;
  if (type === "SELECT") {
    return (
      <FilterSelect
        label={label}
        placeholder={t("bills.pickType")}
        value={value}
        onChange={onChange}
        options={listOf(field.options).map((o) => ({
          value: String(idOf(o)),
          label: nameOf(o),
        }))}
      />
    );
  }
  return (
    <TextField
      name={`field-${idOf(field)}`}
      type={type === "DATE" ? "date" : "text"}
      inputMode={INPUT_MODE[type]}
      autoComplete="off"
      label={label}
      error={fitsPattern(field, value) ? undefined : t("bills.invalid")}
      value={value}
      onChange={(event) =>
        onChange(
          type === "PLATE"
            ? event.target.value.toUpperCase()
            : event.target.value,
        )
      }
    />
  );
}
