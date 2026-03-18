// src/app/arcs/[slug]/[index]/page.tsx
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redis, chapterLockKey } from "@/server/redis";
import ChapterLiveClient from "@/features/chapters/ui/ChapterLiveClient";
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getRole } from "@/server/access";
import { listChaptersForViewer } from "@/server/services/chapters";
import { ChapterIntroClient } from "@/components/chapter/ChapterIntroClient";
import { DeleteChapterControl } from "@/components/chapter/DeleteChapterControl";

// Поток постов и композер
import { ChapterPostList } from "@/components/chapter/ChapterPostList";
import { ChapterComposer } from "@/components/chapter/ChapterComposer";
import { StickyCenterRail } from "@/components/layout/StickyCenterRail";
import { ChapterRailNav } from "@/components/chapter/ChapterRailNav";
import ShellScrollModeSetter from "@/app/shell/ShellScrollMode";
import ShellSurfaceSetter from "@/app/shell/ShellSurface";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import { computeReadingStats } from "@/lib/readingTime";

export const dynamic = "force-dynamic";

type ChapRes = {
  book: { id: string; slug: string; title: string; ownerId: string };
  chapter: {
    id: string;
    index: number;
    title: string;
    markdown: string | null;
    isDraft: boolean;
    publishedAt: string | null;
    updatedAt: string;
    status?: "OPEN" | "CLOSED";
  };
  author: {
    id: string | null;
    username: string | null;
    displayName: string | null;
    email: string | null;
  };
  canEdit: boolean;
};

function toInt(v: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstSentence(html: string) {
  const plain = stripHtml(html);
  if (!plain) return "";

  const match = plain.match(/^(.+?[.!?。])(\\s|$)/);
  if (match?.[1]) return match[1].trim();

  return plain;
}

// ─────────────────────────────────────────────────────────────────────────────
// Читаем главу НАПРЯМУЮ через Prisma (без server fetch внутрь API)
// ─────────────────────────────────────────────────────────────────────────────
async function getChapterDirect(
  slug: string,
  index: number
): Promise<ChapRes | null> {
  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined);

  const row = await prisma.chapter.findFirst({
    where: { index, book: { slug } },
    select: {
      id: true,
      index: true,
      title: true,
      markdown: true,
      contentHtml: true, // 🆕
      isDraft: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          username: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      book: { select: { id: true, slug: true, title: true, ownerId: true } },
    },
  });
  if (!row) return null;

  // доступ к черновику — владелец или коллаборатор книги
  if (row.isDraft || !row.publishedAt) {
    const isOwner = !!me && me === row.book.ownerId;
    const isCollaborator =
      !!me &&
      !!(await prisma.collaborator.findFirst({
        where: { bookId: row.book.id, userId: me, pageId: null },
        select: { id: true },
      }));
    if (!isOwner && !isCollaborator) {
      return null; // маскируем как not found
    }
  }

  const canEdit = !!me && (me === row.book.ownerId || me === row.authorId);

  return {
    book: {
      id: row.book.id,
      slug: row.book.slug,
      title: row.book.title,
      ownerId: row.book.ownerId,
    },
    chapter: {
      id: row.id,
      index: row.index,
      title: row.title,
      // 🆕 canonical HTML: сначала contentHtml, затем markdown как fallback
      markdown: (row as any).contentHtml ?? row.markdown ?? "",
      isDraft: row.isDraft,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      status: row.status as "OPEN" | "CLOSED" | undefined,
    },
    author: {
      id: row.author?.id ?? null,
      username: row.author?.username ?? null,
      displayName: row.author?.profile?.displayName ?? null,
      email: row.author?.email ?? null,
    },
    canEdit,
  };
}

export default async function ChapterPage({
  params,
}: {
  // важно: Promise — и обязательно await внизу
  params: Promise<{ slug: string; index: string }>;
}) {
  const { slug, index } = await params;
  const idx = toInt(index);
  if (!idx) {
    return (
      <div className="space-y-6">
        <Link
          className="text-sm opacity-70 hover:underline"
          href={`/arcs/${slug}`}
        >
          ← Back to book
        </Link>
        <h1 className="text-2xl font-semibold">Bad chapter index</h1>
      </div>
    );
  }

  const data = await getChapterDirect(slug, idx);
  if (!data) {
    return (
      <div className="space-y-6">
        <a
          className="text-sm opacity-70 hover:underline"
          href={`/arcs/${slug}`}
        >
          ← Back to book
        </a>
        <h1 className="text-2xl font-semibold">Chapter not found</h1>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  const me =
    (session?.user?.id as string | undefined) ??
    ((session as any)?.userId as string | undefined) ??
    null;

  const { book, chapter, author, canEdit } = data;
  const isClosed = (chapter.status ?? "OPEN") === "CLOSED";
  const chapterListData = await listChaptersForViewer({ slug, viewerId: me });
  const chapters = chapterListData?.chapters ?? [];
  const chapterNavItems = chapters.map((c: any) => ({
    id: c.id,
    index: c.index,
    title: c.title,
    isDraft: !c.publishedAt,
    postsCount:
      (c._count?.posts as number | undefined) ??
      (c.postsCount as number | undefined) ??
      (c.postCount as number | undefined) ??
      null,
  }));

  const currentChapterPosts = await prisma.chapterPost.findMany({
    where: { chapterId: chapter.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      contentMd: true,
      contentHtml: true,
    },
  });

  const chapterPostNavItems = currentChapterPosts
    .map((post) => ({
      id: post.id,
      snippet: extractFirstSentence(post.contentHtml ?? post.contentMd),
    }))
    .filter((post) => post.snippet.length > 0);

  const readingSource = [
    stripHtml(chapter.markdown ?? ""),
    ...currentChapterPosts.map((post) => stripHtml(post.contentHtml ?? post.contentMd ?? "")),
  ]
    .filter(Boolean)
    .join(" ");
  const chapterReadingStats = computeReadingStats(readingSource);
  const publicationLabel = chapter.isDraft ? "Draft" : "Published";
  const progressLabel = (chapter.status ?? "OPEN") === "CLOSED" ? "Completed" : "Ongoing";

  // 👉 Ищем следующую опубликованную главу этой же книги
  const nextChapter = await prisma.chapter.findFirst({
    where: {
      bookId: book.id,
      index: { gt: chapter.index },
      isDraft: false,
      publishedAt: { not: null },
    },
    orderBy: { index: "asc" },
    select: { index: true },
  });
  const nextChapterIndex = nextChapter?.index ?? null;

  // 🧮 права
  let canPost = false;
  let canToggle = false;

  if (me) {
    const role = await getRole(me, book.id);
    const isOwner = me === book.ownerId;

    // постить можно только в OPEN и с ролями OWNER/EDITOR/AUTHOR
    canPost = !isClosed && (isOwner || role === "EDITOR" || role === "AUTHOR");

    // право открывать/закрывать главу — OWNER/EDITOR
    canToggle = isOwner || role === "EDITOR";
  }

  const REOPEN_COST = 10;

let canAffordReopen = false;

if (me && canToggle) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: me },
    select: { eurodollars: true },
  });

  canAffordReopen = (wallet?.eurodollars ?? 0) >= REOPEN_COST;
}


  // SSR: баннер блокировки
  const sLock = canEdit
    ? await redis.get<{ userId: string; username?: string; since: number }>(
        chapterLockKey(chapter.id)
      )
    : null;

  // ── Server Action: PUBLISH ─────────────────────────────────────────────────
  async function publishThisChapter() {
    "use server";
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(
      `${origin}/api/books/${slug}/${chapter.index}/publish`,
      {
        method: "POST",
        headers: { cookie },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to publish (${res.status}): ${txt}`);
    }

    // чтобы обновился и список глав, и сама страница
    revalidatePath(`/arcs/${slug}`);
    revalidatePath(`/arcs/${slug}/${chapter.index}`);
    redirect(`/arcs/${slug}/${chapter.index}`);
  }

  // ── Server Action: TOGGLE OPEN/CLOSE ───────────────────────────────────────
  async function toggleChapterStatus() {
    "use server";
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const endpoint = (chapter.status ?? "OPEN") === "OPEN" ? "close" : "open";

    // ✅ Канонический API: по chapter.id
    const res = await fetch(
      `${origin}/api/books/${slug}/chapters/${chapter.id}/${endpoint}`,
      {
        method: "POST",
        headers: { cookie },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to toggle status (${res.status}): ${txt}`);
    }

    revalidatePath(`/arcs/${slug}/${chapter.index}`);
    redirect(`/arcs/${slug}/${chapter.index}`);
  }

  // ── Server Action: DELETE ──────────────────────────────────────────────────
  async function deleteThisChapter() {
    "use server";
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

    const res = await fetch(`${origin}/api/books/${slug}/${chapter.index}`, {
      method: "DELETE",
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to delete (${res.status}): ${txt}`);
    }

    revalidatePath(`/arcs/${slug}`);
    redirect(`/arcs/${slug}`);
  }

  // ── Server Action: SAVE (PATCH) ────────────────────────────────────────────
  async function save(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const content = String(formData.get("content") ?? "");

    const h = await headers();
    const origin =
      h.get("origin") ??
      `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const cookie = (await cookies()).toString();

    const res = await fetch(`${origin}/api/books/${slug}/${chapter.index}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title, content }),
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to update chapter (${res.status}): ${txt}`);
    }
    revalidatePath(`/arcs/${slug}/${chapter.index}`);
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden text-[#2D2D2D]">
      <ShellScrollModeSetter mode="split" />
      <ShellVariantSetter variant="full" />
      <ShellSurfaceSetter surface="light" />
      <div
        className="grid h-full min-h-0 gap-0 overflow-hidden"
        style={{ gridTemplateColumns: "minmax(0, 1fr) var(--right-rail-w)" }}
      >
        <StickyCenterRail
          breadcrumb={
            <div className="header-font-archimoto inline-flex w-fit items-center gap-2 text-[15px] font-thin leading-none uppercase text-[#666666]">
              <span>/</span>
              <Link href="/arcs" className="transition-colors hover:text-[#2D2D2D]">
                ARCS
              </Link>
              <span>/</span>
              <Link
                href={`/arcs/${slug}`}
                className="transition-colors hover:text-[#2D2D2D]"
              >
                {book.title}
              </Link>
              <span>/</span>
            </div>
          }
          stickySuffix={
            <span className="header-font-archimoto text-[15px] font-thin leading-none uppercase text-[#666666]">
              {chapter.title}
            </span>
          }
        >
          <div className="flex flex-col gap-[30px]">
            <h1
              data-sticky-title
              className="text-[36px] leading-none font-bold text-[#2D2D2D]"
            >
              {chapter.title}
            </h1>

            <ChapterIntroClient
              chapterId={chapter.id}
              canEdit={canEdit}
              defaultTitle={chapter.title}
              defaultContent={chapter.markdown ?? ""}
              onSave={save}
            />

            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">Posts</h2>
              <ChapterPostList
                slug={slug}
                index={chapter.index}
                currentUserId={me}
              />
              <ChapterComposer
                slug={slug}
                index={chapter.index}
                disabled={!canPost}
                nextChapterIndex={nextChapterIndex}
              />

              <div className="header-font-archimoto mt-8 grid gap-2 text-[15px] font-thin leading-none uppercase text-[#666666]">
                <div className="flex items-center gap-2">
                  <span>{publicationLabel}</span>
                  <span>/</span>
                  <span>{progressLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    ~{chapterReadingStats.minutes} min read / {chapterReadingStats.words} words
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {chapter.isDraft && (
                    <form action={publishThisChapter}>
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-md border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition hover:bg-[#2D2D2D]/5"
                      >
                        Publish chapter
                      </button>
                    </form>
                  )}

                  {canToggle && !chapter.isDraft && (
                    <form action={toggleChapterStatus}>
                      <button
                        type="submit"
                        disabled={isClosed && !canAffordReopen}
                        title={
                          isClosed && !canAffordReopen
                              ? `Not enough funds (need ${REOPEN_COST} €$)`
                              : undefined
                        }
                        className={[
                          "inline-flex items-center gap-3 rounded-md border border-neutral-700 px-4 py-2 text-sm text-[#2D2D2D] transition",
                          isClosed && !canAffordReopen
                            ? "cursor-not-allowed opacity-40"
                            : "hover:bg-[#2D2D2D]/5",
                        ].join(" ")}
                      >
                        <span>{isClosed ? "Re-open chapter" : "Complete chapter"}</span>
                        {isClosed && (
                          <span className="header-font-archimoto text-[15px] font-thin leading-none text-[#666666]">
                            -{REOPEN_COST} €$
                          </span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </StickyCenterRail>

        <aside className="scrollbar-hidden h-full min-h-0 min-w-0 overflow-y-auto pl-[72px] pb-10 pt-[155px]">
          <div className="flex min-h-full flex-col">
            <ChapterRailNav
              slug={slug}
              currentChapterIndex={chapter.index}
              chapters={chapterNavItems}
              currentChapterPosts={chapterPostNavItems}
            />

            {canEdit && (
              <div className="mt-auto flex justify-end pt-10">
                <DeleteChapterControl action={deleteThisChapter} />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* SSE подписчик */}
      <ChapterLiveClient slug={slug} index={String(chapter.index)} />
    </div>
  );
}
