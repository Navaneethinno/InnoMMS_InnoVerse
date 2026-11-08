import { bulkPayoutAdd, bulkPayoutCheck, bulkPayoutGet, bulkPayoutList, bulkPayoutResultFile, bulkPayoutTemplate, bulkPayoutVerb } from "@/Services/Finance/bulkPayout.api";

// The calls the bulk payouts screen makes, through the hook layer. One stable object.
const actions = { template: bulkPayoutTemplate, check: bulkPayoutCheck, add: bulkPayoutAdd, list: bulkPayoutList, get: bulkPayoutGet, verb: bulkPayoutVerb, resultFile: bulkPayoutResultFile };
export const useBulkPayoutActions = () => actions;
