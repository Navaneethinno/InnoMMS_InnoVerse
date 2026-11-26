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

See `CODING.md` for the full folder layout and conventions. In short:

- `Components/<Module>/<Menu>/`: screens, mirroring the sidebar (Dashboard, Payments, Transactions, Cards, Finance, Messages, Account, Agents, Stores), each menu folder holding its own dialogs and helpers.
- `Components/Common`, `Components/Layout`, `Components/Tour`: shared UI primitives (Radix handles modal/dropdown/tooltip accessibility), the authenticated shell with route protection, and the guided tour.
- `Components/Auth`, `Components/Onboarding`, `Components/Documents`: the public (pre-login) screens.
- `Hooks/<Feature>`: state and side effects; `Services/<Api group>`: thin API wrappers importing centralized endpoints only; `Services/api`: shared HTTP, storage, error/response normalization.
- `Redux`: cross-route session state.
- `Router`: composition-only root, public/authenticated groups, one route list per sidebar module, and verbatim `routeSupport.jsx`.
- `Utils/I18n`: flat English/Portuguese/Arabic translation maps; all screen copy uses translation keys.
- `Utils/Config`: sidebar/route metadata; `Utils/Lib`: pure helpers.

## Verification

`npm run test:e2e` checks validation, password visibility, no-network unconfigured submission, dialogs, locale persistence and responsive overflow. Install a Playwright Chromium browser with `npx playwright install chromium` if needed.

React Router is kept on the explicitly requested v6. npm reports two moderate advisories for that dependency family, with fixes requiring v7. This client-only scaffold uses fixed internal navigation destinations and no SSR hydration; review the dependency requirement before production deployment.

## Global font

`src/fonts.css` is the single font source: Plus Jakarta Sans, matching the admin app. To change the font everywhere, edit its `--font-sans` value and the Google Fonts import in that same file. Tailwind font utilities, form controls, and toast notifications use that token. System fonts are used while the web font loads or if Google Fonts is unavailable.

## Loading indicator

Pages and sections show `Components/Common/LoadingAnimation.jsx`, a spinner drawn in the theme colour so it follows the bank branding; motion is switched off by the global `prefers-reduced-motion` rule in `styles.css`.

## Build and deploy (for the GitLab pipeline)

| Item | Value |
| --- | --- |
| Node | 24 (`.nvmrc`) |
| Package manager | npm (`package-lock.json`) |
| Install | `npm ci` |
| Build | `npm run build` |
| Output folder | `dist/` (includes `.htaccess` with the security headers, copied from `public/`) |
| Lint | `npm run lint` |
| Tests | `npm test` (Vitest) |
| API base URL | `VITE_API_BASE_URL`, read at build time from `.env` (also written into the page's Content-Security-Policy). UAT (105): `https://etakuapi.innovitegrasuite.com`. PCI laptop: `https://api.innoverse.internal`. |
| Other build settings | `VITE_PORTAL_AUTHORIZATION` (the portal's client credential: the base64 part only, without `Basic `; the portal adds it), `VITE_INST_PROFILE_ID`, `VITE_DIGITAL_PRODUCT_ID`; set them as masked CI variables, never in the repo. |
| Deploy on 105 | Copy the contents of `dist/` to the site's web root (folder path to be confirmed). Apache needs `mod_headers` and `AllowOverride FileInfo` for the `.htaccess`. No restart or cache clearing is needed (`index.html` is served no-cache; files under `assets/` have hashed names). |
