import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";
import { createOnboardingApi } from "@/Services/Onboarding/onboardingApiFactory";

const { AGENT } = API_ENDPOINTS;

// The agent wallet (float) on its own: { acct_num, wallet_purpose: AGENT_FLOAT,
// currency_code, currency_decimals, avail_bal, ledger_bal, status_name, ... }.
// A merchant that is not an agent is refused (portal.agent_required).
export const loadFloat = async () => (await portalPost(AGENT.FLOAT)).data;

// The sign-ups this agent started, newest first: { items: [{ reference_id,
// party (CUSTOMER | MERCHANT), kind, name, phone_number, status, started_at,
// completed_at }], total, page, limit }. Every filter is optional.
export const loadSignups = async ({
  party,
  status,
  page = 1,
  limit = 20,
} = {}) => {
  const { rows } = await portalPost(AGENT.SIGNUPS, {
    ...(party ? { party } : {}),
    ...(status ? { status } : {}),
    page,
    limit,
  });
  const [first] = rows;
  if (first && Array.isArray(first.items))
    return {
      items: first.items,
      total: first.total ?? first.items.length,
      page: first.page ?? page,
    };
  const items = rows.filter((row) => row?.reference_id);
  return { items, total: items.length, page };
};

// A super agent's agents with their agent wallets: [{ entity_type, entity_id,
// name, phone_number, tier, status, float_acct_num, float_balance }].
export const loadAgents = async () => {
  const { rows } = await portalPost(AGENT.AGENTS);
  const inner =
    rows.length === 1 && Array.isArray(rows[0]?.items) ? rows[0].items : null;
  return (
    inner ?? rows.filter((row) => row?.entity_id != null || row?.phone_number)
  );
};

// Assisted sign-up: the self sign-up flows, run with the agent's session.
export const assistedFlows = {
  customerIndividual: createOnboardingApi(
    API_ENDPOINTS.ASSISTED_CUSTOMER_INDIVIDUAL,
    { signedIn: true },
  ),
  customerCorporate: createOnboardingApi(
    API_ENDPOINTS.ASSISTED_CUSTOMER_CORPORATE,
    { signedIn: true },
  ),
  agentIndividual: createOnboardingApi(
    API_ENDPOINTS.ASSISTED_AGENT_INDIVIDUAL,
    { signedIn: true },
  ),
  agentCorporate: createOnboardingApi(API_ENDPOINTS.ASSISTED_AGENT_CORPORATE, {
    signedIn: true,
  }),
};
