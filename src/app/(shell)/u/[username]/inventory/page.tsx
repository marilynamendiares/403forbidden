// src/app/u/[username]/inventory/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      profile: { select: { displayName: true } },
    },
  });

  if (!user) return { title: "Inventory not found" };

  const name = user.profile?.displayName ?? user.username;
  return { title: `${name} — Inventory` };
}

export const dynamic = "force-dynamic";

export default async function UserInventoryPage({ params }: Params) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true } },
    },
  });

  if (!user) notFound();

  const inventory = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      item: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          priceEurodollars: true,
          requiredReputation: true,
        },
      },
    },
  });

  // группируем по категории
  const grouped = new Map<string, typeof inventory>();
  for (const row of inventory) {
    const cat = row.item.category || "OTHER";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(row);
  }

  const name = user.profile?.displayName ?? user.username;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="opacity-60 text-sm">
            @{user.username} · {name}
          </p>
        </div>

        <a
          href={`/u/${encodeURIComponent(user.username)}`}
          className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-900"
        >
          Back to profile
        </a>
      </div>

      {inventory.length === 0 ? (
        <div className="border border-neutral-800 rounded-xl p-6">
          <p className="opacity-70">No items yet.</p>
          <p className="mt-2 text-sm opacity-60">
            Visit the <a className="underline" href="/world/shop">shop</a> to buy upgrades.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([cat, rows]) => (
            <section
              key={cat}
              className="border border-neutral-800 rounded-xl p-4"
            >
              <h2 className="text-lg font-medium">{cat}</h2>

              <div className="mt-3 grid gap-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-neutral-800 bg-neutral-950/30 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium">{row.item.title}</div>
                        {row.item.description ? (
                          <div className="mt-1 text-sm opacity-70">
                            {row.item.description}
                          </div>
                        ) : null}

                        <div className="mt-2 text-xs opacity-70 flex items-center gap-4">
                          <span className="text-neutral-400">
                            ⭐ <span className="tabular-nums">{row.item.requiredReputation}</span>
                          </span>
                          <span className="text-emerald-400">
                            <span className="font-mono">€$</span>{" "}
                            <span className="text-neutral-300 tabular-nums">
                              {row.item.priceEurodollars}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] opacity-60 whitespace-nowrap">
                        acquired{" "}
                        <span className="tabular-nums">
                          {row.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
