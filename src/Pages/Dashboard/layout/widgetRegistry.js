import { flowLayout } from "./gridLayout";
import {
  ActiveMerchantsWidget,
  KycLevelsWidget,
  MyRequestsWidget,
  OnboardingInProgressWidget,
  OnboardingTrendWidget,
  PendingRequestsWidget,
  RecentMerchantsWidget,
  RequestBreakdownWidget,
} from "../widgets/MerchantWidgets";

/**
 * @typedef {object} WidgetDefinition
 * @property {import("react").ComponentType} component  Renders the widget body.
 * @property {string} titleKey   dashboard-namespace i18n key.
 * @property {string} dataId     The summary widget it reads (hidden when the
 *                               server says this user can't see it).
 * @property {number} w          Default width in grid columns (1..MAX_SPAN).
 * @property {number} h          Default height in grid rows.
 * @property {number} minH       Smallest height the card can be resized to.
 */

// The grid: GRID_COLS columns of ROW_HEIGHT px rows. The server accepts a
// width of 1 or 2 columns, so MAX_SPAN caps the horizontal resize.
export const GRID_COLS = 4;
export const MAX_SPAN = 2;
export const ROW_HEIGHT = 36;

const stat = (component, titleKey, dataId) => ({ component, titleKey, dataId, w: 1, h: 4, minH: 3 });

/**
 * Every widget on this portal's dashboard, by id. Ids start with "mms." so
 * this portal's places never mix with the admin panel's, which saves under
 * the same dashboard key. The key order is the default layout.
 * @type {Record<string, WidgetDefinition>}
 */
export const WIDGET_REGISTRY = {
  "mms.pendingRequests": stat(PendingRequestsWidget, "pendingRequests", "pendingRequests"),
  "mms.myRequests": stat(MyRequestsWidget, "myRequests", "myRequests"),
  "mms.activeMerchants": stat(ActiveMerchantsWidget, "activeMerchants", "activeCustomers"),
  "mms.onboardingInProgress": stat(OnboardingInProgressWidget, "onboardingInProgress", "onboardingInProgress"),
  "mms.onboardingTrend": { component: OnboardingTrendWidget, titleKey: "onboardingTrend", dataId: "onboardingTrend", w: 2, h: 9, minH: 6 },
  "mms.requestBreakdown": { component: RequestBreakdownWidget, titleKey: "requestBreakdown", dataId: "requestBreakdown", w: 1, h: 9, minH: 4 },
  "mms.kycLevels": { component: KycLevelsWidget, titleKey: "kycLevels", dataId: "kycLevels", w: 1, h: 9, minH: 6 },
  "mms.recentMerchants": { component: RecentMerchantsWidget, titleKey: "recentMerchants", dataId: "recentOnboarding", w: 2, h: 9, minH: 5 },
};

export const defaultLayout = () => flowLayout(WIDGET_REGISTRY, Object.keys(WIDGET_REGISTRY).map((id) => ({ id })), { cols: GRID_COLS, maxSpan: MAX_SPAN });
