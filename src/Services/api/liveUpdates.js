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
      } else if (message.action === "ext_order") {
        // A mobile-money order ended (SUCCESS / FAILED): { order_ref, rrn, status, ... }.
        window.dispatchEvent(new CustomEvent("merchant:ext-order", { detail: message.data ?? {} }));
      } else if (message.type === "changed" && message.action === "case") {
        // A post on one of the user's cases (staff's message, the closing
        // message, their own reply): [{ event, case_id }].
        window.dispatchEvent(new CustomEvent("merchant:case-changed", { detail: message.data ?? [] }));
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
