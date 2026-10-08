// What a printed receipt needs, from a receipt as the API returns it (rrn,
// txn_short_desc, txn_time, currency_code, txn_amount, fee_amount, entry_amount,
// acct_mask, status, receipt_payload { fee, total_debit, from, to, reason }...).
// `extras` (the quote and the signed-in customer) fill what the receipt leaves
// out.
//
// Optional receipt fields an institution can send to make the slip its own
// (each is used when present, with a sensible default when not):
//   institution_name, institution_address, institution_phone  - the header
//   receipt_footer                                           - closing lines
//   status_name                                              - e.g. "Completed"
// `toPhone` is the number paid, for when the receipt names no one. `note` is
// what the customer wrote: the receipt's own `reason` is empty without one.
export function receiptToTransaction(receipt = {}, { quote, user, rrn, toPhone, note } = {}) {
  const payload = receipt.receipt_payload ?? {};
  return {
    title: receipt.txn_short_desc ?? receipt.txn_type_name,
    institution: receipt.institution_name,
    headerLines: [receipt.institution_address, receipt.institution_phone].filter(Boolean),
    footerLines: receipt.receipt_footer ? String(receipt.receipt_footer).split(/\r?\n/).filter(Boolean) : null,
    currency: receipt.currency_code ?? quote?.currency_code,
    amount: receipt.txn_amount ?? quote?.amount,
    fee: quote?.fee?.total_charge ?? payload.fee ?? receipt.fee_amount,
    total: payload.total_debit ?? quote?.total_debit,
    from: { name: payload.from?.name ?? receipt.customer_name ?? quote?.from?.name ?? user?.name, account: payload.from?.acct ?? quote?.from?.acct_num },
    to: { name: payload.to?.name ?? receipt.merchant_name ?? receipt.counterparty_name ?? quote?.to?.name ?? payload.to?.phone ?? toPhone, account: payload.to?.acct ?? quote?.to?.acct_num },
    wallet: receipt.acct_mask,
    // A card load / unload names the card ({ pan, product }).
    card: receipt.card ? [receipt.card.pan, receipt.card.product].filter(Boolean).join(" · ") : null,
    reason: note || payload.note || payload.reason,
    dateTime: receipt.txn_time,
    status: receipt.status_name ?? receipt.status,
    reference: receipt.rrn ?? rrn,
    balanceAfter: receipt.entry_amount,
  };
}

// The words on the slip that are not figures: the name on top (the
// institution's), the line under it, the heading (what the transaction is, as
// the API names it), and the closing lines.
export function receiptTexts(tx, t, brand) {
  const title = tx.title || t("pos.moneySentPlain");
  return {
    name: tx.institution || brand,
    header: tx.headerLines ?? [],
    subtitle: `${t("brand.portal")} \u00b7 ${title}`,
    heading: `*** ${title.toUpperCase()} ***`,
    footer: tx.footerLines?.length ? tx.footerLines : [t("pos.thanks", { brand: tx.institution || brand }), t("pos.keep")],
  };
}
