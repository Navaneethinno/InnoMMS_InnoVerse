import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalDownload, portalPost } from "@/Services/api/portalRequest";

const { STATEMENT, ACCOUNT } = API_ENDPOINTS;

// The merchant's statements, newest first: [{ id, acct_num, period_from,
// period_to, opening_balance, closing_balance, total_credits, total_debits,
// txn_count, email_delivery, created_at }].
export const listStatements = async ({ acctNum, page = 1, limit = 20 } = {}) =>
  (await portalPost(STATEMENT.LIST, { ...(acctNum ? { acct_num: acctNum } : {}), page, limit })).rows;

// One statement with its `lines` (date, rrn, description, operation_type,
// amount, balance).
export const loadStatement = async (id) => (await portalPost(STATEMENT.GET, { id })).data;

// CSV files: resolve to { blob, filename }.
export const downloadStatement = (id) => portalDownload(STATEMENT.DOWNLOAD, { id });
export const exportHistory = ({ from, to, acctNum }) => portalDownload(ACCOUNT.HISTORY_EXPORT, { from, to, ...(acctNum ? { acct_num: acctNum } : {}) });
