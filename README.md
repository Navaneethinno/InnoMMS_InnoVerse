# InnoVerse_MerchantPortal

Standalone merchant frontend. This directory is the application root; it neither imports nor depends on the admin application. The login screen and protected dashboard loading transition are implemented; dashboard content and APIs are pending.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
npm run lint
npm run build
```

Development uses port 5174 to avoid the admin's port. Production hosts must rewrite SPA routes (including `/login`) to `index.html`.

## API integration is intentionally pending

No merchant backend collection/spec has been supplied. No endpoint paths, credentials, fake sessions, or successful mock authentication are included. Submitting valid login fields shows a localized not-connected message and sends no request. Username (including email or mobile number)/password are provisional UI fields to confirm against the real merchant auth contract. Recovery, registration, and help actions explain that their flows are not available yet.

When the API contract arrives:

1. Record the verified collection/spec in `src/Utils/Constant.jsx`, then fill confirmed merchant endpoint values there only.
2. Set `VITE_API_BASE_URL` in a local `.env` from `.env.example`. Vite environment variables are public; never put secrets there.
3. Implement the request and session mappings in `Services/api/authContract.js`, including validating the returned token shape. Confirm the backend's token transport, refresh rotation, and error schema.
4. Connect `Services/Dashboard/dashboard.api.js` to the confirmed dashboard contract. Successful login already navigates to `/dashboard`; replace its ready-state placeholder with real dashboard content.
5. Verify real login, failed credentials, refresh, logout, and expiry against the merchant backend before deploying authentication.

The shared axios client includes auth headers, single-flight refresh and one retry. Merchant tokens use their own sessionStorage key, with in-memory fallback. JWT expiry checking is a client convenience, not server authorization. Redux stores user/session status, never passwords. Local input and loading state stay in the feature hook/component.

## Architecture

- `Components/Common`: reusable UI primitives (Radix handles modal/dropdown/tooltip accessibility). Reuse these before writing feature markup.
- `Components/Layout`: authenticated shell and merchant-only route protection.
- `Components/Auth`: independently designed login UI.
- `Hooks/Master`: reserved for confirmed merchant reference lookups; `Hooks/Auth` owns login state.
- `Services/api`: shared HTTP, storage, error/response normalization and pending contract mappings.
- `Services/Auth`: thin API wrapper, importing centralized endpoints only.
- `Redux`: cross-route session state.
- `Router`: composition-only root, public/authenticated groups and verbatim generic admin `routeSupport.jsx`.
- `Utils/I18n`: flat English/Portuguese translation maps; all screen copy uses translation keys.
- `Utils/Config`: route metadata; `Utils/Lib`: notifications, class and field-layout helpers.
- `Pages` and `assets`: reserved for future page shells/assets.

Add merchant feature folders and lazy route arrays only as features are implemented. Re-export each route group from `Router/index.js` and spread protected feature groups in `authenticatedRoutes.jsx`. There are no admin roles, master CRUD, maker-checker actions, onboarding configuration editors, or shared admin imports. Tables and file uploads are deferred until list/KYC screens exist.

## Verification

`npm run test:e2e` checks validation, password visibility, no-network unconfigured submission, dialogs, locale persistence and responsive overflow. Install a Playwright Chromium browser with `npx playwright install chromium` if needed.

React Router is kept on the explicitly requested v6. npm reports two moderate advisories for that dependency family, with fixes requiring v7. This client-only scaffold uses fixed internal navigation destinations and no SSR hydration; review the dependency requirement before production deployment.

## Global font

`src/fonts.css` is the single font source: Plus Jakarta Sans, matching the admin app. To change the font everywhere, edit its `--font-sans` value and the Google Fonts import in that same file. Tailwind font utilities, form controls, and toast notifications use that token. System fonts are used while the web font loads or if Google Fonts is unavailable.

## Dashboard loading animation

The supplied asset is `src/assets/animations/dashboard-loading.lottie`. The feature-specific player is `Components/Dashboard/DashboardLoading.jsx`. It bundles the WASM renderer locally, loops while the request is pending, respects reduced motion, and falls back to the shared loading indicator if the animation fails. Loading status is announced to screen readers without visible text over the animation.

Successful login navigates to the protected `/dashboard`. `useDashboard` handles loading, success, error, retry and cancellation. The dashboard service reports configuration missing until its verified URL, method and schema are supplied. It never simulates success or leaves an indefinite animation on an unconfigured endpoint.

`npm run test:e2e` mocks contracts only in tests to verify the animation renders after login, disappears on completion or failure, supports retry and remains behind route protection.
