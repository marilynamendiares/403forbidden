import Link from "next/link";
import AdminSectionCard from "@/components/admin/AdminSectionCard";
import { listAdminWalletActivity } from "@/server/services/adminControl";

function formatDateTime(value: Date) {
  return value.toLocaleString();
}

type PageProps = {
  searchParams: Promise<{ user?: string }>;
};

export default async function AdminWalletPage({ searchParams }: PageProps) {
  const { user = "" } = await searchParams;
  const normalizedUser = user.trim();
  const items = await listAdminWalletActivity(120, normalizedUser);

  return (
    <AdminSectionCard
      eyebrow="Ledger Feed"
      title="Wallet Mutations"
      subtitle={
        normalizedUser
          ? `Newest entries first for ${normalizedUser}.`
          : "Newest entries first."
      }
      contentClassName="space-y-3"
      footer={
        <form className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block flex-1 space-y-1">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Filter by player</div>
            <input
              name="user"
              defaultValue={normalizedUser}
              placeholder="@username or display name"
              className="w-full rounded-lg border border-neutral-800 bg-transparent px-3 py-2.5 text-sm"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900"
            >
              Apply filter
            </button>
            {normalizedUser ? (
              <Link
                href="/admin/wallet"
                className="rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      }
    >
      {items.length === 0 ? (
        <div className="text-sm text-neutral-500">
          {normalizedUser ? "No wallet activity found for that player." : "No wallet activity yet."}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-neutral-900 bg-neutral-950/35 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-neutral-200">
                    {row.user.profile?.displayName ?? `@${row.user.username}`} · {row.kind}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                    €$ {row.eurodollarsDelta >= 0 ? "+" : ""}{row.eurodollarsDelta}
                    {" · "}
                    rep {row.reputationDelta >= 0 ? "+" : ""}{row.reputationDelta}
                  </div>
                </div>
                <div className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  {formatDateTime(row.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminSectionCard>
  );
}
