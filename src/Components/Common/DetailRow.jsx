// One line of a details list (put inside a <dl>): the label on the left, the
// value on the right.
export default function DetailRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-semibold text-slate-800 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
