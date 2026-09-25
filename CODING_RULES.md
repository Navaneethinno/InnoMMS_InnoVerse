# Coding rules

Every change follows these. When a rule and a "cleaner" idea disagree, the
rule wins: consistency across screens matters more than local polish.

## 1. Folder structure mirrors the sidebar

Screens live where they sit in the sidebar:

```
src/Components/<Module>/<Parent menu>/<Menu>/<Menu>.jsx
```

- One folder per menu, named after the menu (PascalCase, no spaces). The main
  file has the same name and exports a component of the same name.
- That menu's form, wizard steps and helpers sit in the same folder, e.g.
  `CategoryForm.jsx`. Each folder has an `index.js` that re-exports the page.
- A menu with no parent goes straight under its module
  (`Components/<Module>/<Menu>/`).
- Shared building blocks only: `Components/Common`, `Components/UI`,
  `Components/Layout`, `Components/MakerChecker`. Never put a screen there,
  and never create a new top-level feature folder.
- `Services/<Module>/`, `Hooks/<Module>/` and `Router/<Module>/` follow the
  same module names.
- App pages that are not sidebar menus live in `src/Pages/` (Login,
  Dashboard, Header pages, Sidebar).

Check the real tree against the live `menu_array` (login response) before
creating folders. Don't guess parents.

## 2. Imports and exports

- Use the `@/` alias (`@/Components/Common/DataTable`) for anything outside
  the current folder, and `./` inside it.
- Named exports only (`export function Category`), plus `index.js`
  re-exports per menu folder. No default exports for components.
- Lazy-load pages in route files:
  `lazy(() => import("@/Components/X/Y").then((m) => ({ default: m.Y })))`.
- Import order: React / libraries, then `@/Components`, `@/Hooks`,
  `@/Services`, `@/Utils`, then `./` files.

## 3. Routing and the sidebar

- The sidebar is built only from `menu_array` (login response). Clicking a
  leaf navigates to `/<slug>/<uuid>`, where slug = `menu_name` lowercased with
  spaces removed ("Account Product" → `accountproduct`). A direct child of a
  menu named "Corporate" gets a `corp` prefix. Register both `slug` and
  `slug/:id`.
- One route file per menu or group under `Router/<Module>/`, collected into
  one list per module in `Router/index.js`, spread in `Router.jsx`.
- Add a breadcrumb for every new slug in `Utils/Config/routeConfig.js`
  (`[parent, menu]` translation keys in the `routes` namespace).

## 4. API calls

- Every path lives in `Utils/Constant.jsx`, grouped in sidebar order. A
  maker-checker entity uses `lifecycleEndpoints("/base/path")` (13 routes).
- Every call goes through `apiRequest` (`Services/api/request.js`): POST,
  JSON body, Deviceinfo + Bearer + `x-api-lang` headers. Don't call `fetch`
  directly.
- A maker-checker entity's service is one line:
  `export const xApi = lifecycleApi(API_ENDPOINTS.MODULE.X);`
- **Messages:** show the backend `message` plus each entry in
  `data[0].problems`; never show `remark` (developer detail). Use
  `apiMessage(response, fallback)` for success toasts; errors from
  `apiRequest` already carry the right text.

## 5. List screens

- Status tabs and order are **server-side**. Send `filter`
  (`all | active | pending | draft | inactive`) and `sort_by` (`desc | asc`)
  with `page` and `limit`. Go back to page 1 when either changes.
- Never filter rows by status or re-sort them in the browser.
- Use `useListQuery` + `<StatusFilterTabs serverFiltered>` +
  `<DataTable serverPagination>`. Copy `Components/Example/Master/Category`.
- Search stays client-side (on the loaded page) until the API gets a search
  parameter.

## 6. Maker-checker actions

- Row buttons come from `getMakerCheckerButtons(row, perms)` and render via
  `RowActions`. **Never invent a new row-action button.** Reuse the existing
  set (view, edit, audit, submit, authorize, deauthorize, deactivate,
  reactivate, delete), and flag missing backend actions instead of building
  around them.
- Permissions come from `menu_array` via
  `useMenuPermission("<menu_name>")("Add" | "Edit" | "Authorize" | "Delete" | "Change Status")`.
- Forms have "Save as draft" (`data-mode="draft"`, `is_draft: true`) and a
  primary save. Edits send `expected_updated_time` from the row.
- Authorize / Deauthorize / Delete-authorize dialogs show
  `PendingChangesDiff`. Deauthorize requires a narration.

## 7. Live updates

Every list screen subscribes to its entity's channel:
`useLiveChannel(API_ENDPOINTS.X.LIST, reload)`. `useListQuery` already does
it. New entities must too.

## 8. Internationalisation (en / pt)

- Every visible string goes through `useTranslation` with keys in
  `Utils/I18n/locales/en.js` **and** `pt.js`. New namespaces are registered
  in `i18n.js`'s `ns` list and in each locale's default export.
- Backend toasts arrive already translated (the `x-api-lang` header).
  Toasts the frontend writes itself go through
  `Utils/I18n/toastMessages.js`.
- Use plural keys (`_one` / `_other`) for counts.

## 9. Styling

- Tailwind utility classes. **No hardcoded theme colours:** use the CSS
  variables in `src/theme.css` (`var(--primary)`, `--success`, `--warning`,
  `--destructive`, `--glass-*`, `--chart-*`...). They switch for dark mode
  and follow the tenant's brand colours from login.
- Page title: `<h1 className="text-xl font-black text-slate-800">`, with a
  one-line `text-xs text-muted-foreground` subtitle.
- List panels use the glass style (see `Category.jsx`).
- Layouts must work at phone width (no horizontal page scroll).

## 10. Before you push

- `npm run build` passes and `npm run lint` shows no new errors.
- Pull first (`git pull origin main`); others push to the same branch.
- Try the screen in light and dark mode and at phone width.
