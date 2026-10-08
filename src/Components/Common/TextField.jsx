import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";
import FieldError from "./FieldError";
export default function TextField({
  label,
  type = "text",
  error,
  icon: Icon,
  className,
  endAdornment,
  autoComplete,
  ...props
}) {
  // A secret that is not the sign-in password (a new password, a PIN) must
  // not be filled by the browser or a password manager: `off` is ignored for
  // password fields, `new-password` is not. A PIN is also hidden from
  // password managers outright.
  const secret = type === "password";
  const isPin = secret && props.inputMode === "numeric";
  const fill = secret && (!autoComplete || autoComplete === "off") ? "new-password" : autoComplete;
  const id = useId();
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400"
          />
        )}
        <input
          {...props}
          autoComplete={fill}
          {...(isPin ? { "data-lpignore": "true", "data-1p-ignore": "true", "data-form-type": "other" } : {})}
          id={id}
          type={type === "password" && visible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("field-control", Icon && "pl-11", type === "password" && "pr-12", className)}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-3 flex items-center">{endAdornment}</div>
        )}
        {type === "password" && (
          <button
            type="button"
            aria-label={t(
              visible ? "common.hidePassword" : "common.showPassword",
            )}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:text-ink"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
