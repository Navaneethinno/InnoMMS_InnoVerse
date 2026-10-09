import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { AlertTriangle, MonitorSmartphone, Settings2 } from "lucide-react";
import Button from "@/Components/Common/Button";
import CheckboxPill from "@/Components/Common/CheckboxPill";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { loadStores, loadStoreUsers } from "@/Services/Store/store.api";
import {
  loadTerminals,
  requestTerminalBlock,
  setupTerminal,
} from "@/Services/Terminal/terminal.api";
import { formatDateTime } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";
import { isOwner, roleName } from "@/Utils/Lib/roles";
import { cn } from "@/Utils/Lib/utils";

// POS terminals (Agents, stores and POS, phase 6). The bank registers them and
// assigns them to the merchant; the owner places each in an Active store, names
// it and may limit who signs in on it, and can ask the bank to block one (lost,
// stolen, broken). A store manager sees its stores' terminals, read-only.
// Terminal fields are read defensively: the list is "the same shape as admin's".
const tidOf = (x) => x.tid ?? x.terminal_id ?? x.id;
const storeIdOf = (x) => x.store_id ?? x.store?.id ?? null;
const storeNameOf = (x, stores) =>
  x.store_name ??
  x.store?.name ??
  stores?.find((s) => s.id === storeIdOf(x))?.name ??
  null;
const userIdsOf = (x) =>
  (x.user_ids ?? (x.users ?? []).map((u) => u.id ?? u.portal_user_id)).filter(
    (id) => id != null,
  );
const statusOf = (x) => String(x.status_name ?? x.status ?? "").toUpperCase();

function SetupDialog({ terminal, stores, users, onClose, onSaved }) {
  const { t } = useTranslation();
  const activeStores = stores.filter((s) => s.status === "ACTIVE");
  const [storeId, setStoreId] = useState(
    storeIdOf(terminal) ?? activeStores[0]?.id ?? "",
  );
  const [name, setName] = useState(terminal.name ?? "");
  const [userIds, setUserIds] = useState(userIdsOf(terminal));
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const storeUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.stores ?? []).some((s) => s.id === Number(storeId)) &&
          u.status === "ACTIVE",
      ),
    [users, storeId],
  );
  const moving =
    storeIdOf(terminal) != null && Number(storeId) !== storeIdOf(terminal);
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      await setupTerminal({
        id: terminal.id,
        storeId: Number(storeId),
        name: name.trim(),
        userIds: userIds.filter((id) => storeUsers.some((u) => u.id === id)),
      });
      notifications.success(
        t("terminals.saved", { defaultValue: "Terminal set up." }),
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
      title={t("terminals.setup", { defaultValue: "Set up terminal" })}
      description={String(tidOf(terminal))}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <label className="block text-sm font-semibold text-slate-700">
          {t("terminals.store", { defaultValue: "Store" })}
          <select
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-surface px-3 py-3 text-sm"
          >
            {activeStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.code})
              </option>
            ))}
          </select>
        </label>
        {!activeStores.length && (
          <p className="text-sm text-amber-700">
            {t("terminals.noActiveStore", {
              defaultValue:
                "A terminal can go only in an open store. Add a store and wait for the bank to approve it.",
            })}
          </p>
        )}
        {moving && (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            {t("terminals.moveWarn", {
              defaultValue:
                "Moving it to another store signs out everyone on it.",
            })}
          </p>
        )}
        <TextField
          name="name"
          label={t("terminals.name", { defaultValue: "Name (e.g. Till 1)" })}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div>
          <p className="mb-1 text-sm font-semibold text-slate-700">
            {t("terminals.who", { defaultValue: "Who may sign in" })}
          </p>
          <p className="mb-2 text-xs text-slate-500">
            {t("terminals.whoHint", {
              defaultValue:
                "Tick none to let every user of the store sign in. You can always sign in.",
            })}
          </p>
          <div className="flex flex-col gap-2">
            {storeUsers.length ? (
              storeUsers.map((u) => (
                <CheckboxPill
                  key={u.id}
                  label={`${u.name} · ${roleName(u.role, t)}`}
                  checked={userIds.includes(u.id)}
                  onChange={() =>
                    setUserIds((list) =>
                      list.includes(u.id)
                        ? list.filter((x) => x !== u.id)
                        : [...list, u.id],
                    )
                  }
                />
              ))
            ) : (
              <p className="text-xs text-slate-400">
                {t("terminals.noUsers", {
                  defaultValue: "No active users in this store.",
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            pending={pending}
            disabled={!storeId || !name.trim()}
          >
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BlockDialog({ terminal, onClose, onSaved }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      await requestTerminalBlock(terminal.id, reason.trim());
      notifications.success(
        t("terminals.blockSent", { defaultValue: "Sent to the bank." }),
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
      title={t("terminals.report", { defaultValue: "Report a problem" })}
      description={t("terminals.reportHint", {
        defaultValue:
          "Ask the bank to block this terminal (lost, stolen or broken).",
      })}
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <TextField
          name="reason"
          label={t("terminals.reason", { defaultValue: "What happened" })}
          maxLength={255}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" pending={pending} disabled={!reason.trim()}>
            {t("terminals.sendReport", {
              defaultValue: "Ask the bank to block it",
            })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Terminals() {
  const { t } = useTranslation();
  const owner = isOwner(useSelector((state) => state.auth.user));
  const [terminals, setTerminals] = useState(null);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [problem, setProblem] = useState("");
  const [dialog, setDialog] = useState(null);

  const load = useCallback(() => {
    loadTerminals()
      .then((list) => {
        setProblem("");
        setTerminals(list);
      })
      .catch((error) => {
        setTerminals([]);
        setProblem(error.message);
      });
    loadStores()
      .then(setStores)
      .catch(() => {});
    if (owner)
      loadStoreUsers()
        .then(setUsers)
        .catch(() => {});
  }, [owner]);
  useEffect(load, [load]);
  const saved = () => {
    setDialog(null);
    load();
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          {t("terminals.title", { defaultValue: "Terminals" })}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("terminals.subtitle", {
            defaultValue:
              "The POS terminals the bank gave you, and the store each one is in.",
          })}
        </p>
      </div>
      {problem && (
        <div className="mb-4">
          <ErrorState message={problem} onRetry={load} />
        </div>
      )}
      {terminals === null ? (
        <LoadingState />
      ) : terminals.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
          <EmptyState
            icon={MonitorSmartphone}
            title={t("terminals.empty", { defaultValue: "No terminals yet" })}
            description={t("terminals.emptyHint", {
              defaultValue:
                "Terminals appear here once the bank assigns them to you.",
            })}
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {terminals.map((terminal) => {
            const status = statusOf(terminal);
            const good = status === "ACTIVE" || status === "1";
            const storeName = storeNameOf(terminal, stores);
            const rows = [
              [
                t("terminals.type", { defaultValue: "Type" }),
                [
                  terminal.terminal_type ?? terminal.type,
                  terminal.make,
                  terminal.model,
                ]
                  .filter(Boolean)
                  .join(" · "),
              ],
              [
                t("terminals.serial", { defaultValue: "Serial" }),
                terminal.serial_number,
              ],
              [
                t("terminals.store", { defaultValue: "Store" }),
                storeName ??
                  t("terminals.notPlaced", { defaultValue: "Not placed yet" }),
              ],
              [
                t("terminals.lastSeen", { defaultValue: "Last seen" }),
                terminal.last_seen_at
                  ? formatDateTime(terminal.last_seen_at)
                  : null,
              ],
            ];
            return (
              <li
                key={terminal.id}
                className="flex flex-col rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lime">
                      <MonitorSmartphone size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {terminal.name || tidOf(terminal)}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {tidOf(terminal)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                      good
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700",
                    )}
                  >
                    {terminal.status_name ?? terminal.status}
                  </span>
                </div>
                <dl className="mt-4 divide-y divide-slate-100 text-xs">
                  {rows
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-3 py-1.5"
                      >
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="text-right font-semibold text-slate-700">
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
                {terminal.block_requested_at && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle size={13} />{" "}
                    {t("terminals.blockRequested", {
                      at: formatDateTime(terminal.block_requested_at),
                      defaultValue: "Block asked for on {{at}}",
                    })}
                  </p>
                )}
                {owner && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setDialog({ kind: "setup", terminal })}
                      className="px-3 py-2"
                    >
                      <Settings2 size={14} />{" "}
                      {t("terminals.setupShort", { defaultValue: "Set up" })}
                    </Button>
                    {!terminal.block_requested_at && (
                      <Button
                        variant="secondary"
                        onClick={() => setDialog({ kind: "block", terminal })}
                        className="px-3 py-2 text-red-600"
                      >
                        <AlertTriangle size={14} />{" "}
                        {t("terminals.report", {
                          defaultValue: "Report a problem",
                        })}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {dialog?.kind === "setup" && (
        <SetupDialog
          terminal={dialog.terminal}
          stores={stores}
          users={users}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {dialog?.kind === "block" && (
        <BlockDialog
          terminal={dialog.terminal}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
