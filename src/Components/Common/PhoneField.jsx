import { useState } from "react";
import { useTranslation } from "react-i18next";
import FilterSelect from "./FilterSelect";
import TextField from "./TextField";

const OTHER = "__other__";

// A phone number as the institution takes it: a prefix picked from its
// countries and the digits after it. The value is the whole number
// ("+258840000000"), or "" while no digits are typed. With no countries (any
// country is accepted) it is one plain box where the customer types the number.
// `allowOther` adds an "Other" prefix for signing in with a number exactly as
// it is stored (older records have no prefix): what is typed is sent as typed.
export default function PhoneField({ label, value, onChange, countries = [], allowOther = false, error, disabled, name = "phone", placeholder }) {
  const { t } = useTranslation();
  const primary = countries.find((country) => country.primary) ?? countries[0];
  // A value already there (the form was left and came back) is split into its prefix and digits again.
  const [initial] = useState(() => {
    const matched = value ? [...countries].sort((x, y) => String(y.dial).length - String(x.dial).length).find((item) => String(value).startsWith(item.dial)) : null;
    if (matched) return { alpha2: matched.alpha2, digits: String(value).slice(String(matched.dial).length) };
    return { alpha2: value && allowOther ? OTHER : (primary?.alpha2 ?? ""), digits: value ? String(value) : "" };
  });
  const [alpha2, setAlpha2] = useState(initial.alpha2);
  const [digits, setDigits] = useState(initial.digits);

  if (!countries.length) {
    return <TextField name={name} label={label} type="tel" inputMode="tel" autoComplete="tel" placeholder={placeholder} value={value ?? ""} disabled={disabled} error={error} onChange={(event) => onChange(event.target.value)} />;
  }
  const other = alpha2 === OTHER;
  const country = countries.find((item) => item.alpha2 === alpha2) ?? primary;
  const emit = (isOther, nextCountry, nextDigits) => onChange(nextDigits ? (isOther ? nextDigits : `${nextCountry.dial}${nextDigits}`) : "");
  const options = [
    ...countries.map((item) => ({ value: item.alpha2, label: `${item.alpha2} ${item.dial}` })),
    ...(allowOther ? [{ value: OTHER, label: t("phone.other", { defaultValue: "Other" }) }] : []),
  ];
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex items-start gap-2">
        <div className="w-[8.5rem] shrink-0 [&_label]:sr-only">
          <FilterSelect
            label={t("phone.country", { defaultValue: "Country code" })}
            value={other ? OTHER : country.alpha2}
            disabled={disabled}
            onChange={(next) => {
              setAlpha2(next);
              emit(next === OTHER, countries.find((item) => item.alpha2 === next) ?? country, digits);
            }}
            options={options}
          />
        </div>
        <div className="min-w-0 flex-1 [&_label]:sr-only">
          <TextField
            name={name}
            label={label}
            type="tel"
            inputMode={other ? "tel" : "numeric"}
            autoComplete="tel-national"
            maxLength={other ? 20 : country.max}
            placeholder={placeholder}
            value={digits}
            disabled={disabled}
            error={error}
            onChange={(event) => {
              // A number of the institution's countries is digits only; "Other" keeps what is typed (a leading + too).
              const raw = event.target.value;
              const next = other ? raw.replace(/(?!^\+)\D/g, "").slice(0, 20) : raw.replace(/\D/g, "").slice(0, country.max);
              setDigits(next);
              emit(other, country, next);
            }}
          />
        </div>
      </div>
    </div>
  );
}
