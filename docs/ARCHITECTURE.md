# Architecture: how the pieces fit

This follows the Innoverse admin panel, which follows payseFrontend. Read
this once before building a screen.

## 1. App start

```
main.jsx
  └─ imports i18n (Utils/I18n/i18n.js) and renders <App />
App.jsx
  Redux <Provider store>          session, menu_array, theme (Redux/)
  AuthSessionInitializer          restores token + user from localStorage
  ColorModeProvider               light / dark (localStorage "innoverse-color-mode")
  BrandThemeProvider              tenant primary/secondary colours from login
  MUI ThemeProvider + ToastProvider (CompactPulseToast)
  LoadingScreen → I18nProvider → <RouterProvider router={appRouter} />
```

## 2. Routing

```
Router/Router.jsx
  publicRoutes                     /login, /setup, /forgot-password, /access-denied
  <ProtectRoute><AppLayout/>       everything else needs a token
      dashboardRoutes              /, /dashboard, /notifications, /my-profile, /change-password
      <module>Routes               one list per sidebar module (Router/index.js)

AppLayout = DynamicSidebar (left) + TopBar (header) + <Outlet/> (page)
```

- Each page is lazy-loaded through `pageElement(Component, props)`
  (`Router/routeSupport.jsx`), which adds the loading fallback and a boundary
  that reloads once if a deploy made an old chunk disappear.
- Breadcrumbs and the page title come from `Utils/Config/routeConfig.js`,
  matched on the URL's first segment (the slug).

## 3. Login → sidebar → page

```
LoginPage → useAuth.login(username, password)
  POST /config/user/login           (Basic auth header + Deviceinfo)
  ← data[0]: { user_session_info.jwt_token, refresh_token,
               user_details, menu_array[], branding{primary_color,...} }
  persistAuthSession()             token + user → localStorage
  setSession() / setMenuArray()    → Redux
  setBrandTheme()                  → CSS variables

DynamicSidebar
  modules (/master/module) → module dropdown
  menu_array filtered by module → tree (parent_menu_id) → MenuItem
  leaf click → navigate(`/${slug}/${uuid}`)
                slug = menu_name, lowercased, spaces removed

Router matches "slug/:id" → the menu's page component
Page reads permissions:  useMenuPermission("<menu_name>")("Add" | "Edit" | ...)
```

The sidebar, the permissions and the breadcrumbs all come from the same
`menu_array`. A menu the user can't see can't be reached, and a button for an
action they don't hold is never shown.

## 4. One API request

```
page → xApi.list({ page, limit, filter, sort_by })       Services/<Module>/x.api.js
     → lifecycleApi(endpoints)                            Services/api/lifecycleApi.js
     → apiRequest(path, body)                             Services/api/request.js
         POST  API_BASE_URL + path
         headers: Content-Type, Deviceinfo, Authorization: Bearer <jwt>, x-api-lang
     ← { api, code, data: [...], pagination?, filter?, sort_by?, message, remark, status }

status "Fail" or HTTP error → throw Error(message + data[0].problems)   (never remark)
HTTP 401 → clear session, "auth:unauthorized" event → back to /login
```

## 5. A list screen (the sample: Example → Master → Category)

```
Category.jsx
  can  = useMenuPermission("Category")
  list = useListQuery(categoryApi.list, API_ENDPOINTS.EXAMPLE.CATEGORY.LIST)
           state: page, limit, filter (tab), sortBy
           loads: list({ page, limit, filter, sort_by })   ← server filters/sorts ALL records
           live:  useLiveChannel(LIST path) → silent reload on any change, from anyone

  <StatusFilterTabs serverFiltered {...list.tabsProps} search actions=<Add button>/>
       All · Active · Pending · Draft · Inactive, count on the selected tab only
       (pagination.totalRecords), Newest/Oldest toggle. Changes go back to page 1.
  <DataTable rows serverPagination={list.paginationProps} columns=[..., actions]/>
       actions column → getMakerCheckerButtons(row, perms) → <RowActions .../>

  RowActions → View / Edit       → CategoryForm (Modal)  → add | edit  (is_draft?)
             → Audit             → AuditModal            → audit
             → Submit / Authorize / Deauthorize / Delete / Deactivate / Reactivate
                                 → ConfirmDialog (+ PendingChangesDiff, narration)
                                 → submit | auth | deleteAuth | deauth | delete | ...
  success → notifications.success(apiMessage(response)) → list.reload()
  failure → notifications.error(error.message)
```

## 6. Maker-checker states

A record has three status fields, shown as three columns:

| field | meaning | example |
|---|---|---|
| `status` / `status_name` | live state | Active, Inactive, Draft (9) |
| `process_status_name` | the workflow step | Pending Edit, Draft |
| `auth_status` | the checker's view | AUTHORIZED, NEW_AUTH, EDIT_AUTH |

- **Tabs** follow `process_status` (server side): an Active record with a
  pending edit shows under **Pending**.
- **Buttons** come from `deriveButtonVisibility(row)` in
  `Components/MakerChecker/buttonVisibility.js`, combined with the menu
  permissions.
- **Pending delete:** authorizing it calls `delete_auth`, not `auth`.

## 7. Live updates

`useLiveChannel(listPath, onChanged)` opens `wss://<host><listPath>/live`
with the token, pings every 25 s, reconnects with backoff, and calls
`onChanged(action, records)` on every push. List screens reload on it.

## 8. i18n

- `Utils/I18n/locales/en.js` and `pt.js` export one object per namespace,
  gathered in each file's default export. Namespaces are listed in
  `i18n.js`.
- The language dropdown sets localStorage `apiLang`. That drives both
  react-i18next and the `x-api-lang` header, so backend messages come back
  in the same language.

## 9. Theme

`src/theme.css` defines every colour as a CSS variable, with a dark set under
`.dark`. The tenant's brand colours from login override `--primary` and
related variables at runtime (`BrandThemeProvider`). Components use
`var(--...)`, never hex values.
