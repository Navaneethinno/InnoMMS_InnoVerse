import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { sanitizePin } from "@/Utils/Lib/pinRules";

// The pieces of an action dialog (cards, deposits, loans): the PIN field,
// the dialog with its problem and confirm button, and the call runner.

const digits = (value, max) => value.replace(/\D/g, "").slice(0, max);

// The transaction PIN (letters allowed when the product says so) or, with
// `length`, the card's own PIN (digits only, of the card's length).
export function PinInput({ label, value, onChange, length }) {
  const rules = usePinRules();
  const card = length != null;
  return (
    <TextField
      name="pin"
      type="password"
      inputMode={card || !rules.letters ? "numeric" : undefined}
      maxLength={card ? length : rules.maxLength}
      autoComplete="off"
      label={label}
      value={value}
      onChange={(event) => onChange(card ? digits(event.target.value, length) : sanitizePin(rules, event.target.value))}
    />
  );
}

// A dialog with its problem, body and a confirm button.
export function Shell({ open = true, title, description, problem, onClose, pending, confirm, disabled, onConfirm, danger, size, children }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title={title} description={description} pending={pending} size={size}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (onConfirm && !pending && !disabled) onConfirm();
        }}
      >
        {problem && <ErrorState message={problem.message} problems={problem.problems} />}
        {/* A locked transaction PIN is unlocked by resetting it on Security. */}
        {problem?.errorCode === "portal.pin_locked" && (
          <Link to="/security" onClick={onClose} className="block text-sm font-bold text-ink underline">
            {t("send.goSecurity")}
          </Link>
        )}
        {children}
        {onConfirm && (
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              {t("cards.cancel")}
            </Button>
            <Button type="submit" pending={pending} disabled={disabled} className={danger ? "!bg-red-600 hover:!bg-red-700" : undefined}>
              {confirm}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}

// Runs a call: pending while it runs, the API's refusal shown in the dialog.
export function useCall() {
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState(null);
  const run = async (call) => {
    setPending(true);
    setProblem(null);
    try {
      return await call();
    } catch (error) {
      setProblem({ message: error.message, problems: error.problems, errorCode: error.errorCode });
      return undefined;
    } finally {
      setPending(false);
    }
  };
  return { pending, problem, run };
}
