import { useEffect, useState } from "react";

// Whether a CSS media query matches now, kept up to date as the window changes.
export const PHONE_QUERY = "(max-width: 767.98px)";
export const WIDE_QUERY = "(min-width: 1024px)";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}
