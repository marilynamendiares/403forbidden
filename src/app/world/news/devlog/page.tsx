import Link from "next/link";
export const dynamic = "force-dynamic";

export default function Devlog() {
  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm opacity-70 hover:underline" href="/archive/news">← Back</Link>
        <h1 className="text-2xl font-semibold mt-2">Developer Changelog</h1>
        <p className="text-sm opacity-70 mt-1">Platform updates & patch notes.</p>
      </div>

      <div className="border border-white/10 rounded-2xl p-5 bg-white/2 opacity-80">
        <div className="text-sm font-mono uppercase tracking-[0.22em] opacity-60">TODO</div>
        <p className="text-sm opacity-70 mt-2">
          Later: keep entries as structured posts (date, version, bullets).
        </p>
      </div>
    </div>
  );
}
