import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Agents module: agent cash, the sign-ups an agent started (and a new
// assisted sign-up), a super agent's agents.
const AgentCash = lazy(() => import("@/Components/Agents/AgentCash/AgentCash"));
const Signups = lazy(() => import("@/Components/Agents/Signups/Signups"));
const AssistedSignup = lazy(() => import("@/Components/Agents/Signups/AssistedSignup"));
const MyAgents = lazy(() => import("@/Components/Agents/MyAgents/MyAgents"));
export const agentsRoutes = [
  { path: "agent", element: pageElement(AgentCash) },
  { path: "signups", element: pageElement(Signups) },
  { path: "signups/new", element: pageElement(AssistedSignup) },
  { path: "my-agents", element: pageElement(MyAgents) },
];
