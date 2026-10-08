import CheckboxPill from "./CheckboxPill";
export default function CheckboxPillGroup({
  legend,
  options,
  value = [],
  onChange,
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map(({ key, label }) => (
          <CheckboxPill
            key={key}
            label={label}
            className="border border-slate-200 px-3 py-2"
            checked={value.includes(key)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...value, key]
                  : value.filter((item) => item !== key),
              )
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
