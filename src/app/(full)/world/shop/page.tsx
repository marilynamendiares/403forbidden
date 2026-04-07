// src/app/world/shop/page.tsx
import ShopClient from "./shop-client";
import { getSessionViewer } from "@/server/session";
import { getShopForUser } from "@/server/services/shop";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const { userId: me } = await getSessionViewer();

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Shop</h1>
        <p className="mt-2 opacity-70">Please sign in.</p>
      </div>
    );
  }

  const { wallet, items } = await getShopForUser(me);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <ShopClient initialItems={items} initialWallet={wallet} />
    </div>
  );
}
