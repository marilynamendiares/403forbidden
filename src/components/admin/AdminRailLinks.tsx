import Link from "next/link";

type Item = {
  href: string;
  label: string;
  count: number;
  detail: string;
  active?: boolean;
};

export default function AdminRailLinks({
  title = "Sections",
  subtitle,
  items,
}: {
  title?: string;
  subtitle?: string;
  items: Item[];
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{title}</div>
        {subtitle ? <p className="text-sm leading-6 text-neutral-400">{subtitle}</p> : null}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-2xl border px-4 py-4 transition ${
              item.active
                ? "border-neutral-700 bg-neutral-900 text-white"
                : "border-neutral-900 bg-neutral-950/35 text-neutral-200 hover:border-neutral-800 hover:bg-neutral-950/55"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{item.label}</div>
                <div className="mt-2 text-sm leading-6 text-neutral-400">{item.detail}</div>
              </div>
              <div className="shrink-0 text-3xl font-semibold leading-none tracking-tight">{item.count}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
