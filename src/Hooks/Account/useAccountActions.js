import { loadWallets, loadLimits, checkPayee, matchContacts, loadPhoneTransfers, cancelPhoneTransfer, quotePayment, sendPayment, loadExtProviders, quoteExt, sendExt, loadExtLast, lookupBill, loadSavedAccounts, addSavedAccount, renameSavedAccount, deleteSavedAccount, loadMyCode, loadHistory, loadTransaction, loadReceipt } from "@/Services/Account/account.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { loadWallets, loadLimits, checkPayee, matchContacts, loadPhoneTransfers, cancelPhoneTransfer, quotePayment, sendPayment, loadExtProviders, quoteExt, sendExt, loadExtLast, lookupBill, loadSavedAccounts, addSavedAccount, renameSavedAccount, deleteSavedAccount, loadMyCode, loadHistory, loadTransaction, loadReceipt };
export const useAccountActions = () => actions;
