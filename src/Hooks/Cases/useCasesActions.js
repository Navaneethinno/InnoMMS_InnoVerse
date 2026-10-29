import { listCases, getCase, uploadCaseFile, countCases, listCaseCategories, openCase, withdrawCase, replyToCase, downloadCaseFile } from "@/Services/Cases/cases.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { listCases, getCase, uploadCaseFile, countCases, listCaseCategories, openCase, withdrawCase, replyToCase, downloadCaseFile };
export const useCasesActions = () => actions;
