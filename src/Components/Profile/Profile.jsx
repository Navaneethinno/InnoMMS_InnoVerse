import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, FileText, IdCard, KeyRound, Phone, ShieldCheck, Store, UserRound } from "lucide-react";
import DetailRow from "@/Components/Common/DetailRow";
import ErrorState from "@/Components/Common/ErrorState";
import IconCard from "@/Components/Common/IconCard";
import LoadingState from "@/Components/Common/LoadingState";
import { useProfile } from "@/Hooks/Profile/useProfile";
import { sectionBlocks } from "@/Utils/Lib/profileAnswers";
import { formatDate, formatDateTime } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";
import AvatarDialog from "./AvatarDialog";
import AvatarPreview from "./AvatarPreview";

// Each sign-up section's card icon, by what it is about.
const sectionIcon = (key = "") => {
  if (key.includes("business")) return Store;
  if (key.includes("document")) return IdCard;
  return UserRound;
};
import ProfileDocuments from "./ProfileDocuments";

const NONE = "—";
const linkClass = "inline-flex items-center gap-2 rounded-xl border border-ink/25 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5";

// "My profile": the merchant's own details as they gave them at sign-up,
// read-only. The only thing they can change here is their avatar.
export default function Profile() {
  const { t } = useTranslation();
  const { loading, profile, error, reload, setAvatar } = useProfile();
  const [photoOpen, setPhotoOpen] = useState(false);

  if (loading && !profile) return <LoadingState className="py-24" />;
  if (!profile) return <ErrorState message={error} onRetry={() => void reload()} />;

  const { header, avatar, sections = [], documents = [], contact } = profile;
  const methods = header.sign_in_methods ?? [];
  const words = { yes: t("common.yes", { defaultValue: "Yes" }), no: t("common.no", { defaultValue: "No" }) };
  const methodName = (method) => (method === "PIN" ? "PIN" : method === "PASSWORD" ? t("security.password", { defaultValue: "Password" }) : method);

  return (
    <div className="space-y-5">
      {error && <ErrorState message={error} />}
      <section className="flex flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-surface p-6 text-center shadow-sm sm:flex-row sm:text-left">
        <div className="relative shrink-0">
          <AvatarPreview name={header.name} onChange={() => setPhotoOpen(true)} />
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label={t("profile.changePhoto", { defaultValue: "Change photo" })}
            className="brand-gradient absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface text-lime shadow-md transition hover:scale-105"
          >
            <Camera size={16} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 [overflow-wrap:anywhere]">{header.name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {header.customer_type && <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink">{header.customer_type}</span>}
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", header.status === 1 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-200 text-slate-600")}>{header.status_name}</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {t("profile.memberSince", { defaultValue: "Member since {{date}}", date: formatDate(header.member_since) })}
            {header.kyc_level_name && <span> · {t("profile.accountLevel", { defaultValue: "Account level: {{level}}", level: header.kyc_level_name })}</span>}
          </p>
        </div>
      </section>

      {sections.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {sections.map((section) => (
            <IconCard key={section.key} icon={sectionIcon(section.key)} title={section.heading}>
              {sectionBlocks(section, words).map((rows, index) => (
                <dl key={index} className={cn(index > 0 && "mt-4 border-t border-slate-200 pt-2")}>
                  {rows.map((row) => (
                    <DetailRow key={row.key} label={row.label}>
                      {row.text || NONE}
                    </DetailRow>
                  ))}
                </dl>
              ))}
            </IconCard>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <IconCard icon={FileText} title={t("profile.documents", { defaultValue: "My documents" })}>
          <ProfileDocuments documents={documents} />
        </IconCard>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <IconCard icon={Phone} title={t("profile.contact", { defaultValue: "Contact" })}>
          <dl>
            <DetailRow label={t("profile.signInWith", { defaultValue: "You sign in with" })}>{contact?.login_id || NONE}</DetailRow>
          </dl>
        </IconCard>
        <IconCard icon={ShieldCheck} title={t("profile.security", { defaultValue: "Security" })}>
          <dl>
            <DetailRow label={t("profile.signInMethod", { defaultValue: "Sign-in method" })}>{methods.map(methodName).join(", ") || NONE}</DetailRow>
            <DetailRow label={t("profile.lastSignIn", { defaultValue: "Last sign-in" })}>{header.last_sign_in_at ? formatDateTime(header.last_sign_in_at) : NONE}</DetailRow>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            {methods.includes("PIN") && (
              <Link to="/security" className={linkClass}>
                <KeyRound size={15} /> {t("security.changePin", { defaultValue: "Change PIN" })}
              </Link>
            )}
            {methods.includes("PASSWORD") && (
              <Link to="/security" className={linkClass}>
                <KeyRound size={15} /> {t("profile.changePassword", { defaultValue: "Change password" })}
              </Link>
            )}
          </div>
        </IconCard>
      </div>

      <AvatarDialog open={photoOpen} onOpenChange={setPhotoOpen} avatar={avatar} name={header.name} onChanged={setAvatar} />
    </div>
  );
}
