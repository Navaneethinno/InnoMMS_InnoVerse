import { useSelector } from "react-redux";

// Whether a feature is on for this customer (`features` from the menu call).
// Until the menu is known, everything is shown; the API refuses what is not
// allowed anyway.
export function useFeature(key) {
  return useSelector((state) => state.auth.user?.features?.[key]) !== false;
}
