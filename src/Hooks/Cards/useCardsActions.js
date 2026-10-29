import { loadCards, loadCard, loadOffers, issueCard, requestCard, cancelRequest, activateCard, setCardPin, changeCardPin, resetCardPin, setCardStatus, loadCardDetails, reissueCard, quoteCardMove, sendCardMove } from "@/Services/Cards/cards.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { loadCards, loadCard, loadOffers, issueCard, requestCard, cancelRequest, activateCard, setCardPin, changeCardPin, resetCardPin, setCardStatus, loadCardDetails, reissueCard, quoteCardMove, sendCardMove };
export const useCardsActions = () => actions;
