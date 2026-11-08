import { FIELD_LIMITS } from "@/Utils/Constant";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Package, Pencil, Plus, Search, Tag } from "lucide-react";
import Button from "@/Components/Common/Button";
import CheckboxPill from "@/Components/Common/CheckboxPill";
import DatePicker from "@/Components/Common/DatePicker";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { useCatalogueActions } from "@/Hooks/Catalogue/useCatalogueActions";
import { formatDate, formatMoney } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";
import { StatusPill } from "./posShared";

// The product catalogue (Stores > Products). The owner adds and edits products
// and sets their prices, for one store or all stores (store_id 0); a store
// manager reads only (each product's `actions` say so). The server searches
// and pages. A product's parent must have no parent itself (one level), and
// a product that has variants cannot get a parent.
const ALL_STORES = 0;
const PAGE_SIZE = 50;
const PARENT_LIMIT = 200;

function ProductDialog({ product, currencies, onClose, onSaved }) {
  const { saveProduct } = useCatalogueActions();
  const { t } = useTranslation();
  const editing = Boolean(product?.id);
  const [form, setForm] = useState(() => ({
    code: product?.code ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    unit: product?.unit ?? "",
    currency_code: product?.currency_code ?? currencies[0] ?? "",
    active: product ? product.status !== "INACTIVE" : true,
    parent_id: product?.parent_id ? String(product.parent_id) : "",
  }));
  // Possible parents: products with no parent of their own, not this one.
  const { loadProducts } = useCatalogueActions();
  const [all, setAll] = useState([]);
  useEffect(() => {
    loadProducts({ page: 1, limit: PARENT_LIMIT })
      .then((reply) => setAll(reply.items))
      .catch(() => setAll([]));
  }, [loadProducts]);
  const parents = all.filter((p) => !p.parent_id && p.id !== product?.id).map((p) => ({ value: String(p.id), label: `${p.name} (${p.code})` }));
  const hasVariants = editing && all.some((p) => p.parent_id === product.id);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const invalid = !form.name.trim() || (!editing && (!form.code.trim() || !form.currency_code));
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const common = { name: form.name.trim(), category: form.category.trim(), unit: form.unit.trim(), parent_id: form.parent_id ? Number(form.parent_id) : null };
      await saveProduct(editing ? { id: product.id, ...common, active: form.active } : { code: form.code.trim(), ...common, currency_code: form.currency_code });
      notifications.success(t("catalogue.productSaved"));
      onSaved();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={pending} title={editing ? t("catalogue.editProduct") : t("catalogue.addProduct")}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="code" label={t("catalogue.code")} value={form.code} disabled={editing} maxLength={FIELD_LIMITS.name} onChange={(event) => set("code", event.target.value)} />
          <TextField name="name" label={t("catalogue.name")} value={form.name} maxLength={FIELD_LIMITS.name} onChange={(event) => set("name", event.target.value)} />
          <TextField name="category" label={t("catalogue.category")} value={form.category} maxLength={FIELD_LIMITS.name} onChange={(event) => set("category", event.target.value)} />
          <TextField name="unit" label={t("catalogue.unit")} placeholder={t("catalogue.unitPlaceholder")} value={form.unit} maxLength={FIELD_LIMITS.name} onChange={(event) => set("unit", event.target.value)} />
          <FilterSelect label={t("catalogue.parent")} value={form.parent_id} disabled={hasVariants} onChange={(value) => set("parent_id", value)} options={[{ value: "", label: t("catalogue.noParent") }, ...parents]} />
          {!editing && currencies.length > 1 && (
            <FilterSelect label={t("pos.currency", { defaultValue: "Currency" })} value={form.currency_code} onChange={(code) => set("currency_code", code)} options={currencies.map((code) => ({ value: code, label: code }))} />
          )}
        </div>
        {hasVariants && <p className="text-xs text-slate-500">{t("catalogue.hasVariants")}</p>}
        {editing && <CheckboxPill label={t("catalogue.active")} checked={form.active} onChange={(event) => set("active", event.target.checked)} />}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" pending={pending} disabled={invalid}>
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PricesDialog({ product, stores, onClose }) {
  const { loadPrices, setPrice } = useCatalogueActions();
  const { t } = useTranslation();
  const [prices, setPrices] = useState(null);
  const [problem, setProblem] = useState("");
  const [form, setForm] = useState({ store_id: String(ALL_STORES), price: "", valid_from: "", valid_to: "" });
  const [pending, setPending] = useState(false);
  const load = useCallback(() => {
    loadPrices(product.id)
      .then(setPrices)
      .catch((error) => {
        setPrices([]);
        setProblem(error.message);
      });
  }, [loadPrices, product.id]);
  useEffect(load, [load]);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const storeName = (id) => (id == null ? t("catalogue.allStores") : (stores.find((s) => s.id === Number(id))?.name ?? `#${id}`));
  const badPrice = form.price !== "" && !(/^\d+(\.\d+)?$/.test(form.price) && Number(form.price) > 0);
  const badDates = form.valid_from && form.valid_to && form.valid_to < form.valid_from;
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      await setPrice({ product_id: product.id, store_id: Number(form.store_id), price: form.price, valid_from: form.valid_from, valid_to: form.valid_to });
      notifications.success(t("catalogue.priceSaved"));
      setForm((previous) => ({ ...previous, price: "", valid_from: "", valid_to: "" }));
      load();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={pending} size="lg" title={t("catalogue.pricesOf", { name: product.name })}>
      <div className="space-y-4">
        {problem && <ErrorState message={problem} />}
        {prices === null ? (
          <LoadingState />
        ) : !prices.length ? (
          <p className="text-sm text-slate-500">{t("catalogue.noPrices")}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {prices.map((row) => (
              <li key={row.id ?? `${row.store_id}-${row.valid_from}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-800">{storeName(row.store_id)}</span>
                <span className="text-slate-600">{formatMoney(row.price, product.currency_code)}</span>
                <span className="w-full text-xs text-slate-500">
                  {t("catalogue.validRange", { from: row.valid_from ? formatDate(row.valid_from) : t("catalogue.open"), to: row.valid_to ? formatDate(row.valid_to) : t("catalogue.open") })}
                  {row.created_by ? ` · ${row.created_by}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        {product.actions?.price_set && (
          <form noValidate onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">{t("catalogue.setPrice")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label={t("catalogue.store")}
                value={form.store_id}
                onChange={(value) => set("store_id", value)}
                options={[{ value: String(ALL_STORES), label: t("catalogue.allStores") }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
              />
              <TextField name="price" inputMode="decimal" label={t("catalogue.price")} value={form.price} error={badPrice ? t("catalogue.priceRule") : undefined} onChange={(event) => set("price", event.target.value.replace(/[^\d.]/g, ""))} />
              <label className="block text-sm font-medium">
                {t("catalogue.validFrom")}
                <DatePicker className="mt-2" value={form.valid_from} onChange={(value) => set("valid_from", value)} />
              </label>
              <label className="block text-sm font-medium">
                {t("catalogue.validTo")}
                <DatePicker className="mt-2" value={form.valid_to} min={form.valid_from || undefined} onChange={(value) => set("valid_to", value)} />
              </label>
            </div>
            {badDates && <p className="text-xs text-red-600">{t("catalogue.datesRule")}</p>}
            <div className="flex justify-end">
              <Button type="submit" pending={pending} disabled={!form.price || badPrice || badDates} reason={t("catalogue.priceNeeded")}>
                {t("catalogue.savePrice")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default function Products({ owner, stores, currencies }) {
  const { loadProducts } = useCatalogueActions();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [problem, setProblem] = useState("");
  const [dialog, setDialog] = useState(null);
  const load = useCallback(
    (text, nextPage = 1) =>
      loadProducts({ search: text.trim(), page: nextPage, limit: PAGE_SIZE })
        .then((reply) => {
          setProblem("");
          setPage(nextPage);
          setTotal(reply.total);
          setProducts((previous) => (nextPage === 1 ? reply.items : [...(previous ?? []), ...reply.items]));
        })
        .catch((error) => {
          setProducts([]);
          setProblem(error.message);
        }),
    [loadProducts],
  );
  // The server searches; wait for typing to pause.
  useEffect(() => {
    const timer = setTimeout(() => void load(search), 300);
    return () => clearTimeout(timer);
  }, [load, search]);
  const readOnly = t("catalogue.ownerOnly");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">{t("catalogue.search")}</span>
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("catalogue.search")} className="field-control w-full ps-9" />
        </label>
        <Button onClick={() => setDialog({ kind: "product", product: null })} disabled={!owner} reason={readOnly} className="px-4 py-2.5">
          <Plus size={16} /> {t("catalogue.addProduct")}
        </Button>
      </div>
      {problem && (
        <div className="mb-4">
          <ErrorState message={problem} onRetry={() => void load(search)} />
        </div>
      )}
      {products === null ? (
        <LoadingState />
      ) : !products.length ? (
        <div className="panel shadow-sm">
          <EmptyState icon={Package} title={t("catalogue.empty")} description={t("catalogue.emptyHint")} />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 panel shadow-sm">
          {products.map((product) => (
            <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{product.name}</p>
                <p className="text-xs text-slate-500">{[product.code, product.category, product.unit, product.currency_code, product.price != null ? formatMoney(product.price, product.currency_code) : null].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={product.status} />
                <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "prices", product })} className="px-3 py-2">
                  <Tag size={14} /> {t("catalogue.prices")}
                </Button>
                <Button variant="secondary" size="sm" disabled={!product.actions?.edit} reason={readOnly} onClick={() => setDialog({ kind: "product", product })} className="px-3 py-2">
                  <Pencil size={14} /> {t("stores.editShort", { defaultValue: "Edit" })}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {products && products.length < total && (
        <Button variant="secondary" onClick={() => void load(search, page + 1)} className="mt-4 w-full py-2.5">
          {t("cases.more")}
        </Button>
      )}
      {dialog?.kind === "product" && (
        <ProductDialog
          product={dialog.product}
          currencies={currencies}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void load(search);
          }}
        />
      )}
      {dialog?.kind === "prices" && <PricesDialog product={dialog.product} stores={stores ?? []} onClose={() => setDialog(null)} />}
    </>
  );
}
