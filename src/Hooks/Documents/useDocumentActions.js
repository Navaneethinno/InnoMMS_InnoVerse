import { listDocuments, getDocument, acceptDocuments, rememberConsent, takeConsent } from "@/Services/Documents/documents.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { listDocuments, getDocument, acceptDocuments, rememberConsent, takeConsent };
export const useDocumentActions = () => actions;
