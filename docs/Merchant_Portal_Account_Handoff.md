# Merchant Portal and App: Sign-in, Transaction PIN, Payments and Refunds

For the merchant web portal and mobile app frontends. Onboarding is unchanged (Merchant Onboarding handoffs). This
covers what an **approved** merchant does after onboarding:

- sign in and keep their access;
- their transaction PIN;
- see their wallets and the payments they received, refund customers, and view history and receipts.

The calls are the customer portal's (Customer_Portal_Account_Handoff.md) under `/merchant...`

Note: This is in the merchant namespace, not customer; the endpoint family is different and there are merchant-specific
refinements below.

## Conventions
- **Base URL:** `https://etakuapi.innovitegrasuite.com`. Web calls are under `/merchant/web/...` and app calls under
  `/merchant/app/...`; a session only works on the channel it was opened on.
- **Every call** is a `POST` with a JSON body.
- **Headers:**
  - **Before sign-in:** `Authorization: Basic <merchantportal credential>`.
  - **Signed in:** `Authorization: Bearer <access_token>`.
  - Always send the `Deviceinfo` header.
- **Reply:** `{status, code, message, remark, data}`. Show `message`. Amounts are decimal strings and times are UTC.
- **Session ended:** a 401 "Your Session Has Ended: Sign In Again" means refresh (M3) or sign in again.

---

## M1. Activating access
The login id is the email or mobile number the merchant onboarded with.

1. `/merchant/{web|app}/auth/otp` `{"inst_profile_id": 2, "login_id": "+258890708662", "purpose": "ACTIVATE"}` replies
   `{otp_ref, expires_at, sent_to}`.
   - A 6-digit code lasts 10 minutes and allows 5 tries.
   - The reply is the same whether or not the contact is a merchant.
   - At most 5 codes an hour.
2. `/merchant/{web|app}/auth/activate` `{otp_ref, otp, password, pin}` replies `{"activated": true}`.
   - **Password:** 8–64 characters, with a letter and a digit.
   - **PIN:** 4–6 digits; repeated digits and runs (1234, 4321) are refused.

## M2. Sign in: `/merchant/{web|app}/auth/login`
**Body:** `{inst_profile_id, login_id, password}`.

**Reply:** `{access_token (15 min), refresh_token (30 days), session_id, party: "MERCHANT", entity_type: "MERCH_INDV" | "MERCH_CORP", entity_id, name, pin_set, pin_locked}`.

5 wrong passwords lock sign-in for 30 minutes.

## M3. Session
- **Refresh:** `/merchant/{web|app}/auth/refresh` `{refresh_token}` (basic credential). Keep the **new** refresh
  token from the reply, because the old one stops working.
- **Who is signed in:** `/merchant/{web|app}/auth/me` `{}`.
- **Sign out:** `/merchant/{web|app}/auth/logout`: `{}` for this session, `{"all": true}` for every device.

## M4. Password and PIN
These are the same as the customer portal (C5, C6), under `/merchant/{web|app}/auth/`:
- `otp` with `purpose: RESET_PASSWORD`, then `password_reset {otp_ref, otp, password}`: ends every session;
- `password_change {current, new}`;
- `pin_change {current, new}`;
- `pin_reset_start {}`, then `pin_reset {otp_ref, otp, pin}`: unlocks a locked PIN (3 wrong PINs lock it).

---

## M5. Wallets: `/merchant/{web|app}/account/wallets` `{}`
**Reply:** the merchant's Active wallets: `acct_num`, `currency_code`, `avail_bal`, `ledger_bal`, product names.

Customers pay the merchant at its wallet number. Show it (and a QR of it, if you wish) for customers to pay.

## M6. Payments received and history: `/merchant/{web|app}/account/history`
**Body:** `{page, limit, acct_id?, txn_type?, from?, to?}`.

**Reply:** `{items, total, page}`, newest first:
- a customer's payment appears as `txn_type: MERCHANT_PAYMENT`, `direction: CR`, description "Payment received";
- `amount` is the price paid; `fee_amount` is the merchant's discount fee if the institution charges one;
  `net_amount` is what reached the wallet;
- `counterparty_name` is the customer.

Refunds appear as `MERCHANT_REFUND` with `direction: DR`, and reversals as `REVERSAL`. To show only payments, filter
with `txn_type: "MERCHANT_PAYMENT"`.

## M7. One payment: `/merchant/{web|app}/account/transaction` `{"rrn": "627601000188"}`
**Reply:** `{rrn, status, txn_type, tran_date_time, currency_code, txn_amount, fee_amount, my_side: [...], org_rrn, receipt, refund_rrns, refundable}`.
- **`refundable`** (a payment to this merchant, still POSTED) is what is left to refund. Offer "Refund" when it's above
  0.
- **`refund_rrns`** are the refunds already made.
- **`status: REVERSED`** means the institution reversed the payment, so it can't be refunded.

## M8. Refund a customer

### Quote: `/merchant/{web|app}/account/quote`
```json
{"txn_type": "MERCHANT_REFUND", "org_rrn": "627601000188", "amount": "20"}
```
The payment is named by its RRN. The money goes back from the wallet that was paid to the customer's wallet that paid.

**Reply:** the plan, with `refundable` (before this refund), `from` (the merchant's wallet), `to` (the customer), `fee`
(usually none for refunds), `total_debit` and `pin_required`.

Refusals:
- "At Most 30.00 Of This Payment Is Left To Refund";
- "This Payment Is Already Fully Refunded";
- "The Transaction Was Not Found" (not a payment to this merchant).

### Send: `/merchant/{web|app}/account/send`
The quote's body, plus:
```json
{"client_reference": "pos-uuid-…", "pin": "2580", "note": "item returned"}
```
- `client_reference` is required. Reuse it on a retry: the same reference never refunds twice (`replayed: true`).

**Reply:** `{…plan, txn_id, rrn, replayed, receipt}`. Several partial refunds are allowed, up to the payment's amount.

## M9. Receipts: `/merchant/{web|app}/account/receipt`
`{"rrn": "…"}` is that receipt, `{}` the last one, and `"duplicate": true` counts a reprint (show "DUPLICATE" when
`print_count > 0`). The fields are those of the customer receipt (C12).

## M10. Messages
- **Merchant messages:** an SMS / email for each payment received and each refund made, plus security notices.
  Institutions can reword them in the Notification Center.
- **Not live yet:** there's no SMS or email gateway, so messages, one-time codes included, are queued but not
  delivered. Testers get codes from the platform team for now.

## M11. Refusals
The same as the customer portal (C14), plus the refund messages in M8. A refund the system refuses is recorded on the
institution's side, and nothing leaves the wallet.
