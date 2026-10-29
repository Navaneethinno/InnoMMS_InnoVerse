import { sendCode, activateAccess, resetPassword, forgotPin, changePassword, changePin, changeSigninPin, setTransactionPin, startPinReset, resetPin, listSessions, endSession } from "@/Services/Auth/auth.api";
import { readAuthUser, updateAuthUser } from "@/Services/api/authStorage";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { sendCode, activateAccess, resetPassword, forgotPin, changePassword, changePin, changeSigninPin, setTransactionPin, startPinReset, resetPin, listSessions, endSession, readAuthUser, updateAuthUser };
export const useAuthActions = () => actions;
