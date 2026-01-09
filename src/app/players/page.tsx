// src/app/players/page.tsx
export const dynamic = "force-dynamic";

export default function PlayersPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Players</h1>
      <p className="opacity-70">
        Coming soon. This section will host player directory, applications, and profiles.
      </p>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="text-xs uppercase tracking-[0.22em] font-mono opacity-60">
          STATUS
        </div>
        <div className="mt-2 text-sm opacity-80">
          Under construction.
        </div>
      </div>
    </div>
  );
}
