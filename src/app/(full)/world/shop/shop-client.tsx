// src/app/world/shop/shop-client.tsx
"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";

type Item = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  priceEurodollars: number;
  requiredReputation: number;

  alreadyOwned: boolean;
  canBuy: boolean;
  lockedByFunds: boolean;
  lockedByReputation: boolean;
};

type Wallet = { eurodollars: number; reputationTotal: number };

export default function ShopClient({
  initialItems,
  initialWallet,
}: {
  initialItems: Item[];
  initialWallet: Wallet;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [wallet, setWallet] = useState<Wallet>(initialWallet);
  const [busyId, setBusyId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    }
    return [...map.entries()];
  }, [items]);

  async function buy(itemId: string) {
    setBusyId(itemId);
    const res = await fetch("/api/shop/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId }),
      cache: "no-store",
      credentials: "include",
    });
    setBusyId(null);

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Buy failed (${res.status}) ${msg}`);
      return;
    }

    const json = await res.json().catch(() => null);

    // 1) обновляем wallet (приходит из buy endpoint)
    if (json?.wallet) {
      setWallet({
        eurodollars: json.wallet.eurodollars ?? wallet.eurodollars,
        reputationTotal: json.wallet.reputationTotal ?? wallet.reputationTotal,
      });
    }

    // 2) помечаем owned
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, alreadyOwned: true, canBuy: false }
          : it
      )
    );

    // 3) пересчитываем locks/canBuy для всех товаров по новому балансу
    const nextWallet = json?.wallet
      ? {
          eurodollars: json.wallet.eurodollars ?? wallet.eurodollars,
          reputationTotal: json.wallet.reputationTotal ?? wallet.reputationTotal,
        }
      : wallet;

    setItems((prev) =>
      prev.map((it) => {
        const hasFunds = nextWallet.eurodollars >= it.priceEurodollars;
        const hasRep = nextWallet.reputationTotal >= it.requiredReputation;
        const canBuy = !it.alreadyOwned && hasFunds && hasRep;

        return {
          ...it,
          lockedByFunds: !hasFunds,
          lockedByReputation: !hasRep,
          canBuy,
        };
      })
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shop</h1>
          <p className="opacity-60 text-sm">World systems · Vendors</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="inline-flex items-center gap-2 text-neutral-300">
            <Star className="h-4 w-4 text-neutral-400" />
            <span className="tabular-nums">{wallet.reputationTotal}</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <span className="font-mono text-emerald-400">€$</span>
            <span className="tabular-nums text-neutral-300">{wallet.eurodollars}</span>
          </div>
        </div>
      </div>

      {/* ниже остаётся твой grouped map */}

      {grouped.map(([cat, list]) => (
        <section key={cat} className="border border-neutral-800 rounded-xl p-4">
          <h2 className="text-lg font-medium">{cat}</h2>

          <div className="mt-3 grid gap-3">
            {list.map((it) => (
              <div
                key={it.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/30 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="font-medium">{it.title}</div>
                  {it.description ? (
                    <div className="mt-1 text-sm opacity-70">
                      {it.description}
                    </div>
                  ) : null}

                  <div className="mt-2 text-xs opacity-70 flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
  <Star className="h-4 w-4 text-neutral-400" />
  <span className="tabular-nums">{it.requiredReputation}</span>
</span>
                    <span className="text-emerald-400">
                      <span className="font-mono">€$</span>{" "}
                      <span className="text-neutral-300 tabular-nums">
                        {it.priceEurodollars}
                      </span>
                    </span>
                  </div>

                </div>

                <div className="shrink-0 flex flex-col items-end">
                  <button
                    type="button"
                    disabled={!it.canBuy || it.alreadyOwned || busyId === it.id}
                    title={
                      it.alreadyOwned
                        ? "Owned"
                        : it.lockedByReputation
                        ? "Not enough reputation"
                        : it.lockedByFunds
                        ? "Not enough eurodollars"
                        : undefined
                    }
                    onClick={() => buy(it.id)}
                    className={[
                      "rounded-md border px-3 py-2 text-sm transition",
                      it.alreadyOwned
                        ? "opacity-50 cursor-not-allowed border-neutral-700"
                        : it.canBuy
                        ? "bg-white text-neutral-900 border-white hover:bg-neutral-200"
                        : "opacity-40 cursor-not-allowed border-neutral-700",
                    ].join(" ")}
                  >
                    {it.alreadyOwned ? "Owned" : "Buy"}
                  </button>

                  {!it.alreadyOwned && !it.canBuy && (
                    <div className="mt-2 text-[11px] text-neutral-500 text-right leading-tight self-end">
                      {it.lockedByReputation && (
                        <div>
                          Requires <Star className="inline h-3 w-3 -mt-px text-neutral-400" />{" "}
                          {it.requiredReputation}
                        </div>
                      )}
                      {it.lockedByFunds && (
                        <div>
                          Requires <span className="font-mono text-emerald-400">€$</span>{" "}
                          {it.priceEurodollars}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
