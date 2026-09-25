import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusFilterTabs } from "@/Components/Common/StatusFilterTabs";
import { RowActions } from "@/Components/Common/RowActions";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useListQuery } from "@/Hooks/useListQuery";
import { useMenuPermission } from "@/Hooks/useMenuPermission";
import { categoryApi } from "@/Services/Example/category.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { CategoryForm, emptyCategory } from "./CategoryForm";

// Reference list screen — copy this for every new maker-checker menu.
// Sidebar: Example > Master > Category   Route: /category/:id
//
// Flow: useListQuery loads the page (server filter + sort, live refresh) ->
// StatusFilterTabs + DataTable render it -> RowActions shows only the actions
// this row's state allows AND the user holds -> form / confirm dialogs call
// categoryApi -> toast shows the backend message -> list.reload().

const idOf = (row) => row?.id;
const glassPanel = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};

export function Category() {
  const { t } = useTranslation(["category", "common"]);
  const can = useMenuPermission("Category");
  const list = useListQuery(categoryApi.list, API_ENDPOINTS.EXAMPLE.CATEGORY.LIST);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // { mode, row, value }
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState(null);
  const [action, setAction] = useState(null); // { type, row, reason }
  const [actionPending, setActionPending] = useState(false);
  const pendingInfo = usePendingChanges(
    categoryApi.pending,
    action ? idOf(action.row) : null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );

  // Search has no server param yet, so it narrows the loaded page only.
  const q = search.trim().toLowerCase();
  const visible = q ? list.rows.filter((r) => `${r.code ?? ""} ${r.name ?? ""}`.toLowerCase().includes(q)) : list.rows;

  const openForm = (mode, row = null) =>
    setForm({ mode, row, value: row ? { code: row.code ?? "", name: row.name ?? "", description: row.description ?? "" } : emptyCategory() });

  const save = async (asDraft) => {
    const { mode, row, value } = form;
    if (!value.code.trim() || !value.name.trim()) {
      notifications.error(t("requiredFields"));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...value, is_draft: asDraft, ...(mode === "edit" ? { id: idOf(row), expected_updated_time: row.updated_time } : {}) };
      const response = await (mode === "edit" ? categoryApi.edit(payload) : categoryApi.add(payload));
      notifications.success(apiMessage(response, t("saved")));
      setForm(null);
      void list.reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    setActionPending(true);
    try {
      const payload = { id: idOf(action.row), narration: action.reason ?? "" };
      const response = await categoryApi[action.type](payload);
      notifications.success(apiMessage(response, t("actionDone")));
      setAction(null);
      void list.reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setActionPending(false);
    }
  };

  const columns = [
    { key: "code", label: t("code"), align: "left" },
    { key: "name", label: t("name"), align: "left" },
    { key: "status", label: t("common:status"), render: (r) => <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} /> },
    { key: "process_status_name", label: t("common:processStatus"), render: (r) => (r.process_status_name ? <StatusBadge status={r.process_status_name} variant="subtle" /> : "—") },
    { key: "auth_status", label: t("common:authorizationStatus"), render: (r) => (r.auth_status ? <StatusBadge status={r.auth_status} variant="subtle" /> : "—") },
    {
      key: "actions",
      label: t("common:actions"),
      render: (row) => {
        const buttons = getMakerCheckerButtons(row, {
          canAdd: can("Add"),
          canEdit: can("Edit"),
          canAuthorize: can("Authorize"),
          canDelete: can("Delete"),
          canChangeStatus: can("Change Status"),
        });
        const ask = (type) => () => setAction({ type, row, reason: "" });
        return (
          <RowActions
            buttons={buttons}
            onView={() => openForm("view", row)}
            onEdit={() => openForm("edit", row)}
            onAudit={() => setAudit(row)}
            onSubmit={ask("submit")}
            onAuthorize={ask(buttons.isPendingDelete ? "deleteAuth" : "auth")}
            onDeauthorize={ask("deauth")}
            onDeactivate={ask("deactivate")}
            onReactivate={ask("reactivate")}
            onDelete={ask("delete")}
          />
        );
      },
    },
  ];

  return (
    <div className="pb-6 pt-1">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{t("title")}</h1>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl" style={glassPanel}>
        <StatusFilterTabs
          serverFiltered
          bare
          {...list.tabsProps}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={t("searchPlaceholder")}
          actions={
            can("Add") && (
              <button type="button" onClick={() => openForm("add")} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white">
                <Plus size={14} /> {t("addTitle")}
              </button>
            )
          }
        />
        <DataTable
          bare
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={list.loading}
          title={t("title")}
          emptyTitle={t("emptyTitle")}
          serverPagination={list.paginationProps}
        />
      </div>

      {form && <CategoryForm mode={form.mode} value={form.value} setValue={(value) => setForm({ ...form, value })} saving={saving} onSave={save} onClose={() => setForm(null)} />}

      {audit && (
        <AuditModal
          title={audit.name ?? `#${idOf(audit)}`}
          fields={[["code", t("code")], ["name", t("name")], ["description", t("common:description")]]}
          onClose={() => setAudit(null)}
          fetchAudit={(page, limit) => categoryApi.audit({ id: idOf(audit), page, limit }).then(mapAuditResponse)}
        />
      )}

      {action && (
        <ConfirmDialog
          open
          title={t(`action_${action.type}`)}
          description={action.row.name}
          confirmLabel={t(`action_${action.type}`)}
          destructive={action.type === "delete" || action.type === "deauth"}
          confirmDisabled={action.type === "deauth" && !action.reason.trim()}
          pending={actionPending}
          onClose={() => setAction(null)}
          onConfirm={() => void runAction()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          <textarea
            value={action.reason}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder={t("common:narration")}
            className="mt-3 min-h-20 w-full rounded-xl border p-3 text-sm"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
