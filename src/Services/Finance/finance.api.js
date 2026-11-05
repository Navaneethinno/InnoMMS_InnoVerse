import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { DEPOSIT, LOAN } = API_ENDPOINTS;
const one = async (call) => (await call).data;
const all = async (call) => (await call).rows;

// Term deposits and loans: the merchant's own. Every call that moves money
// takes the transaction `pin` (sealed by the client like every PIN).

// { wallets, products }: what the bank offers and the accounts to use.
export const depositOffers = () => one(portalPost(DEPOSIT.OFFERS));
// { acct_product_id, tenor_id, principal, funding_acct_id? } -> rate and maturity.
export const depositQuote = (body) => one(portalPost(DEPOSIT.QUOTE, body));
// The quote's body + pin (+ payout_acct_id, narration) -> the ACTIVE deposit.
export const openDeposit = (body) => one(portalPost(DEPOSIT.OPEN, body));
export const loadDeposits = () => all(portalPost(DEPOSIT.LIST));
// One deposit with its interest, events and actions.
export const loadDeposit = (id) => one(portalPost(DEPOSIT.GET, { id }));
// instruction: PAYOUT | RENEW_PRINCIPAL | RENEW_PRINCIPAL_AND_INTEREST | HOLD
export const instructDeposit = (body) => one(portalPost(DEPOSIT.INSTRUCT, body));
export const precloseQuote = (id) => one(portalPost(DEPOSIT.PRECLOSE_QUOTE, { id }));
// A request: staff approve it.
export const precloseDeposit = (body) => portalPost(DEPOSIT.PRECLOSE, body);

// { wallets, products }
export const loanOffers = () => one(portalPost(LOAN.OFFERS));
// -> { disclosure, eligibility }
export const loanQuote = (body) => one(portalPost(LOAN.QUOTE, body));
// The quote's body + accept_terms + pin -> the application (UNDER_REVIEW).
export const applyLoan = (body) => one(portalPost(LOAN.APPLY, body));
export const loadApplications = () => all(portalPost(LOAN.APPLICATIONS));
export const loadApplication = (id) => one(portalPost(LOAN.APPLICATION_GET, { id }));
export const withdrawApplication = (body) => portalPost(LOAN.WITHDRAW, body);
export const loadLoans = () => all(portalPost(LOAN.LIST));
// One loan with `due`, `schedule` and `actions`.
export const loadLoan = (id) => one(portalPost(LOAN.GET, { id }));
// { id, amount?, pin } -> how it was split and the new facility_status.
export const repayLoan = (body) => one(portalPost(LOAN.REPAY, body));
export const settlementQuote = (id) => one(portalPost(LOAN.SETTLEMENT_QUOTE, { id }));
// { id, expected_total, pin }
export const settleLoan = (body) => one(portalPost(LOAN.SETTLE, body));
