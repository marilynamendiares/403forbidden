export default function AdminSectionCard({
  eyebrow,
  title,
  subtitle,
  meta,
  className,
  contentClassName,
  footer,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-neutral-900 bg-neutral-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)] ${className ?? ""}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{eyebrow}</div>
          ) : null}
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-neutral-400">{subtitle}</p> : null}
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </div>
      <div className={`mt-4 ${contentClassName ?? ""}`.trim()}>{children}</div>
      {footer ? <div className="mt-4 border-t border-neutral-900 pt-4">{footer}</div> : null}
    </section>
  );
}
