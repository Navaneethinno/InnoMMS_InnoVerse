import { useState } from "react";
import { useTranslation } from "react-i18next";
import FilterSelect from "./FilterSelect";
import TextField from "./TextField";

const OTHER = "__other__";

// A phone number as the institution takes it: a prefix picked from its
// countries and the digits after it. The value is the whole number
// ("+258840000000"), or "" while no digits are typed. With no countries (any
// country is accepted) it is one plain box where the merchant types the number.
// `allowOther` adds an "Other" prefix for signing in with a number exactly as
// it is stored (older records have no prefix): what is typed is sent as typed.
export default function PhoneField({ label, value, onChange, countries = [], allowOther = false, error, disabled, name = "phone", placeholder }) {
  const { t } = useTranslation();
  const primary = countries.find((country) => country.primary) ?? countries[0];
  // A whole number is split into its prefix and digits: the one already there
  // (the form was left and came back), and any set from outside later (a recent
  // number picked, the form cleared).
  const split = (whole) => {
    const matched = whole ? [...countries].sort((x, y) => String(y.dial).length - String(x.dial).length).find((item) => String(whole).startsWith(item.dial)) : null;
    if (matched) return { alpha2: matched.alpha2, digits: String(whole).slice(String(matched.dial).length) };
    return { alpha2: whole && allowOther ? OTHER : (primary?.alpha2 ?? ""), digits: whole ? String(whole) : "" };
  };
  const [initial] = useState(() => split(value));
  const [alpha2, setAlpha2] = useState(initial.alpha2);
  const [digits, setDigits] = useState(initial.digits);
  // The value this field last reported (or was given): a different one came from outside.
  const [known, setKnown] = useState(value ?? "");
  if ((value ?? "") !== known) {
    const next = split(value);
    setKnown(value ?? "");
    if (next.digits !== digits || (value && next.alpha2 !== alpha2)) {
      if (value) setAlpha2(next.alpha2);
      setDigits(next.digits);
    }
  }

  if (!countries.length) {
    return <TextField name={name} label={label} type="tel" inputMode="tel" autoComplete="tel" placeholder={placeholder} value={value ?? ""} disabled={disabled} error={error} onChange={(event) => onChange(event.target.value)} />;
  }
  const other = alpha2 === OTHER;
  const country = countries.find((item) => item.alpha2 === alpha2) ?? primary;
  const emit = (isOther, nextCountry, nextDigits) => {
    const whole = nextDigits ? (isOther ? nextDigits : `${nextCountry.dial}${nextDigits}`) : "";
    setKnown(whole);
    onChange(whole);
  };
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
