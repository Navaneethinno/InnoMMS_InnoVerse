import { useEffect, useRef } from "react";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { freshAccessToken } from "./client";

// The live channel: the server says the moment money moves in or out of the
// merchant's wallets, so balances and history refresh without polling.
//   wallet changed  -> "merchant:wallet-changed" on window (pages refetch)
//   card changed    -> "merchant:card-changed" (the cards page refetches)
//   notification    -> "merchant:notification" (the inbox and its badge refetch)
//   store / terminal -> "merchant:store-changed" / "merchant:terminal-changed"
//                      (the bank's decision, a close or reopen: the lists refetch)
//   session ended   -> "merchant:session-expired" (back to sign-in)
const PING_MS = 30000;
const RETRY_MS = [2000, 5000, 15000, 30000];

const socketUrl = () => `${API_BASE_URL.replace(/^http/i, "ws")}${API_ENDPOINTS.LIVE}`;

// Keeps one socket open while signed in, reconnecting after a drop.
export function connectLive() {
  if (!API_BASE_URL) return () => {};
  let socket = null;
  let ping = null;
  let retry = null;
  let burst = null;
  let attempts = 0;
  let stopped = false;

  const open = async () => {
    const token = await freshAccessToken();
    if (stopped) return;
    // No usable session: sign-in is handled by the ordinary calls.
    if (!token) return;
    socket = new WebSocket(socketUrl());
    socket.onopen = () => socket.send(JSON.stringify({ type: "auth", token: `Bearer ${token}` }));
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === "auth_ok") {
        attempts = 0;
        clearInterval(ping);
        ping = setInterval(() => socket?.readyState === 1 && socket.send(JSON.stringify({ type: "ping" })), PING_MS);
      } else if (message.type === "auth_error") {
        // Stop reconnecting; the ordinary calls will notice a dead session.
        stopped = true;
      } else if (message.type === "changed" && message.action === "wallet") {
        // Several moves close together refresh once.
        clearTimeout(burst);
        burst = setTimeout(() => window.dispatchEvent(new CustomEvent("merchant:wallet-changed", { detail: message.data ?? [] })), 400);
      } else if (message.type === "changed" && message.action === "card") {
        window.dispatchEvent(new CustomEvent("merchant:card-changed", { detail: message.data ?? [] }));
      } else if (message.type === "changed" && (message.action === "store" || message.action === "terminal")) {
        window.dispatchEvent(new CustomEvent(`merchant:${message.action}-changed`, { detail: message.data ?? {} }));
      } else if (message.type === "changed" && message.action === "notification") {
        window.dispatchEvent(new CustomEvent("merchant:notification", { detail: message.data ?? [] }));
      } else if (message.type === "session_ended") {
        stopped = true;
        window.dispatchEvent(new Event("merchant:session-expired"));
      }
    };
    socket.onclose = () => {
      clearInterval(ping);
      if (!stopped) schedule();
    };
  };

  const schedule = () => {
    clearTimeout(retry);
    retry = setTimeout(open, RETRY_MS[Math.min(attempts++, RETRY_MS.length - 1)]);
  };

  open();
  return () => {
    stopped = true;
    clearInterval(ping);
    clearTimeout(retry);
    clearTimeout(burst);
    socket?.close();
  };
}

// Runs `callback` whenever the merchant's wallets change.
export function useWalletChanged(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener("merchant:wallet-changed", handler);
    return () => window.removeEventListener("merchant:wallet-changed", handler);
  }, []);
}

// Runs `callback` whenever one of the merchant's cards changes, whoever
// changed it (them, the institution or the system).
export function useCardChanged(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener("merchant:card-changed", handler);
    return () => window.removeEventListener("merchant:card-changed", handler);
  }, []);
}

// Runs `callback` whenever a notification reaches the merchant's inbox.
export function useNotificationReceived(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener("merchant:notification", handler);
    return () => window.removeEventListener("merchant:notification", handler);
  }, []);
}

// Runs `callback` when one of the merchant's stores, or terminals, changes
// status: { id, status } (and `tid` for a terminal).
function useLiveEvent(name, callback) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  }, [name]);
}
export const useStoreChanged = (callback) => useLiveEvent("merchant:store-changed", callback);
export const useTerminalChanged = (callback) => useLiveEvent("merchant:terminal-changed", callback);
