import { useSyncExternalStore } from "react";
import { readEnvironment, subscribeEnvironment } from "@/Services/api/environment";

// "UAT" while the API runs as the testing platform, otherwise null.
export const useEnvironment = () =>
  useSyncExternalStore(subscribeEnvironment, readEnvironment);
