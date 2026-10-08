# Coding Guide — InnoVerse Merchant Portal

How this codebase is structured and the conventions to follow when changing it. Read this before adding a feature. `README.md` covers setup and API-integration status; this file covers *how to write code here*.

## Stack

React 18 + Vite 6 (JS/JSX, no TypeScript) · React Router v6 (data router) · Redux Toolkit (session only) · axios · Tailwind 3 (CSS-variable colours) · i18next (en/pt) · Radix UI primitives · lucide-react icons · react-toastify · react-joyride (onboarding tour) · dotLottie (animations) · Playwright (e2e).

Commands: `npm run dev` (port 5174) · `npm run lint` · `npm run build` · `npm run test:e2e`.

Import alias: `@/` → `src/` (always use it, never deep `../../`).

## Folder layout and responsibilities

```
src/
  main.jsx               Boot: initTheme → Redux Provider → BrandingLoader → RouterProvider → Toast
  Router/                Route composition only (no UI logic)
  Components/<Feature>/  UI. Common/ = reusable primitives; Layout/ = shell + ProtectRoute
  Hooks/<Feature>/       State + side effects for a feature (one hook per screen/flow)
  Services/<Feature>/    API calls only (*.api.js). Services/api/ = shared HTTP plumbing
  Redux/                 Cross-route state (auth session only)
  Utils/Constant.jsx     ALL endpoint paths, env vars, storage keys, config constants
  Utils/Config/          Route metadata
  Utils/I18n/            i18n setup + flat locale maps (en.js, pt.js)
  Utils/Lib/             Pure helpers (theme, branding, notifications, apiLanguage, cn utils)
  Pages/, assets/        Reserved
```

Empty feature folders (`Accounts`, `Profile`, `Support`, `Transactions`) hold `.gitkeep` placeholders — fill them in the same Components/Hooks/Services triple.

## The layering rule

**Component → Hook → Service → `Services/api/client`**

- **Components** render and call hook functions. No axios, no endpoint strings, no storage access.
- **Hooks** own loading/error/data state, cancellation (`AbortController`), retries, toasts, and localStorage persistence of flow state. See `Hooks/Dashboard/useDashboard.js` for the minimal pattern (`{ status: 'loading' | 'ready' | 'error', data, error, retry }`).
- **Services** are thin: build the request, unwrap the response, throw normalized errors. Endpoints come from `API_ENDPOINTS` in `Utils/Constant.jsx` via `requireEndpoint()`, which throws `ApiConfigurationError` when a path is `null`.
- **Redux** holds only the auth session (`authSlice`: `sessionEstablished`, `sessionCleared`). Keep form/local state out of Redux.

## API conventions

- One axios instance: `Services/api/client.js` — attaches Bearer token, single-flight refresh on 401, one retry, dispatches `merchant:session-expired` on refresh failure.
- Portal (pre-login) calls use `skipAuth: true` + `PORTAL_AUTHORIZATION` Basic header + `apiLanguageHeader()` (`x-api-lang`). See `Services/Onboarding/onboardingApiFactory.js`.
- Backend envelope: `{ status, message, data: [...] }`. `status: "fail"` → throw `ApiRequestError` via `toApiRequestError(payload, status, fallback)`.
- **Show the API's `message` as-is** (it's already localized by `x-api-lang`). Never show `remark`. Reasons live in `error.problems` (`data[0].problems`).
- **Never invent endpoints.** Unconfirmed paths stay `null` in `Constant.jsx`. Temporary mocks must be gated on the endpoint being null (pattern: `Services/Otp/otp.api.js`, accepted mock code `1111`).
- **File fields** (`input: "file"`): upload first (multipart, `uploadFile` in the onboarding factory) → field value is the returned `path` → save the section as usual. Previews download by path as a Blob (`downloadFile`). Limits come from `FILE_UPLOAD` in `Constant.jsx`, narrowed by the row's document type (`file_formats`, `max_file_size_kb`).
- **Stored file paths** (uploads, logo, favicon, `image_src`) are relative to the server's `assets/` folder — pass them back exactly as received. Branding images come from `/branding/file`; public images (country flags) from `publicFileUrl(path)` in `Constant.jsx`.
- Onboarding flows (individual/corporate) are built from `createOnboardingApi(endpoints)`; a new flow = new endpoint group in `Constant.jsx` + a one-line service file.

## Routing

- `Router/Router.jsx` composes `publicRoutes` + `authenticatedGroup`.
- Each feature has its own route file (`dashboardRoutes.jsx`, `onboardingRoutes.jsx`) exporting an array; re-export it from `Router/index.js`.
- Public routes → spread into `publicRoutes.jsx`. Protected routes → spread into `authenticatedRoutes.jsx` (wrapped in `ProtectRoute` + `AppLayout`).
- Pages are always `lazy()` and wrapped with `pageElement(Page)` from `routeSupport.jsx` (Suspense + stale-chunk reload boundary). Don't edit `routeSupport.jsx` (it's prettier-ignored, kept verbatim).

## UI conventions

- **Reuse `Components/Common` first**: `Button`, `TextField`, `Modal`, `ConfirmDialog`, `FilterSelect`, `OtpInput`, `HorizontalStepper`, `EmptyState`, `ErrorState`, `LoadingState`, `Spinner`, `PageHeader`, `AppHeader`, `UiTooltip`, etc.
- **Colours**: only the semantic Tailwind tokens — `forest` (primary/dark), `lime` (secondary/accent), `paper`, `surface`, `ink`, `on-secondary`, `slate-*`. They map to CSS variables in `styles.css`, which bank branding (`Utils/Lib/branding.js`) and dark mode (`.dark` on `<html>`) override. Never hard-code hex colours.
- **Fonts**: `src/fonts.css` is the single source (`--font-sans`).
- Toasts go through `notifications.success/error/info` (`Utils/Lib/notifications.js`), not `toast` directly.
- Icons: `lucide-react`.

## i18n

- All static UI copy uses `t("feature.key")`. Keys are flat dotted strings (`keySeparator: false`) — add every key to **both** `locales/en.js` and `locales/pt.js`.
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
2. `Services/<Feature>/<feature>.api.js` using `api` / `requireEndpoint`.
3. `Hooks/<Feature>/use<Feature>.js` for state, cancellation, errors.
4. `Components/<Feature>/<Feature>.jsx` built from `Components/Common`.
5. `Router/<feature>Routes.jsx` (lazy + `pageElement`), re-export in `Router/index.js`, spread into public or authenticated group.
6. i18n keys in `en.js` and `pt.js`.
7. Lint + build.

## Known gaps / notes

- Login and dashboard APIs are not yet specified (`AUTH.*`, `DASHBOARD.GET` are `null`).
- OTP is mocked until `OTP.SEND/VERIFY` are set.
- `playwright.config.js` points to `./tests`, but no `tests/` folder is currently committed.
- `SignUp.jsx` has hard-coded "Individual"/"Corporate" labels that bypass i18n.
- The largest files are `OnboardingWizardView.jsx` (~480 lines) and `useOnboardingWizard.js` (~380 lines) — the shared onboarding engine used by both individual and corporate flows; change them with both flows in mind.
