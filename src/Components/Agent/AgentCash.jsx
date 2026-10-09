import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Banknote,
  HandCoins,
  Send as SendIcon,
  Smartphone,
} from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FitText from "@/Components/Common/FitText";
import PhoneField from "@/Components/Common/PhoneField";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { useWalletChanged } from "@/Services/api/liveUpdates";
import { quotePayment, sendPayment } from "@/Services/Account/account.api";
import { loadFloat } from "@/Services/Agent/agent.api";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import { isSuperAgent } from "@/Utils/Lib/roles";
import PosReceipt from "@/Components/Account/PosReceipt";

// Cash In / Out for agents and super agents (Agents, stores and POS, phases 2-3).
// Every action moves the AGENT wallet (float), never the agent's own money:
//  - Cash in (AGENT_CASH_IN): the customer hands over cash, the float pays
//    their wallet. The agent approves with their own PIN.
//  - Cash out (AGENT_CASH_OUT): the customer's wallet pays the float and the
//    agent hands over cash. The customer approves by typing THEIR OWN PIN on
//    this device (the agent's PIN is not asked); the PIN is never kept.
//  - Send float (AGENT_FLOAT_TRANSFER): super agent -> its agents, or an agent
//    back to its super agent.
// Each goes form -> account/quote (the confirm screen, with the fee and the
// agent's commission) -> account/send, with one client_reference per attempt.
const ACTIONS = {
  cashIn: { txnType: "AGENT_CASH_IN", icon: ArrowDownToLine },
  cashOut: { txnType: "AGENT_CASH_OUT", icon: ArrowUpFromLine },
  float: { txnType: "AGENT_FLOAT_TRANSFER", icon: SendIcon },
};
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

// What the agent earns on this transaction: the server's `agent_earns` (the
// shares paid to the serving agent, a super agent's share included when nobody
// is above them).
function earnedOf(quote) {
  const earned = Number(quote?.agent_earns);
  return Number.isFinite(earned) && earned > 0 ? quote.agent_earns : null;
}

export default function AgentCash() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const portalPolicy = usePortalPolicy();
  const [searchParams, setSearchParams] = useSearchParams();
  // Float moves only inside a network: a super agent, or an agent with one.
  const canSendFloat = isSuperAgent(user) || Boolean(user?.superAgent);
  const initialTab = searchParams.get("tab");
  const [mode, setMode] = useState(
    ACTIONS[initialTab] && (initialTab !== "float" || canSendFloat)
      ? initialTab
      : "cashIn",
  );
  const [float, setFloat] = useState(null);
  const [floatProblem, setFloatProblem] = useState("");
  const [form, setForm] = useState({
    phone: searchParams.get("to") ?? "",
    amount: "",
    note: "",
  });
  const [quote, setQuote] = useState(null);
  // Cash-out: "confirm" (the agent checks) -> "customer" (the device is handed over).
  const [step, setStep] = useState("confirm");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);
  const action = ACTIONS[mode];
  const cashOut = mode === "cashOut";

  const refreshFloat = useCallback(
    () =>
      loadFloat()
        .then((wallet) => {
          setFloat(wallet);
          setFloatProblem("");
        })
        .catch((error) => setFloatProblem(error.message)),
    [],
  );
  useEffect(() => void refreshFloat(), [refreshFloat]);
  useWalletChanged(() => void refreshFloat());

  const fail = (error) => {
    setProblem(error.message);
    scrollToTop();
  };

  const switchMode = (next) => {
    setMode(next);
    setProblem("");
    setForm({ phone: "", amount: "", note: "" });
    if (searchParams.toString()) setSearchParams({}, { replace: true });
  };

  // Who the money is about: the customer (cash in and cash out both name them
  // with customer_phone_number) or, for float, the other agent.
  const target = () => {
    const phone = form.phone.trim();
    return mode === "float"
      ? { txnType: action.txnType, toPhone: phone }
      : { txnType: action.txnType, customerPhone: phone };
  };

  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const next = await quotePayment({ ...target(), amount: form.amount });
      setQuote(next);
      setStep("confirm");
      setPin("");
      reference.current = newReference();
      scrollToTop();
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  };

  const send = async () => {
    setPending(true);
    setProblem("");
    try {
      const result = await sendPayment({
        ...target(),
        amount: form.amount,
        clientReference: reference.current,
        // The price guard: nothing is posted if the fee changed since the quote.
        expectedCharge: quote.fee?.total_charge,
        // Cash-out: the customer's PIN. Otherwise the agent's, when asked.
        ...(cashOut
          ? { customerPin: pin }
          : { pin: quote.pin_required ? pin : "" }),
        note: form.note.trim(),
      });
      setDone(result);
      void refreshFloat();
      scrollToTop();
    } catch (error) {
      fail(error);
      if (error.errorCode === "txn.quote_changed") {
        // The fee changed (nothing was posted): the agent checks the new
        // figures, as a new attempt.
        try {
          setQuote(await quotePayment({ ...target(), amount: form.amount }));
          reference.current = newReference();
        } catch {
          setQuote(null);
        }
        setStep("confirm");
      } else if (error.errorCode !== "portal.pin_wrong") {
        // A wrong PIN can be typed again; anything else goes back to the agent.
        setStep("confirm");
      }
    } finally {
      // The PIN is never kept after the call, right or wrong.
      setPin("");
      setPending(false);
    }
  };

  const again = () => {
    setForm({ phone: "", amount: "", note: "" });
    setQuote(null);
    setDone(null);
    setStep("confirm");
    setPin("");
    reference.current = null;
  };

  const tabs = [
    { key: "cashIn", label: t("agent.cashIn", { defaultValue: "Cash in" }) },
    { key: "cashOut", label: t("agent.cashOut", { defaultValue: "Cash out" }) },
    ...(canSendFloat
      ? [
          {
            key: "float",
            label: t("agent.sendFloat", { defaultValue: "Send float" }),
          },
        ]
      : []),
  ];
  const heading = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          {t("agent.title", { defaultValue: "Cash in / out" })}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("agent.subtitle", {
            defaultValue: "Serve customers with your agent wallet.",
          })}
        </p>
      </div>
      {!quote && !done && (
        <SegmentedTabs items={tabs} value={mode} onChange={switchMode} />
      )}
    </div>
  );
  const errorBox = problem && (
    <div className="mb-5 max-w-6xl">
      <ErrorState message={problem} />
    </div>
  );
  const floatCard = (
    <aside className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-lime shadow-md">
          <Banknote size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {t("wallet.purpose.AGENT_FLOAT", { defaultValue: "Agent wallet" })}
          </p>
          {float?.acct_num && (
            <p className="break-all text-xs text-slate-500">{float.acct_num}</p>
          )}
        </div>
      </div>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        {t("send.available")}
      </p>
      {float ? (
        <FitText
          max={28}
          min={12}
          className="mt-1 font-black tracking-tight text-slate-800"
        >
          {formatMoney(float.avail_bal, float.currency_code)}
        </FitText>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          {floatProblem || t("common.loading")}
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-slate-500">
        {t("agent.floatHint", {
          defaultValue:
            "The agent wallet holds e-money for your customers. It is used only for cash in, cash out and float, never for your own payments.",
        })}
      </p>
    </aside>
  );

  if (done) {
    return (
      <PosReceipt
        transaction={receiptToTransaction(done.receipt, {
          quote,
          user,
          rrn: done.rrn,
          note: form.note.trim(),
        })}
        note={
          done.replayed
            ? t("send.replayed")
            : cashOut
              ? t("agent.handOverCash", {
                  amount: formatMoney(quote.amount, quote.currency_code),
                  name: quote.from?.name,
                  defaultValue:
                    "Done. Hand {{amount}} in cash to {{name}} now.",
                })
              : mode === "cashIn"
                ? t("agent.cashInDone", {
                    amount: formatMoney(quote.amount, quote.currency_code),
                    name: quote.to?.name,
                    defaultValue: "{{amount}} is in {{name}}'s wallet.",
                  })
                : null
        }
        className="py-2"
      >
        <Button onClick={again}>
          {t("agent.again", { defaultValue: "Serve another customer" })}
        </Button>
        <Link
          to="/history"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-5 py-3.5 text-sm font-semibold text-ink hover:bg-slate-50"
        >
          {t("send.viewHistory")}
        </Link>
      </PosReceipt>
    );
  }

  if (quote) {
    const fee = quote.fee ?? {};
    const money = (value) => formatMoney(value, quote.currency_code);
    const amount = money(quote.amount);
    const customer = cashOut ? quote.from?.name : quote.to?.name;
    const earned = earnedOf(quote);
    const charged = fee.total_charge != null && Number(fee.total_charge) !== 0;
    // What the agent does, in one sentence.
    const instruction =
      mode === "cashIn"
        ? t("agent.cashInConfirm", {
            amount,
            name: customer,
            defaultValue:
              "Take {{amount}} in cash from {{name}} and send it to their wallet.",
          })
        : cashOut
          ? t("agent.cashOutConfirm", {
              amount,
              name: customer,
              defaultValue:
                "{{name}} takes out {{amount}} in cash. Hand over the cash only after it succeeds.",
            })
          : t("agent.floatConfirm", {
              amount,
              name: customer,
              defaultValue: "Send {{amount}} of float to {{name}}.",
            });
    const pinNeeded = cashOut || quote.pin_required;
    const pinShort = pinNeeded && pin.length < pinRules.entryMin;

    // Cash-out, second step: the device is with the customer.
    if (cashOut && step === "customer") {
      return (
        <div>
          {heading}
          {errorBox}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending && !pinShort) void send();
            }}
            className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-surface p-6 text-center shadow-sm"
          >
            <span className="brand-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-lime">
              <Smartphone size={22} />
            </span>
            <p className="mt-4 text-lg font-black text-slate-800">
              {t("agent.customerPinPrompt", {
                name: customer,
                amount,
                defaultValue: "{{name}}, enter your PIN to take out {{amount}}",
              })}
            </p>
            {charged && fee.pay_from !== "RECEIVER" && (
              <p className="mt-2 text-sm text-slate-500">
                {t("agent.customerFee", {
                  fee: money(fee.total_charge),
                  total: money(quote.total_debit),
                  defaultValue:
                    "Fee: {{fee}}, total from your wallet: {{total}}",
                })}
              </p>
            )}
            <div className="mt-5 text-left">
              <TextField
                name="customer_pin"
                type="password"
                autoFocus
                maxLength={pinRules.maxLength}
                inputMode={pinRules.letters ? undefined : "numeric"}
                autoComplete="off"
                label={t("agent.customerPin", {
                  defaultValue: "Customer's PIN",
                })}
                value={pin}
                onChange={(event) =>
                  setPin(sanitizePin(pinRules, event.target.value))
                }
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setPin("");
                  setStep("confirm");
                }}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink"
              >
                {t("send.back")}
              </button>
              <Button
                type="submit"
                pending={pending}
                disabled={pinShort}
                className="px-8"
              >
                {t("agent.approve", { defaultValue: "Approve" })}
              </Button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div>
        {heading}
        {errorBox}
        <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              if (cashOut) {
                setProblem("");
                setStep("customer");
              } else if (!pinShort) void send();
            }}
            className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t("send.confirm")}
            </p>
            <FitText className="mt-2 font-black tracking-tight text-slate-800">
              {amount}
            </FitText>
            <p className="mt-1 text-sm text-slate-500">
              {quote.txn_type_name} · {customer}
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink/5 px-3 py-2.5 text-sm font-medium text-ink">
              <HandCoins size={16} className="mt-0.5 shrink-0" />
              {instruction}
            </p>
            <dl className="mt-5 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">{t("send.from")}</dt>
                <dd className="text-right text-slate-800">
                  {[quote.from?.name, quote.from?.acct_num]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">{t("send.to")}</dt>
                <dd className="text-right text-slate-800">
                  {[quote.to?.name, quote.to?.acct_num]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
              {charged && (
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">
                    {fee.fee_name ?? t("send.fee")}
                  </dt>
                  <dd className="text-slate-800">{money(fee.total_charge)}</dd>
                </div>
              )}
              <div className="flex justify-between py-2 font-bold">
                <dt className="text-slate-700">
                  {cashOut
                    ? t("agent.customerPays", {
                        defaultValue: "Total from the customer's wallet",
                      })
                    : t("send.total")}
                </dt>
                <dd className="text-slate-800">{money(quote.total_debit)}</dd>
              </div>
              {quote.net_credit != null && (
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">{t("send.theyGet")}</dt>
                  <dd className="text-slate-800">{money(quote.net_credit)}</dd>
                </div>
              )}
              {earned != null && (
                <div className="flex justify-between py-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <dt>{t("agent.youEarn", { defaultValue: "You earn" })}</dt>
                  <dd>{money(earned)}</dd>
                </div>
              )}
            </dl>
            {earned != null && (
              <p className="mt-1 text-xs text-slate-500">
                {t("agent.commissionNote", {
                  defaultValue:
                    "Commission is paid into your own wallet, not the agent wallet.",
                })}
              </p>
            )}
            {!cashOut && quote.pin_required && (
              <div className="mt-5">
                <TextField
                  name="pin"
                  type="password"
                  maxLength={pinRules.maxLength}
                  inputMode={pinRules.letters ? undefined : "numeric"}
                  autoComplete="off"
                  label={t("send.enterPin")}
                  value={pin}
                  onChange={(event) =>
                    setPin(sanitizePin(pinRules, event.target.value))
                  }
                />
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setQuote(null)}
                disabled={pending}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink"
              >
                {t("send.back")}
              </button>
              <Button
                type="submit"
                pending={pending}
                disabled={!cashOut && pinShort}
                className="px-8"
              >
                {cashOut
                  ? t("agent.handToCustomer", {
                      defaultValue: "Hand the device to the customer",
                    })
                  : t("send.send")}
                {!pending && <ArrowRight size={16} />}
              </Button>
            </div>
          </form>
          {floatCard}
        </div>
      </div>
    );
  }

  const phoneLabel =
    mode === "float"
      ? isSuperAgent(user)
        ? t("agent.agentNumber", { defaultValue: "Your agent's number" })
        : t("agent.superAgentNumber", {
            defaultValue: "Your super agent's number",
          })
      : t("agent.customerNumber", { defaultValue: "Customer's number" });
  const Icon = action.icon;
  return (
    <div>
      {heading}
      {errorBox}
      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
        <form
          noValidate
          onSubmit={review}
          className="space-y-5 rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm"
        >
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Icon size={16} className="shrink-0 text-ink" />
            {mode === "cashIn"
              ? t("agent.cashInHint", {
                  defaultValue:
                    "The customer gives you cash; the same amount goes from your agent wallet to theirs.",
                })
              : cashOut
                ? t("agent.cashOutHint", {
                    defaultValue:
                      "The customer's wallet pays your agent wallet and you hand over cash. They approve with their own PIN.",
                  })
                : t("agent.floatHintTransfer", {
                    defaultValue:
                      "Float moves only between a super agent and its own agents.",
                  })}
          </p>
          <PhoneField
            name="phone"
            label={phoneLabel}
            countries={portalPolicy.phone.countries}
            value={form.phone}
            onChange={(value) =>
              setForm((previous) => ({ ...previous, phone: value }))
            }
          />
          <TextField
            name="amount"
            label={t("send.amount")}
            inputMode="decimal"
            autoComplete="off"
            value={form.amount}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                amount: event.target.value.replace(/[^\d.]/g, ""),
              }))
            }
          />
          <TextField
            name="note"
            label={t("send.note")}
            maxLength={255}
            autoComplete="off"
            value={form.note}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, note: event.target.value }))
            }
          />
          <Button
            type="submit"
            pending={pending}
            disabled={
              form.phone.replace(/\D/g, "").length < 7 || !Number(form.amount)
            }
            className="w-full"
          >
            {t("send.review")}
            {!pending && <ArrowRight size={16} />}
          </Button>
        </form>
        {floatCard}
      </div>
    </div>
  );
}
