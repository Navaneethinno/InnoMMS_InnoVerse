import { useEffect, useState, useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import { loadAvatarImage } from "@/Services/Profile/profile.api";

// Avatars arrive as images behind the customer's token, so each is fetched once
// and shown through an object URL. A preset is cached by its code; the
// customer's own by who they are, what it is and a version that is bumped
// whenever they change it.
const cache = new Map();
const listeners = new Set();
let version = 0;

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getVersion = () => version;

// The customer's avatar was changed: fetch it again, everywhere it is shown.
export function refreshAvatar() {
  for (const [key, promise] of cache) {
    if (key.startsWith("me:")) {
      cache.delete(key);
      promise.then((url) => URL.revokeObjectURL(url)).catch(() => {});
    }
  }
  version += 1;
  listeners.forEach((listener) => listener());
}

function fetchUrl(key, code) {
  if (!cache.has(key)) {
    const promise = loadAvatarImage(code).then(({ blob }) => URL.createObjectURL(blob));
    promise.catch(() => cache.delete(key));
    cache.set(key, promise);
  }
  return cache.get(key);
}

// The address of an avatar image: the preset `code`, or the signed-in
// customer's own. "" until it has loaded (or when it cannot be). The previous
// picture stays up while a new one loads, so nothing flickers.
export function useAvatarUrl(code) {
  const user = useSelector((state) => state.auth.user);
  const current = useSyncExternalStore(subscribe, getVersion);
  const avatar = user?.avatar;
  // The own avatar waits for `auth/me` to say what it is.
  const ready = Boolean(code || avatar);
  const key = code ? `p:${code}` : `me:${user?.username}:${avatar?.kind}:${avatar?.code}:${avatar?.updated_at}:${current}`;
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!ready) return undefined;
    let live = true;
    fetchUrl(key, code)
      .then((next) => live && setUrl(next))
      .catch(() => live && setUrl(""));
    return () => {
      live = false;
    };
  }, [key, code, ready]);
  return ready ? url : "";
}
