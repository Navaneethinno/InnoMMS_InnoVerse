import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Printer } from "lucide-react";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import { loadMyCode } from "@/Services/Account/account.api";
import { isStaff } from "@/Utils/Lib/roles";

// The merchant's 7-digit Paga-Daki code, large and as a QR code, to show at
// the counter: customers type it to pay (and, at an agent, to take out cash).
export default function MyCode() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const [code, setCode] = useState(null);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState(false);
  const staff = isStaff(user);

  useEffect(() => {
    if (staff) return;
    loadMyCode()
      .then((result) =>
        setCode(result?.merchant_code ? String(result.merchant_code) : ""),
      )
      .catch((error) => {
        setCode("");
        setProblem(error.message);
      });
  }, [staff]);

  const heading = (
    <div className="mb-6 print:hidden">
      <h1 className="text-2xl font-black tracking-tight text-slate-800">
        {t("myCode.title", { defaultValue: "My Paga-Daki code" })}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {t("myCode.subtitle", {
          defaultValue: "Customers type this code in their app to pay you.",
        })}
      </p>
    </div>
  );
  if (staff) {
    return (
      <div>
        {heading}
        <ErrorState message={t("ext.ownerOnlyAll")} />
      </div>
    );
  }
  if (code == null) return <LoadingState />;
  if (!code) {
    return (
      <div>
        {heading}
        <ErrorState
          message={
            problem ||
            t("myCode.none", {
              defaultValue: "You don't have a Paga-Daki code yet.",
            })
          }
        />
      </div>
    );
  }
  const spaced =
    code.length === 7 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  const copy = () =>
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  const isAgent = (user?.roles ?? []).some(
    (r) => String(r?.code ?? r).toUpperCase() === "AGENT",
  );

  return (
    <div>
      {heading}
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-surface p-6 text-center shadow-sm sm:p-8 print:border-0 print:shadow-none">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t("myCode.label", { defaultValue: "Pay with Paga-Daki" })}
        </p>
        {user?.name && (
          <p className="mt-1 text-lg font-black text-slate-800">{user.name}</p>
        )}
        <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
          <QRCodeSVG
            value={code}
            size={208}
            level="M"
            marginSize={0}
            className="h-auto w-48 sm:w-52"
          />
        </div>
        <p className="mt-5 font-mono text-5xl font-black tracking-[0.15em] text-slate-800 sm:text-6xl">
          {spaced}
        </p>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">
          {isAgent
            ? t("myCode.hintAgent", {
                defaultValue:
                  "Customers choose “Pay merchant Paga-Daki” and type this code, or use it to withdraw cash with you.",
              })
            : t("myCode.hint", {
                defaultValue:
                  "Customers choose “Pay merchant Paga-Daki” in their app and type this code.",
              })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-ink hover:bg-ink/5"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t("ext.copied") : t("ext.copy")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-forest/90 dark:bg-lime dark:text-on-secondary"
          >
            <Printer size={16} />
            {t("myCode.print", { defaultValue: "Print for the counter" })}
          </button>
        </div>
      </div>
    </div>
  );
}
