import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { CARD, ACCOUNT } = API_ENDPOINTS;
const data = async (call) => (await call).data;

// The customer's cards. `pin` is always the transaction PIN; `card_pin` the
// card's own. Calls that charge money take an `idempotency_key` (one per
// tap, reused on a retry, so nothing is charged twice).

// { cards: [...], requests: [...] }
export const loadCards = async () => (await data(portalPost(CARD.list))) ?? { cards: [], requests: [] };
// One card, with its `history`.
export const loadCard = (id) => data(portalPost(CARD.get, { id }));
// The card products the customer can get now, with their fees.
export const loadOffers = async () => {
  const { rows } = await portalPost(CARD.offers);
  const inner = rows.length === 1 ? (rows[0]?.offers ?? rows[0]?.items) : null;
  return Array.isArray(inner) ? inner : rows.filter((row) => row?.card_product_id);
};

export const issueCard = (body) => data(portalPost(CARD.issue, body));
// A personalised card ({ card_product_id }) or a virtual card's plastic ({ id }).
export const requestCard = (body) => data(portalPost(CARD.request, body));
export const cancelRequest = (id) => portalPost(CARD.request_cancel, { id });
export const activateCard = (id) => portalPost(CARD.activate, { id });
export const setCardPin = (body) => portalPost(CARD.pin_set, body);
export const changeCardPin = (body) => portalPost(CARD.pin_change, body);
export const resetCardPin = (body) => portalPost(CARD.pin_reset, body);
// to: BLOCKED | LOST | STOLEN (with an optional reason), or ACTIVE with the PIN.
export const setCardStatus = (body) => portalPost(CARD.status, body);
// { pan, expiry, cvv, name_on_card }: secrets, shown briefly and never kept.
export const loadCardDetails = (body) => data(portalPost(CARD.details, body));
// { replaced, card, request }
export const reissueCard = (body) => data(portalPost(CARD.reissue, body));

// Loading (CARD_LOAD, wallet -> card) and unloading (CARD_UNLOAD, card ->
// wallet) use the payment quote and send. `fromAcctNum` names the wallet
// (both ways) when the customer has more than one.
const moveBody = ({ txnType, cardId, amount, fromAcctNum }) => ({ txn_type: txnType, card_id: cardId, amount, ...(fromAcctNum ? { from_acct_num: fromAcctNum } : {}) });
export const quoteCardMove = (move) => data(portalPost(ACCOUNT.QUOTE, moveBody(move)));
export const sendCardMove = ({ clientReference, pin, ...move }) => data(portalPost(ACCOUNT.SEND, { ...moveBody(move), client_reference: clientReference, ...(pin ? { pin } : {}) }));
