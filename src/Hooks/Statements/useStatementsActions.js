import { listStatements, loadStatement, downloadStatement, exportHistory } from "@/Services/Statements/statements.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { listStatements, loadStatement, downloadStatement, exportHistory };
export const useStatementsActions = () => actions;
