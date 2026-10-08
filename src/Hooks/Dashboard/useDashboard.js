import { useEffect, useState } from "react";
import { getDashboard } from "@/Services/Dashboard/dashboard.api";

export function useDashboard() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    getDashboard({ signal: controller.signal }).then(
      (data) => { if (!controller.signal.aborted) setState({ status: 'ready', data, error: null }); },
      (error) => { if (!controller.signal.aborted) setState({ status: 'error', data: null, error }); },
    );
    return () => controller.abort();
  }, [attempt]);
  const retry = () => { setState({ status: 'loading', data: null, error: null }); setAttempt((value) => value + 1); };
  return { ...state, retry };
}
