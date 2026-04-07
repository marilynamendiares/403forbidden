"use client";

import { fetchJson } from "@/lib/apiClient";

type Wallet = { eurodollars: number; reputationTotal: number };

export type ShopBuyResponse = {
  wallet?: Partial<Wallet>;
};

export async function buyShopItem(itemId: string) {
  return fetchJson<ShopBuyResponse>("/api/shop/buy", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId }),
    includeCredentials: true,
  });
}
