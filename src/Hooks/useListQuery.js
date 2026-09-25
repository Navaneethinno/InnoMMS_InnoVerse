import { useCallback, useEffect, useState } from "react";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { rowsOf } from "@/Services/api/request";
import { notifications } from "@/Utils/Lib/notifications";

// Everything a maker-checker list screen needs, in one hook:
//   - page / limit, the status tab (`filter`) and order (`sort_by`) — all
//     applied by the SERVER across every record, never in the browser
//   - rows + pagination from the response
//   - live updates: refetches when the entity's WebSocket channel pushes
//
//   const list = useListQuery(categoryApi.list, API_ENDPOINTS.EXAMPLE.CATEGORY.LIST);
//   <StatusFilterTabs serverFiltered {...list.tabsProps} ... />
//   <DataTable rows={list.rows} isLoading={list.loading} serverPagination={list.paginationProps} ... />
//   after a save/action: list.reload()
export function useListQuery(listFn, livePath, { initialLimit = 10 } = {}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [filter, setFilterState] = useState("all");
  const [sortBy, setSortByState] = useState("desc");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const response = await listFn({ page, limit, filter, sort_by: sortBy });
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? response?.data?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [listFn, page, limit, filter, sortBy],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  useLiveChannel(livePath, () => void reload({ silent: true }));

  // Changing the tab or the order always goes back to page 1.
  const setFilter = (next) => {
    setFilterState(next);
    setPage(1);
  };
  const setSortBy = (next) => {
    setSortByState(next);
    setPage(1);
  };

  return {
    rows,
    pagination,
    loading,
    reload,
    page,
    limit,
    filter,
    sortBy,
    setPage,
    setFilter,
    setSortBy,
    // Spread onto <StatusFilterTabs serverFiltered ...>
    tabsProps: {
      rows,
      total: pagination.totalRecords,
      value: filter,
      onChange: setFilter,
      sortBy,
      onSortChange: setSortBy,
    },
    // Pass as <DataTable serverPagination={...}>
    paginationProps: {
      page,
      totalPages: pagination.totalPages ?? 1,
      totalRecords: pagination.totalRecords ?? rows.length,
      onPageChange: setPage,
      limit,
      onLimitChange: (next) => {
        setLimit(next);
        setPage(1);
      },
    },
  };
}
