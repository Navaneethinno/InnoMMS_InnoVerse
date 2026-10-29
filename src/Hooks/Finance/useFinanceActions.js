import { depositOffers, depositQuote, openDeposit, loadDeposits, loadDeposit, instructDeposit, precloseQuote, precloseDeposit, loanOffers, loanQuote, applyLoan, loadApplications, loadApplication, withdrawApplication, loadLoans, loadLoan, repayLoan, settlementQuote, settleLoan } from "@/Services/Finance/finance.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { depositOffers, depositQuote, openDeposit, loadDeposits, loadDeposit, instructDeposit, precloseQuote, precloseDeposit, loanOffers, loanQuote, applyLoan, loadApplications, loadApplication, withdrawApplication, loadLoans, loadLoan, repayLoan, settlementQuote, settleLoan };
export const useFinanceActions = () => actions;
