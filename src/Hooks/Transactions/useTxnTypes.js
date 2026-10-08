import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadTxnTypes } from "@/Services/Account/account.api";

// The kinds of transaction as the API names them (in the language shown): for
// the History filter and the names of the lines. null until they arrive, or if
// they cannot be had (the portal's own labels are used then).
//
// One call per language for the whole page: every line asks, but they all share
// the one answer (and the one request while it is in flight).
let cache = null;

function fetchTypes(language) {
  if (cache?.language === language) return cache.promise;
  const entry = { language, list: null };
  entry.promise = loadTxnTypes()
    .then((rows) => {
      entry.list = rows;
      return rows;
    })
    .catch((error) => {
      if (cache === entry) cache = null;
      throw error;
    });
  cache = entry;
  return entry.promise;
}

export function useTxnTypes() {
  const { i18n } = useTranslation();
  const [list, setList] = useState(cache?.language === i18n.language ? cache.list : null);
  useEffect(() => {
    let cancelled = false;
    fetchTypes(i18n.language)
      .then((rows) => !cancelled && setList(rows))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);
  return list;
}
