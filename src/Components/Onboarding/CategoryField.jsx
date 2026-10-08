import { useTranslation } from "react-i18next";
import FilterSelect from "@/Components/Common/FilterSelect";

const fieldBorder = "border-ink/25 focus:border-ink";

// The one choice the merchant makes before starting: the category from the
// `options` reply. Not drawn when there is nothing to choose between (the
// only category is picked for them).
export default function CategoryField({ flow, label, icon: Icon, heading }) {
  const { t } = useTranslation();
  const name = label ?? t("onb.category");
  const { categories, chosenCategory, pick, setPick } = flow;
  if (categories.length <= 1) return null;
  return (
    <>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink/70">
        {Icon && <Icon size={14} />} {heading}
      </h3>
      <label className="block text-sm font-semibold text-slate-700">
        {name}
        <div className="mt-1.5">
          <FilterSelect
            value={chosenCategory?.value ?? ""}
            onChange={(value) => setPick({ ...pick, category: value })}
            placeholder={t("onb.select", { label: name.toLowerCase() })}
            options={categories.map((c) => ({ value: c.value, label: c.label }))}
            className={fieldBorder}
            clearable
          />
        </div>
      </label>
    </>
  );
}
