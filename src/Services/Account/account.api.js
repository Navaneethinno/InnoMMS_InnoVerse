import { API_ENDPOINTS } from "@/Utils/Constant";
import { rememberCurrencies } from "@/Utils/Lib/format";
import { portalPost } from "@/Services/api/portalRequest";

const { ACCOUNT, CONTACTS } = API_ENDPOINTS;
const data = async (call) => (await call).data;

// The merchant's Active wallets: { acct_num, currency_code, avail_bal,
// ledger_bal, acct_product_name, digital_product_name, status_name,
// opened_at }.
export const loadWallets = async () => {
  const { rows } = await portalPost(ACCOUNT.WALLETS);
  // One wallet per item, or a single item holding the list.
  const inner = rows.length === 1 ? (rows[0]?.wallets ?? rows[0]?.items) : null;
  const list = Array.isArray(inner) ? inner : rows.filter((row) => row?.acct_num);
  rememberCurrencies(list);
  return list;
};

// Income and spending per month, and the latest lines, worked out by the
// server: { currencies: [{ currency_code, currency_decimals, this_month: { month,
// income, spending }, monthly: [{ month, income, spending }] }],
// recent_transactions: [ ...up to 10 history lines ] }.
export const loadSummary = async ({ months = 6, currency } = {}) => {
  const { data } = await portalPost(ACCOUNT.SUMMARY, { months, ...(currency ? { currency } : {}) });
  rememberCurrencies(data?.currencies);
  return data ?? { currencies: [], recent_transactions: [] };
};

// The kinds of transaction, named in the portal's language: [{ code, direction
// (IN | OUT | BOTH), label, received_label? }].
export const loadTxnTypes = async () => (await portalPost(ACCOUNT.TXN_TYPES)).rows;

// What is left of each limit before anything is typed, per wallet: [{ acct_num,
// currency_code, types: [{ txn_type, limits: [{ limit_type, period, max_amount,
// used_amount, left_amount, ... }] }] }].
export const loadLimits = async (acctNum) => (await portalPost(ACCOUNT.LIMITS, acctNum ? { acct_num: acctNum } : {})).rows;

// Who a mobile number belongs to, before paying: { acct_num, name (masked),
// party (CUSTOMER | MERCHANT), currency_code }. A number with no account is
// refused with portal.payee_unknown (the caller treats that as "not a customer
// yet": it can still be paid).
export const checkPayee = (phoneNumber) => data(portalPost(ACCOUNT.PAYEE, { phone_number: phoneNumber }));

// Which of these numbers are e-taku customers: [{ phone_number, acct_num, name,
// party }]. Numbers with no account and the merchant's own number are left
// out. At most 500 numbers, in any format.
export const matchContacts = async (phoneNumbers) =>
  phoneNumbers.length ? (await portalPost(CONTACTS.MATCH, { phone_numbers: phoneNumbers.slice(0, 500) })).rows : [];

// The payee of a payment: the wallet when it is known, else the number.
const payeeBody = ({ toAcctNum, toPhone }) => (toAcctNum ? { to_acct_num: toAcctNum } : { to_phone_number: toPhone });

// Money waiting for a number: [{ id, phone_number, amount, currency_code, note,
// status (PENDING | CLAIMED | CANCELLED | RETURNED), created_at, can_cancel }].
// A page at a time (`limit` 20 by default, 100 at most); a page with fewer rows
// than `limit` is the last. `status` leaves out the others (PENDING: the ones
// that can still be acted on).
export const loadPhoneTransfers = async ({ status, page = 1, limit = 20 } = {}) =>
  (await portalPost(ACCOUNT.PHONE_TRANSFERS, { ...(status ? { status } : {}), page, limit })).rows;
// Takes the money back; resolves to a transaction like `send`.
export const cancelPhoneTransfer = (id) => data(portalPost(ACCOUNT.PHONE_TRANSFER_CANCEL, { id }));

// What a payment would cost, without making it. `txn_type`: P2P_TRANSFER to
// a person (the quote comes back as P2P_TO_PHONE, `to` null, when the number
// has no account yet: the money waits for them).
// A merchant's refund (MERCHANT_REFUND) names the payment it returns (`orgRrn`)
// instead of a payee.
// Agent cash-in and cash-out name the customer (`customer_phone_number`, or
// `customer_acct_num`) instead of a payee; a store sweep names both of the
// owner's wallets.
const targetBody = ({ toAcctNum, toPhone, orgRrn, customerPhone }) =>
  orgRrn ? { org_rrn: orgRrn } : customerPhone ? { customer_phone_number: customerPhone } : payeeBody({ toAcctNum, toPhone });
export const quotePayment = ({ txnType, toAcctNum, toPhone, orgRrn, customerPhone, amount, fromAcctNum }) =>
  data(portalPost(ACCOUNT.QUOTE, { txn_type: txnType, ...targetBody({ toAcctNum, toPhone, orgRrn, customerPhone }), amount, ...(fromAcctNum ? { from_acct_num: fromAcctNum } : {}) }));

// Makes the payment. `clientReference` is one per attempt and is reused when
// retrying: the same reference never pays twice (the second call returns the
// first payment with `replayed: true`).
// `customerPin`: on an agent's cash-out the customer approves with their own PIN
// (the agent's is not asked).
// `expectedCharge` (the quote's fee.total_charge) guards the price: if the fee
// at send time differs, nothing is posted and the reply is 409
// txn.quote_changed (re-quote and show the new figures).
export const sendPayment = ({ txnType, toAcctNum, toPhone, orgRrn, customerPhone, customerPin, amount, fromAcctNum, clientReference, pin, note, expectedCharge }) =>
  data(
    portalPost(ACCOUNT.SEND, {
      txn_type: txnType,
      ...targetBody({ toAcctNum, toPhone, orgRrn, customerPhone }),
      ...(customerPin ? { customer_pin: customerPin } : {}),
      ...(expectedCharge != null && expectedCharge !== "" ? { expected_total_charge: expectedCharge } : {}),
      amount,
      ...(fromAcctNum ? { from_acct_num: fromAcctNum } : {}),
      client_reference: clientReference,
      ...(pin ? { pin } : {}),
      ...(note ? { note } : {}),
    }),
  );

// Newest first, every module. Resolves to { items, total, page }.
// `refundable`: only payments received with something left to refund.
export const loadHistory = async ({ page = 1, limit = 20, acctId = null, txnType = "", from = "", to = "", refundable = false } = {}) => {
  // Only the filters that are set go out (no empty strings or nulls).
  const { rows } = await portalPost(ACCOUNT.HISTORY, { page, limit, ...(acctId ? { acct_id: acctId } : {}), ...(txnType ? { txn_type: txnType } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(refundable ? { refundable: true } : {}) });
  // One item { items, total, page }, or the lines themselves one per item.
  const [first] = rows;
  if (first && Array.isArray(first.items)) return { items: first.items, total: first.total ?? first.items.length, page: first.page ?? page };
  const items = rows.filter((row) => row?.rrn);
  return { items, total: items.length, page };
};

// The filters History offers: { categories: [{ code, label }], periods: [{ code,
// label, from, to }] (CUSTOM has no dates), today }.
export const loadHistoryFilters = async () => (await portalPost(ACCOUNT.HISTORY_FILTERS)).rows[0] ?? { categories: [], periods: [] };

export const loadTransaction = (rrn) => data(portalPost(ACCOUNT.TRANSACTION, { rrn }));

// `rrn` omitted = the merchant's last receipt. `duplicate` counts a reprint.
export const loadReceipt = ({ rrn, duplicate = false } = {}) =>
  data(portalPost(ACCOUNT.RECEIPT, { ...(rrn ? { rrn } : {}), ...(duplicate ? { duplicate: true } : {}) }));
