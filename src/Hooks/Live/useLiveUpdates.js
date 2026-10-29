import { useEffect, useRef } from "react";
import { connectLive } from "@/Services/api/liveUpdates";

// The live channel's window events (see Services/api/liveUpdates.js), as hooks
// for screens.

// Keeps the live socket open while the signed-in area is mounted.
export function useLiveChannel() {
  useEffect(() => connectLive(), []);
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
export const useExtOrder = (callback) => useLiveEvent("merchant:ext-order", callback);

// Runs `callback` with [{ event, case_id }] when a post is added to one of
// the user's cases.
export function useCaseChanged(callback) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    const handler = (event) => latest.current(event.detail ?? []);
    window.addEventListener("merchant:case-changed", handler);
    return () => window.removeEventListener("merchant:case-changed", handler);
  }, []);
}
