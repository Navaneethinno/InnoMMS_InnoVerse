import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadProfile } from "@/Services/Profile/profile.api";

// The customer's profile page. Loaded again when the language changes, since its
// labels come in the API language.
export function useProfile() {
  const { i18n } = useTranslation();
  const [state, setState] = useState({ loading: true, profile: null, error: "" });
  const load = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    return loadProfile()
      .then((profile) => setState({ loading: false, profile, error: "" }))
      .catch((error) => setState((previous) => ({ ...previous, loading: false, error: error.message })));
  }, []);
  useEffect(() => {
    void load();
  }, [load, i18n.language]);
  const setAvatar = useCallback((avatar) => setState((previous) => (previous.profile ? { ...previous, profile: { ...previous.profile, avatar } } : previous)), []);
  return { ...state, reload: load, setAvatar };
}
