import { useEffect, useRef, useState } from "react";
import { OTP_CONFIG } from "@/Utils/Constant";
import { sendOtp, verifyOtp } from "@/Services/Otp/otp.api";

// Per-field contact verification. Email and phone are each optional and
// verified on their own through a code popup; onboarding can start once at
// least one of them is verified.
//
// `verified[channel]` holds the exact value that was verified, so a field
// only counts as verified while it still shows that value.

export function maskDestination({ channel, destination }) {
  if (channel === "email") {
    const [name, domain] = destination.split("@");
    return `${name.slice(0, 2)}•••@${domain ?? ""}`;
  }
  const digits = destination.replace(/\s/g, "");
  return `${digits.slice(0, Math.min(3, digits.length - 3))} •••• ${digits.slice(-3)}`;
}

export function useContactVerification() {
  const [verified, setVerified] = useState({ email: null, phone: null });
  const [modal, setModal] = useState(null); // { channel, destination } while open
  const [code, setCode] = useState("");
  const [sendingFor, setSendingFor] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState({ email: "", phone: "" });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const attempt = useRef(0);

  useEffect(() => {
    if (!modal || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [modal, secondsLeft]);

  const isVerified = (channel, value) => Boolean(value?.trim()) && verified[channel] === value.trim();

  // "Verify" chip: send a code, then open the popup for that field.
  const startVerify = async (channel, value) => {
    const destination = value.trim();
    setFieldError((prev) => ({ ...prev, [channel]: "" }));
    setSendingFor(channel);
    try {
      await sendOtp({ channel, destination });
      setCode("");
      setError("");
      setSecondsLeft(OTP_CONFIG.resendSeconds);
      setModal({ channel, destination });
    } catch (err) {
      setFieldError((prev) => ({ ...prev, [channel]: err.message }));
    } finally {
      setSendingFor(null);
    }
  };

  const resend = async () => {
    if (!modal) return;
    setSendingFor(modal.channel);
    setError("");
    try {
      await sendOtp(modal);
      setCode("");
      setSecondsLeft(OTP_CONFIG.resendSeconds);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingFor(null);
    }
  };

  // Popup "Verify": on success close and mark the field; on failure stay
  // open with the reason so the customer can try again.
  const confirm = async () => {
    if (!modal || code.length !== OTP_CONFIG.length) return;
    const id = (attempt.current += 1);
    setVerifying(true);
    setError("");
    try {
      await verifyOtp({ ...modal, code });
      if (id !== attempt.current) return;
      setVerified((prev) => ({ ...prev, [modal.channel]: modal.destination }));
      setModal(null);
    } catch (err) {
      if (id !== attempt.current) return;
      setError(err.message);
      setCode("");
    } finally {
      if (id === attempt.current) setVerifying(false);
    }
  };

  const close = () => {
    attempt.current += 1;
    setVerifying(false);
    setModal(null);
  };

  // "Edit" on a verified field: unlock it and drop its verification.
  const unlock = (channel) => setVerified((prev) => ({ ...prev, [channel]: null }));

  const reset = () => {
    close();
    setVerified({ email: null, phone: null });
    setFieldError({ email: "", phone: "" });
  };

  return {
    verified,
    isVerified,
    modal,
    code,
    setCode: (value) => {
      setCode(value);
      setError("");
    },
    sendingFor,
    verifying,
    error,
    fieldError,
    secondsLeft,
    startVerify,
    resend,
    confirm,
    close,
    unlock,
    reset,
  };
}
