import { useEffect, useRef, useState } from "react";
import { useExtOrder } from "@/Services/api/liveUpdates";
import { loadExtOrder, loadReceipt } from "@/Services/Account/account.api";

// Follows an order to an outside provider (mobile money, bank, airtime,
// CREDELEC, bills) after account/send replied PENDING: the live `ext_order`
// event, else account/ext_order every 15 s, until it settles; after 3 minutes
// the screen stops waiting ("we'll let you know").
// Once it succeeds, the receipt is fetched again: it now carries the
// provider's details (token, receipt_no).
//   const { order, receipt, gaveUp, reset } = useExtOrderTracking(sendReply);
const WAIT_MS = 3 * 60 * 1000;
const POLL_MS = 15000;

export function useExtOrderTracking(done) {
  const [order, setOrder] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const orderRef = done?.external?.order_ref;
  const open =
    Boolean(done) &&
    !order &&
    (done.external?.status ?? "SUCCESS") === "PENDING";
  const latest = useRef(null);

  const settle = (next) => {
    if (!next || next.status === "PENDING") return;
    setOrder(next);
    // The live event may carry only error_code: ext_order has the reason.
    if (next.status === "FAILED" && !next.message && next.order_ref)
      loadExtOrder(next.order_ref)
        .then(
          (full) =>
            full?.message && setOrder((o) => ({ ...o, message: full.message })),
        )
        .catch(() => {});
    const rrn = next.rrn ?? done?.rrn;
    if (next.status === "SUCCESS" && rrn)
      loadReceipt({ rrn })
        .then((r) => r && setReceipt(r))
        .catch(() => {});
  };
  latest.current = settle;

  useExtOrder((detail) => {
    if (
      open &&
      ((orderRef && detail?.order_ref === orderRef) ||
        (done.rrn && detail?.rrn === done.rrn))
    )
      latest.current(detail);
  });
  useEffect(() => {
    if (!open || !orderRef) return undefined;
    const poll = window.setInterval(
      () =>
        loadExtOrder(orderRef)
          .then((next) => latest.current(next))
          .catch(() => {}),
      POLL_MS,
    );
    const stop = window.setTimeout(() => setGaveUp(true), WAIT_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
  }, [open, orderRef]);

  const reset = () => {
    setOrder(null);
    setReceipt(null);
    setGaveUp(false);
  };
  return { order, receipt, gaveUp, reset };
}
