# Adding a new menu screen

Example: a maker-checker menu **Merchant → Master → Merchant Type**, API base
`/master_config/merchant_type`. Copy
`src/Components/Example/Master/Category/` and follow these steps.

## 1. Check the sidebar

Log in and read `menu_array`: the exact `menu_name` ("Merchant Type"), its
parent ("Master") and module ("MERCHANT"). The slug is `merchanttype`.

## 2. Endpoints: `src/Utils/Constant.jsx`

```js
MERCHANT: {
  MERCHANT_TYPE: lifecycleEndpoints("/master_config/merchant_type"),
},
```

## 3. Service: `src/Services/Merchant/merchantType.api.js`

```js
import { lifecycleApi } from "@/Services/api/lifecycleApi";
import { API_ENDPOINTS } from "@/Utils/Constant";

export const merchantTypeApi = lifecycleApi(API_ENDPOINTS.MERCHANT.MERCHANT_TYPE);
```

## 4. Screen: `src/Components/Merchant/Master/MerchantType/`

```
MerchantType.jsx       copy of Category.jsx
MerchantTypeForm.jsx   copy of CategoryForm.jsx, with this entity's fields
index.js               export { MerchantType } from "./MerchantType";
```

In `MerchantType.jsx`, change:
- `useMenuPermission("Merchant Type")`
- `useListQuery(merchantTypeApi.list, API_ENDPOINTS.MERCHANT.MERCHANT_TYPE.LIST)`
- the columns, the form fields and the audit `fields`
- `useTranslation(["merchantType", "common"])`

## 5. Route: `src/Router/Merchant/merchantTypeRoutes.jsx`

```js
const MerchantType = lazy(() =>
  import("@/Components/Merchant/Master/MerchantType").then((m) => ({ default: m.MerchantType })),
);
export const merchantTypeRoutes = [
  { path: "merchanttype", element: pageElement(MerchantType) },
  { path: "merchanttype/:id", element: pageElement(MerchantType) },
];
```

In `Router/index.js`, add:
`export const merchantRoutes = [...merchantTypeRoutes];`

In `Router/Router.jsx`, add `...merchantRoutes` to `children`.

## 6. Breadcrumb: `src/Utils/Config/routeConfig.js`

```js
merchanttype: { titleKey: "crumbMerchantType", breadcrumb: ["crumbMaster", "crumbMerchantType"] },
```

## 7. Text: `src/Utils/I18n/locales/en.js` and `pt.js`

- Add a `merchantType` namespace to both files, copying the keys from
  `category`, and list it in each file's default export.
- Add `crumbMerchantType` (and `crumbMaster` if it's new) to `routes`.
- Add `"merchantType"` to the `ns` list in `src/Utils/I18n/i18n.js`.

## 8. Check

- [ ] Tabs send `filter`, the Newest/Oldest toggle sends `sort_by`, and
      changing either goes back to page 1.
- [ ] Only granted actions show. Pending delete authorizes via `delete_auth`.
- [ ] Save as draft works, and the primary save sends it for approval.
- [ ] A change made in another tab appears without refreshing (live channel).
- [ ] English and Portuguese both translated, with no raw keys on screen.
- [ ] Light and dark mode, and phone width.
- [ ] `npm run build` passes and `npm run lint` is clean.

Once the first real module exists, delete the Example module:
`Components/Example`, `Services/Example`, `Router/Example`, the `EXAMPLE`
endpoints, the `category` namespace, and its breadcrumb and route entries.
