import Link from "next/link";

export default function AdminMetricCard({
  label,
  value,
  detail,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  detail: string;
  href?: string;
  accent?: string;
}) {
  const body = (
    <div
      className={`rounded-2xl border border-neutral-900 bg-neutral-950/40 px-4 py-4 transition hover:border-neutral-800 hover:bg-neutral-950/55 ${
        accent ?? ""
      }`.trim()}
    >
      <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold leading-none tracking-tight">{value}</div>
      <div className="mt-3 text-sm leading-6 text-neutral-400">{detail}</div>
    </div>
  );

  if (!href) {
    return body;
  }

  return <Link href={href} className="block">{body}</Link>;
}
