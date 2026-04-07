// src/app/(shell)/forum/page.tsx
import Link from "next/link";
import {
  FORUM_DISCUSSION_SLUGS,
  sortForumSlugs,
} from "@/server/forumPresentation";
import { getSessionViewer } from "@/server/session";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import ForumPinnedTiles from "@/app/(shell)/forum/ForumPinnedTiles";
import { isAdminSession } from "@/server/admin";
import { listVisibleForumCategories } from "@/server/services/forumCategories";

export const dynamic = "force-dynamic"; // не кешируем
export const revalidate = 0;

export default async function ForumIndexPage() {
  const viewer = await getSessionViewer();
  const { categories } = await listVisibleForumCategories({
    userId: viewer.userId,
    isAdmin: isAdminSession(viewer.session),
  });

  const visible = sortForumSlugs(
    categories.filter((category) => FORUM_DISCUSSION_SLUGS.has(category.slug))
  );

  return (
    <>
      {/* ✅ /forum должен быть широким: растягиваем контент на всю ширину sidebar (center+rail) */}
      <ShellVariantSetter variant="full" />

      <div className="space-y-6">
        {visible.length === 0 && <p className="opacity-60">No categories yet.</p>}

        {visible.length > 0 && (
          <div className="space-y-8">
            {/* NEWS */}
<section className="space-y-6">
  {/* Tiles */}
  <ForumPinnedTiles bgUrl="/textures/forum-hero.jpg" />

  {/* All broadcasts link — теперь ПОД кнопками */}
  <div className="flex justify-end">
    <Link
      href="/forum/news"
      className="text-sm opacity-70 hover:opacity-100 transition-opacity"
    >
      All broadcasts →
    </Link>
  </div>
</section>

            {visible.length > 0 && (
              <ul className="grid gap-3">
                {visible.map((c) => (
                  <li
                    key={c.slug}
                    className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <Link href={`/forum/${c.slug}`} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                      {c.desc && <p className="text-xs opacity-70 mt-1">{c.desc}</p>}
                    </div>
                    <span className="text-xs opacity-60">{c._count.threads} threads</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
