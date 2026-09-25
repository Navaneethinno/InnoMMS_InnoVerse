import { useCallback, useEffect, useState } from "react";
import { accountApi } from "@/Services/Auth/account.api";
import { normalizePasswordPolicyList, pickDefaultPolicy } from "@/Utils/Lib/password-policy";

// The signed-in user's full record (/config/user/get), for "My profile".
export function useMyProfileQuery(userId) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await accountApi.getUser({ user_id: userId });
      setData(Array.isArray(response?.data) ? (response.data[0] ?? null) : (response?.data ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, isLoading, error, refetch: load };
}

// The password policy the Change password form validates against.
export function usePasswordPolicyQuery() {
  const [policies, setPolicies] = useState([]);
  useEffect(() => {
    let cancelled = false;
    accountApi
      .passwordPolicies()
      .then((response) => {
        if (!cancelled) setPolicies(normalizePasswordPolicyList(response));
      })
      .catch(() => {
        // No policy loaded: the form falls back to its built-in minimum rules.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { policies, policy: pickDefaultPolicy(policies) };
}
