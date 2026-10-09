import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Store,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import Button from "@/Components/Common/Button";
import CheckboxPill from "@/Components/Common/CheckboxPill";
import ConfirmDialog from "@/Components/Common/ConfirmDialog";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import PhoneField from "@/Components/Common/PhoneField";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import {
  loadWallets,
  quotePayment,
  sendPayment,
} from "@/Services/Account/account.api";
import {
  closeStore,
  loadStores,
  loadStoreUsers,
  reopenStore,
  saveStore,
  saveStoreUser,
  setStoreUserPin,
} from "@/Services/Store/store.api";
import { formatDateTime, formatMoney, newReference } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { isOwner, isOwnMoney, roleName, staffRole } from "@/Utils/Lib/roles";
import { cn } from "@/Utils/Lib/utils";

// Stores and store users (Agents, stores and POS, phase 5), and store wallets
// (phase 6). The owner (the merchant) adds stores, which wait for the bank; adds
// store managers and cashiers who sign in to this portal with their own phone
// and PIN and work only in their stores; and moves money between the main
// wallet and a store's own wallet. A store manager sees its stores and their
// users, read-only; a cashier its stores.
const STORE_STATUS = {
  PENDING: [
    "stores.status.PENDING",
    "Waiting for the bank",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ],
  ACTIVE: [
    "stores.status.ACTIVE",
    "Open",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  ],
  REJECTED: [
    "stores.status.REJECTED",
    "Rejected",
    "bg-red-500/15 text-red-700 dark:text-red-300",
  ],
  INACTIVE: [
    "stores.status.INACTIVE",
    "Closed",
    "bg-slate-500/15 text-slate-600",
  ],
};
// Store codes: capitals, digits, _ and -, up to 32.
const CODE = /^[A-Z0-9_-]{1,32}$/;
const EMPTY_STORE = {
  code: "",
  name: "",
  address: "",
  province: "",
  phone_number: "",
  latitude: "",
  longitude: "",
};
const EMPTY_USER = {
  role: "CASHIER",
  name: "",
  phone_number: "",
  store_ids: [],
  pin: "",
  refund_limit: "",
  status: "ACTIVE",
};

const Badge = ({ tone, children }) => (
  <span
    className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone)}
  >
    {children}
  </span>
);
const numberOrNull = (value) =>
  value === "" || value == null || Number.isNaN(Number(value))
    ? null
    : Number(value);

function StoreDialog({ store, onClose, onSaved }) {
  const { t } = useTranslation();
  const portalPolicy = usePortalPolicy();
  const editing = Boolean(store?.id);
  const [form, setForm] = useState(() => ({
    ...EMPTY_STORE,
    ...(store ?? {}),
    latitude: store?.latitude ?? "",
    longitude: store?.longitude ?? "",
  }));
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const set = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const codeBad = !editing && form.code && !CODE.test(form.code);
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const body = {
        ...(editing ? { id: store.id } : { code: form.code }),
        name: form.name.trim(),
        address: form.address.trim(),
        province: form.province.trim(),
        phone_number: form.phone_number.trim(),
        ...(numberOrNull(form.latitude) != null
          ? { latitude: numberOrNull(form.latitude) }
          : {}),
        ...(numberOrNull(form.longitude) != null
          ? { longitude: numberOrNull(form.longitude) }
          : {}),
      };
      await saveStore(body);
      notifications.success(
        editing
          ? store.status === "REJECTED"
            ? t("stores.resent", {
                defaultValue: "Saved and sent back to the bank.",
              })
            : t("stores.saved", { defaultValue: "Store saved." })
          : t("stores.added", {
              defaultValue: "Store added. It opens once the bank approves it.",
            }),
      );
      onSaved();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      pending={pending}
      size="lg"
      title={
        editing
          ? t("stores.edit", { defaultValue: "Edit store" })
          : t("stores.add", { defaultValue: "Add a store" })
      }
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        {store?.status === "REJECTED" && store.decision_note && (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {t("stores.rejectedNote", {
              note: store.decision_note,
              defaultValue: "Rejected: {{note}}",
            })}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="code"
            label={t("stores.code", { defaultValue: "Code" })}
            value={form.code}
            disabled={editing}
            error={
              codeBad
                ? t("stores.codeRule", {
                    defaultValue:
                      "Capitals, digits, _ and -, up to 32 characters.",
                  })
                : undefined
            }
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                code: event.target.value.toUpperCase().replace(/\s/g, ""),
              }))
            }
          />
          <TextField
            name="name"
            label={t("stores.name", { defaultValue: "Name" })}
            value={form.name}
            onChange={set("name")}
          />
          <div className="sm:col-span-2">
            <TextField
              name="address"
              label={t("stores.address", { defaultValue: "Address" })}
              value={form.address}
              onChange={set("address")}
            />
          </div>
          <TextField
            name="province"
            label={t("stores.province", { defaultValue: "Province" })}
            value={form.province}
            onChange={set("province")}
          />
          <PhoneField
            name="phone_number"
            label={t("stores.phone", { defaultValue: "Store phone" })}
            countries={portalPolicy.phone.countries}
            value={form.phone_number}
            onChange={(value) =>
              setForm((previous) => ({ ...previous, phone_number: value }))
            }
          />
          <TextField
            name="latitude"
            inputMode="decimal"
            label={t("stores.latitude", {
              defaultValue: "Latitude (optional)",
            })}
            value={form.latitude}
            onChange={set("latitude")}
          />
          <TextField
            name="longitude"
            inputMode="decimal"
            label={t("stores.longitude", {
              defaultValue: "Longitude (optional)",
            })}
            value={form.longitude}
            onChange={set("longitude")}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            pending={pending}
            disabled={
              !form.name.trim() || (!editing && (!form.code || codeBad))
            }
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserDialog({ user, stores, onClose, onSaved }) {
  const { t } = useTranslation();
  const portalPolicy = usePortalPolicy();
  const pinRules = usePinRules();
  const editing = Boolean(user?.id);
  const [form, setForm] = useState(() =>
    user
      ? {
          ...EMPTY_USER,
          ...user,
          store_ids: (user.stores ?? []).map((s) => s.id),
          refund_limit:
            user.refund_limit != null ? String(Number(user.refund_limit)) : "",
          pin: "",
        }
      : EMPTY_USER,
  );
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const toggleStore = (id) =>
    setForm((previous) => ({
      ...previous,
      store_ids: previous.store_ids.includes(id)
        ? previous.store_ids.filter((x) => x !== id)
        : [...previous.store_ids, id],
    }));
  const manager = form.role === "STORE_MANAGER";
  const pinShort = !editing && form.pin.length < pinRules.minLength;
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const body = {
        ...(editing
          ? { id: user.id, status: form.status }
          : { phone_number: form.phone_number.trim(), pin: form.pin }),
        role: form.role,
        name: form.name.trim(),
        store_ids: form.store_ids,
        // A limit is for managers; none means no limit of their own.
        ...(manager && form.refund_limit !== ""
          ? { refund_limit: form.refund_limit }
          : {}),
      };
      await saveStoreUser(body);
      notifications.success(
        editing
          ? t("storeUsers.saved", { defaultValue: "User saved." })
          : t("storeUsers.added", {
              defaultValue:
                "User added. Give them their PIN; they should change it after signing in.",
            }),
      );
      onSaved();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      pending={pending}
      size="lg"
      title={
        editing
          ? t("storeUsers.edit", { defaultValue: "Edit user" })
          : t("storeUsers.add", { defaultValue: "Add a store user" })
      }
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <SegmentedTabs
          items={[
            { key: "CASHIER", label: roleName("CASHIER", t) },
            { key: "STORE_MANAGER", label: roleName("STORE_MANAGER", t) },
          ]}
          value={form.role}
          onChange={(role) => setForm((previous) => ({ ...previous, role }))}
        />
        <p className="text-xs text-slate-500">
          {manager
            ? t("storeUsers.managerHint", {
                defaultValue:
                  "Sees the store's history and wallets, and can refund payments made there up to their refund limit.",
              })
            : t("storeUsers.cashierHint", {
                defaultValue: "Sees the store's transactions and receipts.",
              })}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label={t("storeUsers.name", { defaultValue: "Name" })}
            value={form.name}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, name: event.target.value }))
            }
          />
          {editing ? (
            <TextField
              name="phone"
              label={t("storeUsers.phone", { defaultValue: "Phone (sign-in)" })}
              value={form.phone_number}
              disabled
            />
          ) : (
            <PhoneField
              name="phone_number"
              label={t("storeUsers.phone", { defaultValue: "Phone (sign-in)" })}
              countries={portalPolicy.phone.countries}
              value={form.phone_number}
              onChange={(value) =>
                setForm((previous) => ({ ...previous, phone_number: value }))
              }
            />
          )}
          {!editing && (
            <TextField
              name="pin"
              type="password"
              inputMode={pinRules.letters ? undefined : "numeric"}
              maxLength={pinRules.maxLength}
              autoComplete="off"
              label={t("storeUsers.firstPin", { defaultValue: "First PIN" })}
              value={form.pin}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  pin: sanitizePin(pinRules, event.target.value),
                }))
              }
            />
          )}
          {manager && (
            <TextField
              name="refund_limit"
              inputMode="decimal"
              label={t("storeUsers.refundLimit", {
                defaultValue: "Refund limit (empty: no limit of their own)",
              })}
              value={form.refund_limit}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  refund_limit: event.target.value.replace(/[^\d.]/g, ""),
                }))
              }
            />
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {t("storeUsers.stores", { defaultValue: "Works in" })}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {stores.map((store) => (
              <CheckboxPill
                key={store.id}
                label={`${store.name} (${store.code})`}
                checked={form.store_ids.includes(store.id)}
                onChange={() => toggleStore(store.id)}
              />
            ))}
          </div>
        </div>
        {editing && (
          <CheckboxPill
            label={t("storeUsers.activeToggle", {
              defaultValue: "Active (unticking signs them out everywhere)",
            })}
            checked={form.status === "ACTIVE"}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                status: event.target.checked ? "ACTIVE" : "INACTIVE",
              }))
            }
          />
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            pending={pending}
            disabled={
              !form.name.trim() ||
              !form.store_ids.length ||
              (!editing &&
                (form.phone_number.replace(/\D/g, "").length < 7 || pinShort))
            }
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PinDialog({ user, onClose }) {
  const { t } = useTranslation();
  const pinRules = usePinRules();
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      await setStoreUserPin(user.id, pin);
      notifications.success(
        t("storeUsers.pinSet", {
          name: user.name,
          defaultValue: "New PIN set for {{name}}. They were signed out.",
        }),
      );
      onClose();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPin("");
      setPending(false);
    }
  };
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      pending={pending}
      title={t("storeUsers.resetPin", { defaultValue: "Set a new PIN" })}
      description={t("storeUsers.resetPinHint", {
        name: user.name,
        defaultValue:
          "For {{name}}, who forgot their PIN or is locked out. It signs them out and clears a lock.",
      })}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <TextField
          name="pin"
          type="password"
          inputMode={pinRules.letters ? undefined : "numeric"}
          maxLength={pinRules.maxLength}
          autoComplete="off"
          label={t("storeUsers.newPin", { defaultValue: "New PIN" })}
          value={pin}
          onChange={(event) =>
            setPin(sanitizePin(pinRules, event.target.value))
          }
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            pending={pending}
            disabled={pin.length < pinRules.minLength}
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Moves money between the owner's main wallet and a store's wallet (STORE_SWEEP):
// quote, then the owner's PIN.
function SweepDialog({ storeWallet, mainWallets, onClose, onDone }) {
  const { t } = useTranslation();
  const pinRules = usePinRules();
  const [direction, setDirection] = useState("toMain");
  const [main, setMain] = useState(
    mainWallets.find((w) => w.currency_code === storeWallet.currency_code)
      ?.acct_num ??
      mainWallets[0]?.acct_num ??
      "",
  );
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);
  const ends =
    direction === "toMain"
      ? { fromAcctNum: storeWallet.acct_num, toAcctNum: main }
      : { fromAcctNum: main, toAcctNum: storeWallet.acct_num };
  const run = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      if (!quote) {
        setQuote(
          await quotePayment({ txnType: "STORE_SWEEP", ...ends, amount }),
        );
        reference.current = newReference();
      } else {
        await sendPayment({
          txnType: "STORE_SWEEP",
          ...ends,
          amount,
          pin: quote.pin_required === false ? "" : pin,
          clientReference: reference.current,
        });
        notifications.success(
          t("storeWallets.moved", { defaultValue: "Money moved." }),
        );
        onDone();
      }
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPin("");
      setPending(false);
    }
  };
  const needPin = quote && quote.pin_required !== false;
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      pending={pending}
      title={t("storeWallets.move", { defaultValue: "Move money" })}
      description={storeWallet.store_name ?? storeWallet.acct_num}
    >
      <form noValidate onSubmit={run} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        {!quote ? (
          <>
            <SegmentedTabs
              items={[
                {
                  key: "toMain",
                  label: t("storeWallets.toMain", {
                    defaultValue: "Store → main wallet",
                  }),
                },
                {
                  key: "toStore",
                  label: t("storeWallets.toStore", {
                    defaultValue: "Main wallet → store",
                  }),
                },
              ]}
              value={direction}
              onChange={setDirection}
            />
            {mainWallets.length > 1 && (
              <label className="block text-sm font-semibold text-slate-700">
                {t("storeWallets.mainWallet", { defaultValue: "Main wallet" })}
                <select
                  value={main}
                  onChange={(event) => setMain(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-surface px-3 py-3 text-sm"
                >
                  {mainWallets.map((w) => (
                    <option key={w.acct_num} value={w.acct_num}>
                      {w.acct_num} · {formatMoney(w.avail_bal, w.currency_code)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <TextField
              name="amount"
              inputMode="decimal"
              label={t("send.amount")}
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/[^\d.]/g, ""))
              }
            />
          </>
        ) : (
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{t("send.from")}</dt>
              <dd className="text-right">
                {quote.from?.acct_num ?? ends.fromAcctNum}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{t("send.to")}</dt>
              <dd className="text-right">
                {quote.to?.acct_num ?? ends.toAcctNum}
              </dd>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <dt>{t("send.total")}</dt>
              <dd>
                {formatMoney(
                  quote.total_debit ?? quote.amount,
                  quote.currency_code,
                )}
              </dd>
            </div>
          </dl>
        )}
        {needPin && (
          <TextField
            name="pin"
            type="password"
            inputMode={pinRules.letters ? undefined : "numeric"}
            maxLength={pinRules.maxLength}
            autoComplete="off"
            label={t("send.enterPin")}
            value={pin}
            onChange={(event) =>
              setPin(sanitizePin(pinRules, event.target.value))
            }
          />
        )}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={quote ? () => setQuote(null) : onClose}
          >
            {quote ? t("send.back") : t("common.cancel")}
          </Button>
          <Button
            type="submit"
            pending={pending}
            disabled={
              !Number(amount) ||
              !main ||
              (needPin && pin.length < pinRules.entryMin)
            }
          >
            {quote
              ? t("storeWallets.move", { defaultValue: "Move money" })
              : t("send.review")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Stores() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const owner = isOwner(user);
  // A cashier may list stores only; a manager also sees users and wallets.
  const canSeeUsers = owner || staffRole(user) === "STORE_MANAGER";
  const [tab, setTab] = useState("stores");
  const [stores, setStores] = useState(null);
  const [users, setUsers] = useState(null);
  const [wallets, setWallets] = useState(null);
  const [problem, setProblem] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(null);

  const loadAll = useCallback(() => {
    loadStores()
      .then((list) => {
        setProblem("");
        setStores(list);
      })
      .catch((error) => {
        setStores([]);
        setProblem(error.message);
      });
    if (canSeeUsers)
      loadStoreUsers()
        .then(setUsers)
        .catch(() => setUsers([]));
    if (canSeeUsers)
      loadWallets()
        .then(setWallets)
        .catch(() => setWallets([]));
  }, [canSeeUsers]);
  useEffect(loadAll, [loadAll]);

  const toggleStore = async () => {
    const { store } = dialog;
    setBusy(store.id);
    try {
      await (store.status === "ACTIVE"
        ? closeStore(store.id)
        : reopenStore(store.id));
      notifications.success(
        store.status === "ACTIVE"
          ? t("stores.closed", { defaultValue: "Store closed." })
          : t("stores.reopened", { defaultValue: "Store reopened." }),
      );
      setDialog(null);
      loadAll();
    } catch (error) {
      setProblem(error.message);
      setDialog(null);
    } finally {
      setBusy(null);
    }
  };

  const storeWallets = (wallets ?? []).filter(
    (w) => w.wallet_purpose === "STORE",
  );
  const mainWallets = (wallets ?? []).filter(isOwnMoney);
  const storeName = (id) => stores?.find((s) => s.id === id)?.name;
  const tabs = [
    { key: "stores", label: t("stores.tab", { defaultValue: "Stores" }) },
    ...(canSeeUsers
      ? [
          {
            key: "users",
            label: t("storeUsers.tab", { defaultValue: "Store users" }),
          },
        ]
      : []),
    ...(canSeeUsers && storeWallets.length
      ? [
          {
            key: "wallets",
            label: t("storeWallets.tab", { defaultValue: "Store wallets" }),
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {t("stores.title", { defaultValue: "Stores" })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {owner
              ? t("stores.subtitle", {
                  defaultValue:
                    "Your stores, the people who work in them, and their wallets.",
                })
              : t("stores.staffSubtitle", {
                  defaultValue: "The stores you work in.",
                })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.length > 1 && (
            <SegmentedTabs items={tabs} value={tab} onChange={setTab} />
          )}
          {owner && tab === "stores" && (
            <Button
              onClick={() => setDialog({ kind: "store", store: null })}
              className="px-4 py-2.5"
            >
              <Plus size={16} />{" "}
              {t("stores.add", { defaultValue: "Add a store" })}
            </Button>
          )}
          {owner && tab === "users" && (
            <Button
              onClick={() => setDialog({ kind: "user", user: null })}
              disabled={!stores?.length}
              className="px-4 py-2.5"
            >
              <Plus size={16} />{" "}
              {t("storeUsers.add", { defaultValue: "Add a store user" })}
            </Button>
          )}
        </div>
      </div>
      {problem && (
        <div className="mb-4">
          <ErrorState message={problem} onRetry={loadAll} />
        </div>
      )}

      {tab === "stores" &&
        (stores === null ? (
          <LoadingState />
        ) : stores.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
            <EmptyState
              icon={Store}
              title={t("stores.empty", { defaultValue: "No stores yet" })}
              description={
                owner
                  ? t("stores.emptyHint", {
                      defaultValue:
                        "Add a store; it opens once the bank approves it.",
                    })
                  : undefined
              }
            />
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {stores.map((store) => {
              const [key, fallback, tone] = STORE_STATUS[store.status] ?? [
                null,
                store.status,
                "bg-ink/5 text-ink",
              ];
              return (
                <li
                  key={store.id}
                  className="flex flex-col rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {store.name}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {store.code}
                      </p>
                    </div>
                    <Badge tone={tone}>
                      {key ? t(key, { defaultValue: fallback }) : fallback}
                    </Badge>
                  </div>
                  {store.status === "REJECTED" && store.decision_note && (
                    <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                      {store.decision_note}
                    </p>
                  )}
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    {[store.address, store.province, store.phone_number]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {owner && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {store.status !== "INACTIVE" && (
                        <Button
                          variant="secondary"
                          onClick={() => setDialog({ kind: "store", store })}
                          className="px-3 py-2"
                        >
                          <Pencil size={14} />{" "}
                          {t("stores.editShort", { defaultValue: "Edit" })}
                        </Button>
                      )}
                      {store.status === "ACTIVE" && (
                        <Button
                          variant="secondary"
                          onClick={() => setDialog({ kind: "toggle", store })}
                          className="px-3 py-2 text-red-600"
                        >
                          <PowerOff size={14} />{" "}
                          {t("stores.close", { defaultValue: "Close" })}
                        </Button>
                      )}
                      {store.status === "INACTIVE" && (
                        <Button
                          variant="secondary"
                          pending={busy === store.id}
                          onClick={() => setDialog({ kind: "toggle", store })}
                          className="px-3 py-2"
                        >
                          <Power size={14} />{" "}
                          {t("stores.reopen", { defaultValue: "Reopen" })}
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "users" &&
        (users === null ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
            <EmptyState
              icon={Users}
              title={t("storeUsers.empty", {
                defaultValue: "No store users yet",
              })}
              description={
                owner
                  ? t("storeUsers.emptyHint", {
                      defaultValue:
                        "Add store managers and cashiers; they sign in with their own phone and PIN.",
                    })
                  : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-surface shadow-sm">
            {users.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center gap-3 p-4 sm:px-6"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                  <UserRound size={16} />
                </span>
                <span className="min-w-[12rem] flex-1">
                  <span className="block text-sm font-semibold text-slate-800">
                    {person.name}{" "}
                    <span className="font-normal text-slate-500">
                      · {roleName(person.role, t)}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500">
                    {[
                      person.phone_number,
                      (person.stores ?? [])
                        .map((s) => s.name ?? storeName(s.id))
                        .join(", "),
                      person.role === "STORE_MANAGER" &&
                      person.refund_limit != null
                        ? t("storeUsers.limitShort", {
                            amount: formatMoney(person.refund_limit),
                            defaultValue: "Refunds up to {{amount}}",
                          })
                        : null,
                      person.last_sign_in_at
                        ? t("storeUsers.lastSeen", {
                            at: formatDateTime(person.last_sign_in_at),
                            defaultValue: "Last signed in {{at}}",
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Badge
                  tone={
                    person.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-500/15 text-slate-600"
                  }
                >
                  {person.status === "ACTIVE"
                    ? t("myAgents.active", { defaultValue: "Active" })
                    : t("myAgents.inactive", { defaultValue: "Inactive" })}
                </Badge>
                {owner && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setDialog({ kind: "user", user: person })}
                      className="px-3 py-2"
                    >
                      <Pencil size={14} />{" "}
                      {t("stores.editShort", { defaultValue: "Edit" })}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setDialog({ kind: "pin", user: person })}
                      className="px-3 py-2"
                    >
                      <KeyRound size={14} />{" "}
                      {t("storeUsers.resetPinShort", {
                        defaultValue: "New PIN",
                      })}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ))}

      {tab === "wallets" && (
        <ul className="grid gap-4 md:grid-cols-2">
          {storeWallets.map((wallet) => (
            <li
              key={wallet.acct_num}
              className="flex flex-col rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-lime">
                  <Wallet size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {wallet.store_name ??
                      storeName(wallet.store_id) ??
                      wallet.acct_product_name}
                  </p>
                  <p className="break-all text-xs text-slate-500">
                    {wallet.acct_num}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xl font-black tracking-tight text-slate-800">
                {formatMoney(wallet.avail_bal, wallet.currency_code)}
              </p>
              {owner && mainWallets.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setDialog({
                      kind: "sweep",
                      wallet: {
                        ...wallet,
                        store_name:
                          wallet.store_name ?? storeName(wallet.store_id),
                      },
                    })
                  }
                  className="mt-4"
                >
                  <ArrowRightLeft size={15} />{" "}
                  {t("storeWallets.move", { defaultValue: "Move money" })}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === "store" && (
        <StoreDialog
          store={dialog.store}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            loadAll();
          }}
        />
      )}
      {dialog?.kind === "user" && (
        <UserDialog
          user={dialog.user}
          stores={(stores ?? []).filter((s) => s.status !== "REJECTED")}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            loadAll();
          }}
        />
      )}
      {dialog?.kind === "pin" && (
        <PinDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "sweep" && (
        <SweepDialog
          storeWallet={dialog.wallet}
          mainWallets={mainWallets}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            loadAll();
          }}
        />
      )}
      {dialog?.kind === "toggle" && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          pending={busy === dialog.store.id}
          title={
            dialog.store.status === "ACTIVE"
              ? t("stores.closeTitle", {
                  name: dialog.store.name,
                  defaultValue: "Close {{name}}?",
                })
              : t("stores.reopenTitle", {
                  name: dialog.store.name,
                  defaultValue: "Reopen {{name}}?",
                })
          }
          description={
            dialog.store.status === "ACTIVE"
              ? t("stores.closeHint", {
                  defaultValue:
                    "Its terminals stop taking payments until you reopen it.",
                })
              : undefined
          }
          onConfirm={() => void toggleStore()}
        />
      )}
    </div>
  );
}
