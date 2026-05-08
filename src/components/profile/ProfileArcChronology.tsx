import Link from "next/link";
import type { ProfileArcChronologyItem } from "@/server/services/profileArcChronology";

function formatActivityDate(date: Date | string | null) {
  if (!date) return "date unknown";

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "date unknown";

  return parsed.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function roleLabel(role: ProfileArcChronologyItem["role"]) {
  switch (role) {
    case "creator":
      return "created";
    case "collaborator":
      return "collaborator";
    case "participant":
      return "posted";
  }
}

export default function ProfileArcChronology({
  items,
  isLocked = false,
  emptyTitle = "No public arcs yet",
  emptyDescription = "Public arcs and character activity will appear here after gameplay begins.",
}: {
  items: ProfileArcChronologyItem[];
  isLocked?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (isLocked) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Arcs
        </div>
        <h2 className="mt-2 text-lg font-semibold text-neutral-100">
          Character required
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Arc chronology unlocks after character approval.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Arcs
      </div>
      <h2 className="mt-2 text-lg font-semibold text-neutral-100">
        Public chronology
      </h2>

      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          <span className="text-neutral-200">{emptyTitle}</span>
          <br />
          {emptyDescription}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-neutral-900">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/arcs/${item.slug}`}
              className="block py-3 first:pt-0 last:pb-0 hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-neutral-100">
                    {item.title}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span>{roleLabel(item.role)}</span>
                    <span>{item.userPostCount} posts</span>
                    <span>{item.visibility.toLowerCase()}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-neutral-500">
                  <div>{formatActivityDate(item.lastActivityAt)}</div>
                  <div className="mt-1 uppercase tracking-[0.12em]">{item.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
