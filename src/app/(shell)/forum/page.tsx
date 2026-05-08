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
import { listForumCategoriesWithAccess } from "@/server/services/forumCategories";
import { timeAgo } from "@/lib/TimeAgo";

export const dynamic = "force-dynamic"; // не кешируем
export const revalidate = 0;

const FORUM_CATEGORY_LABELS: Record<string, string> = {
  welcome: "welcome",
  offtopic: "offtopic",
};

function getForumCategoryLabel(category: { slug: string; title: string }) {
  return FORUM_CATEGORY_LABELS[category.slug] ?? category.title;
}

export default async function ForumIndexPage() {
  const viewer = await getSessionViewer();
  const { categories } = await listForumCategoriesWithAccess({
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
                  <li key={c.slug}>
                    {c.canRead ? (
                      <div className="group flex items-stretch justify-between rounded-md border border-neutral-800 bg-neutral-950/35 outline-none hover:border-neutral-500 hover:bg-neutral-900/80">
                        <Link
                          href={`/forum/${c.slug}`}
                          className="min-w-0 flex-1 px-4 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                        >
                          <span>
                            <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-neutral-100">
                              {getForumCategoryLabel(c)}
                            </span>
                            {c.desc && (
                              <span className="mt-1 block text-xs text-neutral-500 group-hover:text-neutral-300">
                                {c.desc}
                              </span>
                            )}
                          </span>
                        </Link>
                        <span className="flex min-w-[220px] max-w-[320px] items-center justify-end border-l border-neutral-900 px-4 py-3 text-right">
                          {c.latestThread ? (
                            <Link
                              href={`/forum/${c.slug}/${c.latestThread.slug}`}
                              className="block min-w-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
                            >
                              <span className="block text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                                last active {timeAgo(c.latestThread.lastActivityAt)}
                              </span>
                              <span className="mt-1 block truncate text-xs font-semibold text-neutral-400 hover:text-neutral-100">
                                {c.latestThread.title}
                              </span>
                              {c.latestThread.hiddenAt && (
                                <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-amber-400/70">
                                  hidden
                                </span>
                              )}
                            </Link>
                          ) : (
                            <span>
                              <span className="block text-xs uppercase tracking-[0.14em] text-neutral-600">
                                no activity logged
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-neutral-700">
                                {c.accessLabel}
                              </span>
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex cursor-not-allowed items-center justify-between rounded-md border border-neutral-900 bg-neutral-950/20 px-4 py-3 opacity-55">
                        <span>
                          <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-neutral-400">
                            {getForumCategoryLabel(c)}
                          </span>
                          {c.desc && (
                            <span className="mt-1 block text-xs text-neutral-600">
                              {c.desc}
                            </span>
                          )}
                        </span>
                        <span className="text-right">
                          <span className="block text-xs uppercase tracking-[0.14em] text-neutral-600">
                            {c._count.threads} threads
                          </span>
                          <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                            {c.accessLabel}
                          </span>
                        </span>
                      </div>
                    )}
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
