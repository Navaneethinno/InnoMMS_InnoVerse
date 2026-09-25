# Reusables catalogue

Everything shared. Reach for these before writing anything new.

## Hooks: `src/Hooks/`

| Hook | Use |
|---|---|
| `useListQuery(listFn, livePath)` | Whole list-screen state: page, limit, `filter`, `sortBy`, rows, pagination, loading, `reload()`, live refresh. Gives `tabsProps` for StatusFilterTabs and `paginationProps` for DataTable. |
| `useMenuPermission(menuName)` | Returns `can(action)` from `menu_array`. `"Parent\|Menu"` disambiguates repeated names. |
| `useLiveChannel(listPath, onChanged)` | WebSocket live channel for an entity (`host + listPath + /live`). |
| `useAuth` | Session store: `user`, `login`, `logout`, `changePassword`, `refresh`. |
| `useSessionState(key, initial)` | `useState` that survives leaving and returning to a page (sessionStorage). |
| `useUnsavedChangesGuard(dirty)` | `{ guard, dialog }`: "Discard unsaved changes?" before `guard(fn)` runs, plus the browser leave prompt. |
| `useIsMobile()` | Phone-width check. |
| `Common/accountHooks` | `useMyProfileQuery(userId)`, `usePasswordPolicyQuery()`. |
| `Master/masterHooks` | `/master/*` reference lookups for dropdowns. |

## Services: `src/Services/api/`

| Export | Use |
|---|---|
| `apiRequest(path, body)` | The only request helper. POST + headers; throws with `message` + `problems`. |
| `rowsOf(response)` | Rows from any list/get envelope. |
| `lifecycleEndpoints(base)` | The 13 maker-checker routes for a base path (use in Constant.jsx). |
| `lifecycleApi(endpoints)` | list, get, getActive, add, edit, submit, auth, deauth, delete, deleteAuth, deactivate, reactivate, audit, pending. |
| `getApiErrorMessage(payload)` | message + data[0].problems (never remark). |
| `authStorage` | Read and write the token and user in localStorage. |

## Components: `src/Components/Common/`

| Component | Key props |
|---|---|
| `DataTable` | `columns [{key,label,align,sortable,render}]`, `rows`, `rowKey`, `isLoading`, `serverPagination {page,totalPages,totalRecords,onPageChange,limit,onLimitChange}`, `serverSorted`, `title`, `emptyTitle`, `bare`, `persistKey`, `fetchMore` (View all modal) |
| `StatusFilterTabs` | `serverFiltered`, `rows`, `total`, `value`, `onChange`, `sortBy`, `onSortChange`, `search`, `onSearch`, `searchPlaceholder`, `actions`, `bare` |
| `RowActions` | `buttons` (from `getMakerCheckerButtons`), `onView`, `onEdit`, `onAudit`, `onSubmit`, `onAuthorize`, `onDeauthorize`, `onDeactivate`, `onReactivate`, `onDelete` |
| `Modal` | `open`, `onClose`, `title`, `subtitle`, `icon`, `size` (sm, md, lg, xl, full), `footer`, `growWithContent`. Esc closes the top one; Enter submits the form's primary (non-draft) button. |
| `ConfirmDialog` | `open`, `title`, `description`, `confirmLabel`, `destructive`, `confirmDisabled`, `pending`, `onConfirm`, `onClose`, `children` |
| `AuditModal` | `title`, `fields [[key,label]]`, `fetchAudit(page, limit)`, `onClose` (use `mapAuditResponse`) |
| `PendingChangesDiff` + `usePendingChanges(fetchPending, id, open)` | Before/after of a pending change in authorize dialogs |
| `FilterSelect` | Searchable dropdown: `value`, `onChange`, `options [{value,label}]`, `addAction`, `size="sm"`, `disabled` |
| `SegmentedSwitch` | Animated two-way switch (e.g. Individual \| Corporate) |
| `HorizontalStepper` | Wizard steps: `steps`, `activeIndex`, `onStepClick`, `isStepCompleted` |
| `CheckboxPill`, `CheckboxPillGroup` | Pill-style checkboxes |
| `FileUploadField` | File picker with preview |
| `CopyButton`, `UiTooltip`, `Spinner`, `LoadingAnimation`, `NoDataAnimation` | Small helpers |
| `LanguageDropdown` | en / pt switch (drives UI and `x-api-lang`) |
| `CompactPulseToast` | Toasts; call through `notifications` |

## Maker-checker: `src/Components/MakerChecker/`

| Export | Use |
|---|---|
| `getMakerCheckerButtons(row, perms)` | Which row buttons show, from row state + permissions |
| `deriveButtonVisibility(row)` | The state part alone |
| `StatusBadge` | `status`, `variant="subtle"` for secondary columns |
| `deriveStatusFlags`, `describeConfirmAction` | Status and confirm-text helpers |

## Utils: `src/Utils/`

| Export | Use |
|---|---|
| `Constant.jsx` | `API_BASE_URL`, `API_ENDPOINTS`, `DRAFT_STATUS_CODE` |
| `Lib/notifications` | `notifications.success / error / warning / info`, `apiMessage(response, fallback)` |
| `Lib/cn` | Tailwind class merge |
| `Lib/password-policy` | Policy parsing and password checks |
| `Lib/actionAliases` | `matchesAction(granted, requested)` for permission names |
| `Config/routeConfig` | Breadcrumbs and titles per slug |
| `I18n/toastMessages` | Translate toasts the frontend writes itself |

## Layout and pages

`Components/Layout/AppLayout` (sidebar + header + page),
`Pages/Sidebar/*` (menu tree, search, module dropdown),
`Pages/Header/*` (top bar, My profile, Change password),
`Pages/Login/*`, `Pages/Dashboard/DashboardPage`.
