import { loadFloat, loadSignups, loadAgents, assistedFlows } from "@/Services/Agent/agent.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { loadFloat, loadSignups, loadAgents, assistedFlows };
export const useAgentActions = () => actions;
