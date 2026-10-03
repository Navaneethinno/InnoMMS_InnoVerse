# InnoMMS InnoVerse — Merchant Portal

Merchant portal frontend built with React 18, Vite, and Tailwind CSS. The app
combines merchant self-onboarding with an authenticated admin workspace. It
uses the InnoVerse menu-driven architecture, English and Portuguese
translations, tenant branding, light/dark themes, and live updates for
maker-checker lists.

The onboarding and public authentication flows are implemented alongside the
shared admin foundation. **Example → Master → Category** remains the reference
screen for adding future menu-driven maker-checker modules; it is sample data,
not a merchant business module.

## Getting started

```powershell
npm install
Copy-Item .env.example .env.local   # PowerShell; configure values before use
npm run dev                  # http://localhost:5173
```

For macOS/Linux, use `cp .env.example .env.local`. Keep credentials in the
local environment file and never commit them.

| Script                 | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Dev server on port 5173                               |
| `npm run build`        | Production build into `dist/` (run before every push) |
| `npm run lint`         | ESLint                                                |
| `npm run test:run`     | Vitest, once                                          |
| `npm run format:check` | Prettier check                                        |

## Current functionality

- Public login, setup, forgot-password, and merchant signup pages.
- Merchant signup verifies email and phone with a one-time code before
  onboarding, then submits the merchant onboarding form through the merchant
  web API.
- Public pages use merchant-portal branding; authenticated sessions apply
  tenant brand colors from the login response.
- Protected dashboard, notifications, profile, and password-change pages.
- Permission-aware sidebar navigation driven by the login response.
- A complete Category example for server-filtered maker-checker lists,
  lifecycle actions, audit history, and WebSocket refreshes.
- English and Portuguese UI translations, plus light and dark themes.

Admin APIs and merchant onboarding require access to the configured backend.
The Category module is an example implementation; additional business modules
should follow the live menu configuration and the documented menu workflow.

## Environment setup

- Start from `.env.example` and configure the credentials and institution
  values provided for your environment.
- `VITE_API_BASE_URL` is the API host only, without `/config` at the end.
- `VITE_AUTH_BASIC_USERNAME` and `VITE_AUTH_BASIC_PASSWORD` are used by the
  login endpoint.
- `VITE_MERCHANT_PORTAL_AUTHORIZATION` and `VITE_INST_PROFILE_ID` configure
  merchant self-onboarding.

Every API route is defined in `src/Utils/Constant.jsx`. Do not put real
credentials in source control.

## Where things are

```
src/
  main.jsx, App.jsx          app entry, providers, i18n, router
  Router/                    public, dashboard, and menu routes
  Components/
    Common/ UI/ Layout/ MakerChecker/   shared building blocks
    Example/Master/Category/            maker-checker reference screen
  Pages/
    Login/                   login, setup, password recovery, merchant signup
    Dashboard/ Header/       dashboard, profile, password change
    Notifications/ Sidebar/  notifications and sidebar pages
  Services/api/              request helper, error rules, lifecycle API factory
  Services/Onboarding/ Otp/  merchant onboarding and contact verification APIs
  Services/<Module>/         module APIs, including the Example and Master areas
  Hooks/                     shared hooks and onboarding flows
  Redux/                     session, menu_array, theme
  Utils/                     Constant.jsx (all routes), I18n/, Lib/, Config/
```

## Read next

1. [CODING_RULES.md](CODING_RULES.md): the rules every change follows.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how a request, a page and
   the sidebar fit together, step by step.
3. [docs/NEW_MENU_CHECKLIST.md](docs/NEW_MENU_CHECKLIST.md): adding a screen.
4. [docs/REUSABLES.md](docs/REUSABLES.md): every shared component and hook.
5. [docs/Merchant_Portal_Account_Handoff.md](docs/Merchant_Portal_Account_Handoff.md):
   account flows for merchant sign-in, wallet access, payments, and refunds.
