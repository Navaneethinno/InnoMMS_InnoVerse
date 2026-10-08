import { useSelector } from "react-redux";
import { DEFAULT_POLICY } from "@/Utils/Lib/policy";

// The signed-in customer's rules (loaded with auth/me when the signed-in area
// opens); `known` is false until then.
export function usePolicy() {
  return useSelector((state) => state.auth.user?.policy) ?? DEFAULT_POLICY;
}
