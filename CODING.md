# Coding Guide — InnoVerse Merchant Portal

How this codebase is structured and the conventions to follow when changing it. Read this before adding a feature. `README.md` covers setup and API-integration status; this file covers *how to write code here*.

## Stack

React 18 + Vite 6 (JS/JSX, no TypeScript) · React Router v6 (data router) · Redux Toolkit (session only) · axios · Tailwind 3 (CSS-variable colours) · i18next (en/pt/ar) · Radix UI primitives · lucide-react icons · react-toastify · react-joyride (onboarding tour) · react-grid-layout + recharts (dashboard) · Playwright (e2e).

Commands: `npm run dev` (port 5174) · `npm run lint` · `npm run build` · `npm run test:e2e`.

Import alias: `@/` → `src/` (always use it; `./Sibling` is fine inside one folder, never `../`).

## Folder layout and responsibilities

```
src/
  main.jsx                  Boot: initTheme → Redux Provider → BrandingLoader → RouterProvider → Toast
  Router/                   Route composition only (no UI logic), one route list per sidebar module
  Components/<Module>/<Menu>/  Screens, mirroring the sidebar (see below)
  Hooks/<Feature>/          State + side effects for a feature (one hook per screen/flow)
  Services/<Api group>/     API calls only (*.api.js), one file per API_ENDPOINTS group.
                            Services/api/ = shared HTTP plumbing
  Redux/                    Cross-route state (auth session only)
  Utils/Constant.jsx        ALL endpoint paths, env vars, storage keys, config constants
  Utils/Config/             Sidebar/route metadata (routeConfig.js) and the tour's routes
  Utils/I18n/               i18n setup + flat locale maps (en.js, pt.js, ar.js)
  Utils/Lib/                Pure helpers (theme, branding, notifications, format, roles, cn utils)
public/models/              The face-detection model (CameraCapture)
```

### Screens mirror the sidebar

The sidebar is the API's menu (`/merchant/web/menu`), flat, in the order the API gives; `Utils/Config/routeConfig.js` (`navScreens`) maps each menu key to its route, label key and icon. Screens are grouped into the modules below and live at `Components/<Module>/<Menu>/<Screen>.jsx`, with that menu's dialogs, forms and helpers in the same folder. A module with a single menu is just `Components/<Menu>/`.

```
Components/
  Common/ Layout/ Tour/       shared building blocks, the signed-in shell, the guided tour
  Auth/ Onboarding/ Documents/  public (pre-login) screens: sign-in, sign-up, legal documents
  Dashboard/                  dashboard                      /dashboard      (layout/, widgets/)
  Payments/                   Send/          send            /send
                              MobileMoney/   mobile_money    /mobile-money
                              BankTransfer/  bank_transfer   /bank-transfer
                              Airtime/       airtime         /airtime
                              Electricity/   electricity     /electricity
                              Bills/         bills           /bills
                              MyCode/        my_code         /my-code
  Transactions/               History/       history         /history
                              Statements/    statements      /statements
  Cards/                      cards                          /cards
  Finance/                    Deposits/      deposits        /deposits
                              Loans/         loans           /loans
  Messages/                   Notifications/ notifications   /notifications
                              Cases/         cases           /cases
  Account/                    Profile/       profile         /profile
                              Security/      security        /security
                              Verification/  (from Profile)  /verification
  Agents/                     AgentCash/     agent           /agent
                              Signups/       signups         /signups, /signups/new
                              MyAgents/      my_agents       /my-agents
  Stores/                     Stores/        stores          /stores (users, hours, POS profiles/shifts)
                              Terminals/     terminals       /terminals
```

`Router/` follows the same grouping: `authenticatedRoutes.jsx` spreads `dashboardRoutes`, `paymentsRoutes`, `transactionsRoutes`, `cardsRoutes`, `financeRoutes`, `messagesRoutes`, `accountRoutes`, `agentsRoutes` and `storesRoutes` (one `Router/<module>Routes.jsx` each); `publicRoutes.jsx` holds the pre-login screens plus `onboardingRoutes`.

Something several modules use goes to `Components/Common/` (payment pieces in `Common/Payments/`). Current deliberate exceptions: the onboarding engine (`Onboarding/OnboardingWizardView.jsx`, `CategoryField.jsx`) is reused by `Account/Verification` and `Agents/Signups`, and the dashboard's recent-transactions widget reuses `TransactionLine` from `Transactions/History/History.jsx`. Hooks and services are grouped by feature / API group, not by module, because several screens share them (e.g. `Services/Account/account.api.js` serves Send, History and every Payments screen).

## The layering rule

**Component → Hook → Service → `Services/api/client`**

- **Components** render and call hook functions. No axios, no endpoint strings, no storage access, and **no imports from `@/Services`** (none do today).
- **Hooks** own loading/error/data state, cancellation (`AbortController`), retries, toasts, and localStorage persistence of flow state. See `Hooks/Profile/useProfile.js` for a minimal load/reload hook, `Hooks/Layout/useMenuAndBadges.js` and `Hooks/Dashboard/` for shell/dashboard data.
- **Action hooks** (`Hooks/<Feature>/use<Feature>Actions.js`, e.g. `useAccountActions`, `useCardsActions`, `useStoreActions`, `useAuthActions`) hand a screen the service calls it makes as one stable object, so they are safe in effect/callback dependencies. A screen that keeps its own loading/error state calls them from there; new screens should prefer a dedicated `use<Screen>` hook that owns that state. Add a service function to the feature's action hook when a screen needs it.
- **Live updates**: `Services/api/liveUpdates.js` keeps the socket (`connectLive`); screens subscribe through `Hooks/Live/useLiveUpdates.js` (`useWalletChanged`, `useCardChanged`, ... and `useLiveChannel` for the shell).
- **Services** are thin: build the request, unwrap the response, throw normalized errors. Endpoints come from `API_ENDPOINTS` in `Utils/Constant.jsx` via `requireEndpoint()`, which throws `ApiConfigurationError` when a path is `null`.
- **Redux** holds only the auth session (`authSlice`: `sessionEstablished`, `sessionCleared`). Keep form/local state out of Redux.

## API conventions

- One axios instance: `Services/api/client.js` — attaches Bearer token, single-flight refresh on 401, one retry, dispatches `merchant:session-expired` on refresh failure.
- Portal (pre-login) calls use `skipAuth: true` + `PORTAL_AUTHORIZATION` Basic header + `apiLanguageHeader()` (`x-api-lang`). See `Services/Onboarding/onboardingApiFactory.js`.
- Backend envelope: `{ status, message, data: [...] }`. `status: "fail"` → throw `ApiRequestError` via `toApiRequestError(payload, status, fallback)`.
- **Show the API's `message` as-is** (it's already localized by `x-api-lang`). Never show `remark`. Reasons live in `error.problems` (`data[0].problems`).
- **Never invent endpoints.** Unconfirmed paths stay `null` in `Constant.jsx`. Temporary mocks must be gated on the endpoint being null (`requireEndpoint` throws `ApiConfigurationError` for a null path).
- **File fields** (`input: "file"`): upload first (multipart, `uploadFile` in the onboarding factory) → field value is the returned `path` → save the section as usual. Previews download by path as a Blob (`downloadFile`). Limits come from `FILE_UPLOAD` in `Constant.jsx`, narrowed by the row's document type (`file_formats`, `max_file_size_kb`).
- **Stored file paths** (uploads, logo, favicon, `image_src`) are relative to the server's `assets/` folder — pass them back exactly as received. Branding images come from `/branding/file`.
- Onboarding flows (individual/corporate) are built from `createOnboardingApi(endpoints)`; a new flow = new endpoint group in `Constant.jsx` + a one-line service file.

## Routing

- `Router/Router.jsx` composes `publicRoutes` + `authenticatedGroup`.
- Each sidebar module has its own route file (`Router/<module>Routes.jsx`, e.g. `paymentsRoutes.jsx`) exporting an array; `onboardingRoutes.jsx` holds sign-up.
- Public routes → spread into `publicRoutes.jsx`. Protected module lists → spread into `authenticatedRoutes.jsx` (wrapped in `ProtectRoute` + `AppLayout`). `Router/index.js` re-exports the two groups.
- A new sidebar screen also needs its menu key in `navScreens` (`Utils/Config/routeConfig.js`); the API's menu decides whether it is shown.
- Pages are always `lazy()` and wrapped with `pageElement(Page)` from `routeSupport.jsx` (Suspense + stale-chunk reload boundary). Don't edit `routeSupport.jsx` (it's prettier-ignored, kept verbatim).

## UI conventions

- **Reuse `Components/Common` first**: `Button`, `TextField`, `Modal`, `ConfirmDialog`, `FilterSelect`, `OtpInput`, `PhoneField`, `DatePicker`, `FileUploadField`, `EmptyState`, `ErrorState`, `LoadingState`, `Spinner`, `PageHeader`, `PageTitle`, `AppHeader`, `ListControls`, etc., and `Common/Payments/` (wallet panel, limits, POS receipt, saved accounts, transaction PIN) for money-moving screens.
- **Colours**: only the semantic Tailwind tokens — `forest` (primary/dark), `lime` (secondary/accent), `paper`, `surface`, `ink`, `on-secondary`, `slate-*`. They map to CSS variables in `styles.css`, which bank branding (`Utils/Lib/branding.js`) and dark mode (`.dark` on `<html>`) override. Never hard-code hex colours.
- **Fonts**: `src/fonts.css` is the single source (`--font-sans`).
- Toasts go through `notifications.success/error/info` (`Utils/Lib/notifications.js`), not `toast` directly.
- Icons: `lucide-react`.

## i18n

- All static UI copy uses `t("feature.key")`. Keys are flat dotted strings (`keySeparator: false`) — add every key to `locales/en.js`, `locales/pt.js` and `locales/ar.js`.
- Arabic is right-to-left: `i18n.js` sets `<html dir>`. Use start/end utilities (`ms-`, `pe-`, `start-`, `text-end`, `rounded-s`, `border-e`), never left/right, except `left-1/2` centring; side-specific motion and icons are mirrored in the RTL block at the end of `styles.css`.
- API-provided text (messages, field labels, sections) is rendered as received — don't translate it client-side.

## Storage

- All keys live in `STORAGE_KEYS` (`Constant.jsx`), prefixed `innoverse-merchant:`.
- Wrap every `localStorage`/`sessionStorage` access in `try/catch` — the app must work when storage is blocked.
- Session tokens: `Services/api/authStorage.js` only.

## Code style

- Function components + hooks; default export for components, named exports for hooks/services/utils.
- Files: `PascalCase.jsx` for components, `useThing.js` for hooks, `thing.api.js` for services.
- Comments explain *why* (backend contract, edge cases), in plain prose above the code — match the existing tone.
- ESLint: `react-hooks` rules enforced; unused vars error (prefix `_` for intentionally unused args).
- Run `npm run lint` and `npm run build` before committing.

## Adding a feature — checklist

1. Endpoint(s) → `API_ENDPOINTS` in `Utils/Constant.jsx` (null if unconfirmed).
2. `Services/<Api group>/<group>.api.js` using `portalPost` / `api` / `requireEndpoint`.
3. `Hooks/<Feature>/use<Feature>.js` for state, cancellation, errors.
4. `Components/<Module>/<Menu>/<Screen>.jsx` built from `Components/Common` (see "Screens mirror the sidebar").
5. Add the lazy route (`pageElement`) to that module's `Router/<module>Routes.jsx` (a new module: new file, spread into `authenticatedRoutes.jsx`), and the menu key to `navScreens`.
6. i18n keys in `en.js`, `pt.js` and `ar.js`.
7. Lint + build.

## Known gaps / notes

- `playwright.config.js` points to `./tests`, but `tests/` is git-ignored and not committed.
- Many screens still keep their loading/error state inline and reach services through the feature action hooks rather than a per-screen state hook; a few small in-file hooks (`useSavedAccounts`, `useProviders`, `useTransfers`, `useCaseFiles`, `useCategories`) still live next to their components. Lift them into `Hooks/` when those screens are next changed.
- `Hooks/Dashboard/useDashboardLayout.js` imports the widget registry from `Components/Dashboard/layout/widgetRegistry.js` (no import cycle).
- `Hooks/useDocuments.js` sits at the Hooks root (it is imported by `Auth/Login.jsx`).
- The largest files are `OnboardingWizardView.jsx` (~460 lines) and `useOnboardingWizard.js` (~770 lines) — the shared onboarding engine used by both individual and corporate flows; change them with both flows in mind.
