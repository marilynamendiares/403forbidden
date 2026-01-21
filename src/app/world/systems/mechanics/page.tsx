import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type ArchivePageProps = {
  title: string;
  subtitle?: string;
  tag?: string;
  backHref?: string;
};

function ArchivePlaceholder({
  title,
  subtitle,
  tag = "SYSTEMS",
  backHref = "/world/systems",
}: ArchivePageProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <BackButton
          fallbackHref={backHref}
          className="text-sm opacity-60 hover:opacity-100 transition"
          label="← Back"
        />

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <span className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            {tag}
          </span>
        </div>

        {subtitle && <p className="text-sm opacity-70 max-w-xl">{subtitle}</p>}
      </div>

      <div className="border border-white/10 rounded-2xl p-6 bg-white/2">
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-[0.22em] opacity-50">
            Under construction
          </div>

          <p className="text-sm opacity-70 leading-relaxed max-w-xl">
            This section will describe how the world works: economy, reputation, shop,
            collaborations, locks, and any gameplay mechanics we formalize.
          </p>

          <p className="text-sm opacity-50">
            Status: <span className="font-mono">READ-ONLY</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ArchivePlaceholder
      title="Mechanics"
      subtitle="Systems & gameplay rules."
      tag="SYSTEMS"
      backHref="/world/systems"
    />
  );
}
