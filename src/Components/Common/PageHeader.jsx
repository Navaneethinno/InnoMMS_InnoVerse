export default function PageHeader({ eyebrow, title, description }) {
  return (
    <header>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      )}
    </header>
  );
}
