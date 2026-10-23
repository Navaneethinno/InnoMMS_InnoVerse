import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Pencil, Trash2, X } from "lucide-react";
import Button from "@/Components/Common/Button";
import TextField from "@/Components/Common/TextField";
import {
  addSavedAccount,
  deleteSavedAccount,
  loadSavedAccounts,
  renameSavedAccount,
} from "@/Services/Account/account.api";

// Saved meters or numbers (kind ELECTRICITY | AIRTIME, up to 20): tap one to
// use it; "Edit" renames or removes them.
const SAVED_MAX = 20;

export function useSavedAccounts(kind) {
  const [items, setItems] = useState([]);
  const reload = useCallback(
    () =>
      loadSavedAccounts(kind)
        .then((rows) =>
          setItems(rows.filter((r) => !r.kind || r.kind === kind)),
        )
        .catch(() => {}),
    [kind],
  );
  useEffect(() => void reload(), [reload]);
  return { items, reload };
}

export default function SavedAccounts({ saved, value, onPick, title }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [problem, setProblem] = useState("");
  if (!saved.items.length) return null;
  const run = (call) =>
    call
      .then(() => {
        setProblem("");
        setRenaming(null);
        return saved.reload();
      })
      .catch((error) => setProblem(error.message));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink"
        >
          {editing
            ? t("cards.done")
            : t("saved.edit", { defaultValue: "Edit" })}
        </button>
      </div>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {saved.items.map((item) =>
          renaming?.id === item.id ? (
            <form
              key={item.id}
              className="flex items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                if (renaming.name.trim())
                  run(
                    renameSavedAccount({
                      id: item.id,
                      name: renaming.name.trim(),
                    }),
                  );
              }}
            >
              <input
                autoFocus
                value={renaming.name}
                maxLength={64}
                onChange={(event) =>
                  setRenaming({ ...renaming, name: event.target.value })
                }
                className="w-36 rounded-lg border border-slate-200 bg-surface px-2 py-1 text-xs outline-none focus:border-ink/40"
              />
              <button
                type="submit"
                aria-label={t("saved.save", { defaultValue: "Save" })}
                className="rounded-lg p-1 text-ink hover:bg-ink/5"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                aria-label={t("list.clear")}
                onClick={() => setRenaming(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-ink/5"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <span
              key={item.id}
              className={`inline-flex items-center rounded-full border text-xs font-bold ${value === item.id ? "border-forest bg-forest text-white dark:border-lime dark:bg-lime dark:text-on-secondary" : "border-slate-200 text-slate-600"}`}
            >
              <button
                type="button"
                disabled={editing}
                onClick={() => onPick(value === item.id ? null : item)}
                className="px-3.5 py-1.5 text-start"
              >
                {item.name || item.account}
                {item.name && (
                  <span className="ms-1.5 font-medium opacity-70">
                    {item.account}
                  </span>
                )}
              </button>
              {editing && (
                <>
                  <button
                    type="button"
                    aria-label={t("saved.rename", { defaultValue: "Rename" })}
                    onClick={() =>
                      setRenaming({ id: item.id, name: item.name ?? "" })
                    }
                    className="p-1.5 hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={t("saved.delete", { defaultValue: "Remove" })}
                    onClick={() => run(deleteSavedAccount(item.id))}
                    className="p-1.5 pe-2.5 text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </span>
          ),
        )}
      </div>
      {problem && <p className="mt-2 text-xs text-red-600">{problem}</p>}
    </div>
  );
}

// "Save this meter / number", on the done screen, when it isn't saved yet.
export function SaveAccount({ saved, kind, account, label }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [problem, setProblem] = useState("");
  if (
    !account ||
    saved.items.some((i) => i.account === account) ||
    saved.items.length >= SAVED_MAX
  ) {
    return state === "saved" ? (
      <p className="mx-auto max-w-2xl text-center text-sm font-semibold text-emerald-600">
        {t("saved.done", { defaultValue: "Saved." })}
      </p>
    ) : null;
  }
  const save = (event) => {
    event.preventDefault();
    setState("pending");
    addSavedAccount({ kind, account, name: name.trim() || account })
      .then(() => {
        setState("saved");
        return saved.reload();
      })
      .catch((error) => {
        setState("");
        setProblem(error.message);
      });
  };
  return (
    <form
      onSubmit={save}
      className="mx-auto flex max-w-2xl flex-wrap items-end gap-3 rounded-3xl border border-dashed border-slate-200 p-4"
    >
      <div className="min-w-[12rem] flex-1">
        <TextField
          name="saveName"
          icon={Bookmark}
          label={label}
          maxLength={64}
          placeholder={account}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <Button type="submit" pending={state === "pending"}>
        {t("saved.save", { defaultValue: "Save" })}
      </Button>
      {problem && <p className="w-full text-xs text-red-600">{problem}</p>}
    </form>
  );
}
