import { useTranslation } from "react-i18next";
import AuthCard from "./AuthCard";
import { LEGAL, LEGAL_UPDATED } from "@/Utils/Lib/legalText";

// The portal's own Terms & Conditions or Privacy Policy (kind: "terms" |
// "privacy"), reached from the sign-in page when the institution has not set
// its own pages.
export default function LegalPage({ kind }) {
  const { t } = useTranslation();
  const brand = t("brand.name");
  const doc = LEGAL[kind];
  const fill = (text) => text.replaceAll("{brand}", brand);
  return (
    <AuthCard wide title={doc.title} description={fill(doc.intro)}>
      <p className="-mt-3 mb-5 text-xs text-slate-400">Last updated {LEGAL_UPDATED}</p>
      <div className="space-y-6">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-bold text-ink">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-6 text-slate-600">
                {fill(paragraph)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </AuthCard>
  );
}
