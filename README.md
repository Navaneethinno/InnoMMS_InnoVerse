# InnoMMS InnoVerse — Admin Panel (frontend)

React 19 + Vite + Tailwind admin panel, built on the same architecture as the
Innoverse admin panel (itself modelled on payseFrontend): a menu-driven
sidebar, maker-checker list screens, i18n (English / Portuguese), live
updates over WebSocket, light/dark theme.

This repository starts as a **base**: the shared building blocks plus one
sample menu (**Example → Master → Category**) that shows the complete
pattern. Build the real modules by copying that sample.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Production build into `dist/` (run before every push) |
| `npm run lint` | ESLint |
| `npm run test:run` | Vitest, once |
| `npm run format:check` | Prettier check |

## Environment

See `.env.example`. The important one is `VITE_API_BASE_URL`: the API
**host only** (no `/config` on the end). Every route in
`src/Utils/Constant.jsx` is a full path.

## Where things are

```
src/
  main.jsx, App.jsx          entry: providers, i18n, router
  Router/                    one route list per sidebar module
  Components/
    Common/ UI/ Layout/ MakerChecker/   shared building blocks
    <Module>/<Parent menu>/<Menu>/      one folder per sidebar menu
  Pages/                     app pages that aren't menus (Login, Dashboard,
                             Header: My profile / Change password, Sidebar)
  Services/api/              request helper, error rules, lifecycle API factory
  Services/<Module>/         one *.api.js per entity
  Hooks/                     shared hooks (+ Hooks/<Module>/ for module hooks)
  Redux/                     session, menu_array, theme
  Utils/                     Constant.jsx (all routes), I18n/, Lib/, Config/
```

## Read next

1. [CODING_RULES.md](CODING_RULES.md): the rules every change follows.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how a request, a page and
   the sidebar fit together, step by step.
3. [docs/NEW_MENU_CHECKLIST.md](docs/NEW_MENU_CHECKLIST.md): adding a screen.
4. [docs/REUSABLES.md](docs/REUSABLES.md): every shared component and hook.
