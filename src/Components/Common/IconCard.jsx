// A titled card: a brand-coloured icon tile and the title, an optional hint
// under it, then the content. Used by the Security and Profile pages.
export default function IconCard({ icon, title, hint, children }) {
  const Icon = icon;
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient text-lime shadow-md">
          <Icon size={16} />
        </span>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>
      {/* Two lines are always reserved, so the fields of cards side by side start at the same height. */}
      {hint && <p className="mt-3 text-sm leading-6 text-slate-500 lg:min-h-[3rem]">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
