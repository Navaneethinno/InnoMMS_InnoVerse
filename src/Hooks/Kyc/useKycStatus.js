import { useEffect, useState } from "react";
import { loadKycStatus } from "@/Services/Kyc/kyc.api";

// The customer's verification status, or null while unknown (or when the
// bank has none: a company customer, no KYC levels).
export function useKycStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let live = true;
    loadKycStatus()
      .then((data) => live && setStatus(data))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return status;
}
