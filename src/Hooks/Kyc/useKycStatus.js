import { useEffect, useState } from "react";
import { loadKycStatus } from "@/Services/Kyc/kyc.api";

// The merchant's verification status, or null while unknown (or when the
// bank has none: a company merchant, no KYC levels).
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
