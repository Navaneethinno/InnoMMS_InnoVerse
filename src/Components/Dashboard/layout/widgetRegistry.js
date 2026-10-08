import { flowLayout } from "./gridLayout";
import { BalanceWidget, IncomeSpendingWidget } from "../widgets/StatWidgets";
import { CashFlowWidget } from "../widgets/ChartWidgets";
import { QuickActionsWidget, RecentTransactionsWidget, WalletsWidget } from "../widgets/ListWidgets";
import { CardsWidget, NotificationsWidget, StatementsWidget } from "../widgets/FeatureWidgets";

/**
 * @typedef {object} WidgetDefinition
 * @property {import("react").ComponentType} component  Renders the widget body.
 * @property {string} titleKey   i18n key.
 * @property {number} w          Default width in grid columns (1..MAX_SPAN).
 * @property {number} h          Default height in grid rows.
 * @property {number} minH       Smallest height the card can be resized to.
 */

// The grid: GRID_COLS columns of ROW_HEIGHT px rows. The server accepts a
// width of 1 or 2 columns, so MAX_SPAN caps the horizontal resize.
export const GRID_COLS = 4;
export const MAX_SPAN = 2;
export const ROW_HEIGHT = 36;

/**
 * Every dashboard widget, by id. The ids are the ones the server's layout uses
 * (letters, digits, _ and -); the grid and the saved layout work from ids, so a
 * new widget is one component plus one entry here. Key order is the default
 * layout (flowed left to right) for a merchant with none saved.
 * @type {Record<string, WidgetDefinition>}
 */
export const WIDGET_REGISTRY = {
  balances: { component: BalanceWidget, titleKey: "dash.totalBalance", w: 1, h: 5, minH: 3 },
  income_spending: { component: IncomeSpendingWidget, titleKey: "dash.incomeSpending", w: 1, h: 5, minH: 4 },
  quick_send: { component: QuickActionsWidget, titleKey: "dash.quickActions", w: 1, h: 5, minH: 4 },
  notifications: { component: NotificationsWidget, titleKey: "dash.notificationsWidget", w: 1, h: 5, minH: 4 },
  // Side by side, the same height: no gap under either.
  cash_flow: { component: CashFlowWidget, titleKey: "dash.cashFlow", w: 2, h: 10, minH: 6 },
  recent_transactions: { component: RecentTransactionsWidget, titleKey: "dash.recentTransactions", w: 2, h: 10, minH: 5 },
  wallets: { component: WalletsWidget, titleKey: "dash.accounts", w: 1, h: 6, minH: 3 },
  cards: { component: CardsWidget, titleKey: "dash.cardsWidget", w: 1, h: 6, minH: 4 },
  statements: { component: StatementsWidget, titleKey: "dash.statementsWidget", w: 1, h: 6, minH: 4 },
};

export const defaultLayout = () => flowLayout(WIDGET_REGISTRY, Object.keys(WIDGET_REGISTRY).map((id) => ({ id })), { cols: GRID_COLS, maxSpan: MAX_SPAN });
