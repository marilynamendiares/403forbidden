import Link from "next/link";

type LockedSurfaceProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
};

export default function LockedSurface({
  eyebrow = "Access layer locked",
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: LockedSurfaceProps) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/35 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-neutral-100">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
        {description}
      </p>

      {children ? <div className="mt-4">{children}</div> : null}

      {actionHref && actionLabel ? (
        <div className="mt-4">
          <Link
            href={actionHref}
            className="inline-flex rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 hover:bg-neutral-900"
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
