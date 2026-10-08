import { useEffect, useRef } from "react";
import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";
import { freshAccessToken } from "./client";

// The live channel: the server says the moment money moves in or out of the
// customer's wallets, so balances and history refresh without polling.
//   wallet changed  -> "customer:wallet-changed" on window (pages refetch)
//   card changed    -> "customer:card-changed" (the cards page refetches)
//   notification    -> "customer:notification" (the inbox and its badge refetch)
//   session ended   -> "customer:session-expired" (back to sign-in)
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
        burst = setTimeout(() => window.dispatchEvent(new CustomEvent("customer:wallet-changed", { detail: message.data ?? [] })), 400);
      } else if (message.type === "changed" && message.action === "card") {
        window.dispatchEvent(new CustomEvent("customer:card-changed", { detail: message.data ?? [] }));
      } else if (message.type === "changed" && message.action === "notification") {
        window.dispatchEvent(new CustomEvent("customer:notification", { detail: message.data ?? [] }));
      } else if (message.type === "session_ended") {
        stopped = true;
        window.dispatchEvent(new Event("customer:session-expired"));
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

// Runs `callback` whenever the customer's wallets change.
export function useWalletChanged(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener("customer:wallet-changed", handler);
    return () => window.removeEventListener("customer:wallet-changed", handler);
  }, []);
}

// Runs `callback` whenever one of the customer's cards changes, whoever
// changed it (them, the institution or the system).
export function useCardChanged(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener("customer:card-changed", handler);
    return () => window.removeEventListener("customer:card-changed", handler);
  }, []);
}

// Runs `callback` whenever a notification reaches the customer's inbox.
export function useNotificationReceived(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail);
    window.addEventListener("customer:notification", handler);
    return () => window.removeEventListener("customer:notification", handler);
  }, []);
}
