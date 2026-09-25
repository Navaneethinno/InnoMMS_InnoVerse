import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { matchesAction } from "@/Utils/Lib/actionAliases";

// Permissions come from the signed-in user's menu_array (login response) —
// the same data the sidebar is built from. A button shows only when its
// action is granted on that menu, so users never see actions that would just
// fail server-side.
//
//   const can = useMenuPermission("Category");
//   can("Add") / can("Edit") / can("Authorize") / can("Delete") / can("Change Status")
//
// menuName is the sidebar menu_name exactly (case-insensitive). For nested
// menus with a repeated name, pass the parent chain: "Master|Category".
export function useMenuPermission(menuName) {
  const menuArray = useSelector((store) => store.menu.menuArray);
  const menu = useMemo(() => {
    const chain = String(menuName).split("|").map((n) => n.trim().toLowerCase());
    const name = chain[chain.length - 1];
    const byId = new Map((menuArray ?? []).map((m) => [m.menu_id, m]));
    return (menuArray ?? []).find((m) => {
      if (String(m?.menu_name ?? "").trim().toLowerCase() !== name) return false;
      // Walk up the parents to confirm the chain when one was given.
      let parent = byId.get(m.parent_menu_id);
      for (let i = chain.length - 2; i >= 0; i--) {
        if (String(parent?.menu_name ?? "").trim().toLowerCase() !== chain[i]) return false;
        parent = byId.get(parent?.parent_menu_id);
      }
      return true;
    });
  }, [menuArray, menuName]);
  return useCallback(
    (action) => (menu?.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
    [menu],
  );
}
