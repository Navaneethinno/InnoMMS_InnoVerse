import { createElement, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer, ScanLine, Smartphone, Store } from "lucide-react";
import Button from "@/Components/Common/Button";
import CopyButton from "@/Components/Common/CopyButton";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import PageTitle from "@/Components/Common/PageTitle";
import { loadMyCode } from "@/Services/Account/account.api";
import { isStaff } from "@/Utils/Lib/roles";

// The merchant's 7-digit Paga-Daki code (account/my_code), large and as a QR
// code, to show at the counter: customers type it (or scan it) to pay, and at
// an agent, to take out cash. As on the Paysey portal, the QR can be
// downloaded as a picture (made here, from the code) or printed.
const spaced = (code) =>
  code.length === 7 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

export default function MyCode() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const [code, setCode] = useState(null);
  const [problem, setProblem] = useState("");
  const qrRef = useRef(null);
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
    <PageTitle
      title={t("myCode.title", { defaultValue: "My Paga-Daki code" })}
      subtitle={t("myCode.subtitle", {
        defaultValue: "Customers type this code in their app to pay you.",
      })}
    />
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

  const isAgent = (user?.roles ?? []).some(
    (r) => String(r?.code ?? r).toUpperCase() === "AGENT",
  );
  const label = t("myCode.label", { defaultValue: "Pay with Paga-Daki" });
  // A counter card: the name, the QR and the code, on white.
  const poster = () => {
    const qr = qrRef.current?.querySelector("canvas");
    if (!qr) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1040;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), 400, 90);
    ctx.font = "800 44px system-ui, sans-serif";
    ctx.fillText(user?.name ?? "", 400, 150, 720);
    ctx.drawImage(qr, 160, 200, 480, 480);
    ctx.font = "900 110px ui-monospace, monospace";
    ctx.fillText(spaced(code), 400, 830);
    ctx.font = "400 26px system-ui, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(
      t("myCode.posterHint", {
        defaultValue:
          "Open your app, choose “Pay merchant Paga-Daki” and type this code.",
      }),
      400,
      910,
      720,
    );
    return canvas.toDataURL("image/png");
  };
  const download = () => {
    const url = poster();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `paga-daki-${code}.png`;
    a.click();
  };
  const print = () => {
    const url = poster();
    const win = url && window.open("", "_blank", "width=600,height=800");
    if (!win) return;
    win.document.write(
      `<title>Paga-Daki ${code}</title><body style="margin:0;display:flex;justify-content:center"><img src="${url}" style="max-width:100%;height:auto" onload="window.print()"></body>`,
    );
    win.document.close();
  };

  return (
    <div>
      {heading}
      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-surface p-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {label}
          </p>
          {user?.name && (
            <p className="mt-1 text-xl font-black text-slate-800">
              {user.name}
            </p>
          )}
          <div
            ref={qrRef}
            className="mt-6 rounded-3xl bg-white p-5 shadow-inner ring-1 ring-slate-200"
          >
            <QRCodeCanvas
              value={code}
              size={480}
              level="M"
              marginSize={0}
              className="!h-56 !w-56 sm:!h-64 sm:!w-64"
            />
          </div>
          <p className="mt-6 font-mono text-5xl font-black tracking-[0.15em] text-slate-800 sm:text-6xl">
            {spaced(code)}
          </p>
          <div className="mt-6 grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:justify-center">
            <CopyButton
              value={code}
              label={t("myCode.copy", { defaultValue: "Copy code" })}
            />
            <Button variant="secondary" onClick={download}>
              <Download size={16} />
              {t("myCode.download", { defaultValue: "Download QR" })}
            </Button>
            <Button onClick={print}>
              <Printer size={16} />
              {t("myCode.print", { defaultValue: "Print for the counter" })}
            </Button>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">
            {t("myCode.how", { defaultValue: "How customers use it" })}
          </p>
          <ol className="space-y-4">
            {[
              [
                Smartphone,
                t("myCode.step1", {
                  defaultValue:
                    "The customer opens their E-taku app and chooses “Pay merchant Paga-Daki”.",
                }),
              ],
              [
                ScanLine,
                t("myCode.step2", {
                  defaultValue: "They type your code and the amount.",
                }),
              ],
              [
                Store,
                isAgent
                  ? t("myCode.step3Agent", {
                      defaultValue:
                        "The money arrives at once. For a cash-out it lands in your float: hand over the cash.",
                    })
                  : t("myCode.step3", {
                      defaultValue:
                        "The money arrives in your wallet at once, and shows in your history.",
                    }),
              ],
            ].map(([icon, text], index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lime shadow-md">
                  {createElement(icon, { size: 18 })}
                </span>
                <p className="pt-2 text-sm leading-6 text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-2xl bg-ink/5 px-4 py-3 text-xs leading-5 text-slate-500">
            {t("myCode.private", {
              defaultValue:
                "The code only receives money: showing it is safe. Nobody can take money with it.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
