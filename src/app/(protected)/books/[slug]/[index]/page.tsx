// src/app/books/[slug]/[index]/page.tsx
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { timeAgo } from "@/lib/TimeAgo";
import { redis, chapterLockKey } from "@/server/redis";
import ChapterLiveClient from "@/components/ChapterLiveClient";
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getRole } from "@/server/access";
import { ChapterIntroClient } from "@/components/chapter/ChapterIntroClient";
import { ChapterActionsMenu } from "@/components/chapter/ChapterActionsMenu";

// Поток постов и композер
import { ChapterPostList } from "@/components/chapter/ChapterPostList";
import { ChapterComposer } from "@/components/chapter/ChapterComposer";
import { ChapterStatusBadge } from "@/components/ChapterStatusBadge";
import { ChapterStatusToggleButton } from "@/components/ChapterStatusToggleButton";

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
          href={`/books/${slug}`}
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
          href={`/books/${slug}`}
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
    revalidatePath(`/books/${slug}`);
    revalidatePath(`/books/${slug}/${chapter.index}`);
    redirect(`/books/${slug}/${chapter.index}`);
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

    revalidatePath(`/books/${slug}/${chapter.index}`);
    redirect(`/books/${slug}/${chapter.index}`);
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

    revalidatePath(`/books/${slug}`);
    redirect(`/books/${slug}`);
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
    revalidatePath(`/books/${slug}/${chapter.index}`);
  }

  return (
    <div className="space-y-6">
      <Link
        className="text-sm opacity-70 hover:underline"
        href={`/books/${book.slug}`}
      >
        ← Back to book
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            #{chapter.index} · {chapter.title}{" "}
            {chapter.isDraft ? "– Draft" : ""}
          </h1>

          <p className="opacity-60 text-sm mt-1">
            {chapter.isDraft ? "draft" : "published"}
            {" · "}updated {timeAgo(chapter.updatedAt)}
            {author && (
              <>
                {" · "}
                <span className="opacity-80">
                  created by{" "}
                  <b>
                    @{author.username ??
                      author.displayName ??
                      author.email ??
                      "unknown"}
                  </b>
                </span>
              </>
            )}
            {" · "}status:{" "}
            <ChapterStatusBadge
              status={(chapter.status ?? "OPEN") as "OPEN" | "CLOSED"}
            />
          </p>
        </div>

<ChapterActionsMenu
  canToggle={canToggle}
  canEdit={canEdit}
  isDraft={chapter.isDraft}
  status={(chapter.status ?? "OPEN") as "OPEN" | "CLOSED"}

  reopenCost={REOPEN_COST}
  canAffordReopen={canAffordReopen}

  toggleAction={toggleChapterStatus}
  publishAction={publishThisChapter}
  deleteAction={deleteThisChapter}
/>
      </div>

      {/* Интро главы + inline-редактор */}
      <ChapterIntroClient
        chapterId={chapter.id} // 🆕
        canEdit={canEdit}
        defaultTitle={chapter.title}
        defaultContent={chapter.markdown ?? ""}
        onSave={save}
      />

      {/* Поток постов */}
      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Posts</h2>
        <ChapterPostList
          slug={slug}
          index={chapter.index}
          currentUserId={me}
          // 🆕 пробрасываем индекс следующей главы (или null)
          nextChapterIndex={nextChapterIndex}
        />
        <ChapterComposer
          slug={slug}
          index={chapter.index}
          disabled={!canPost}
        />
      </div>

      {/* SSE подписчик */}
      <ChapterLiveClient slug={slug} index={String(chapter.index)} />
    </div>
  );
}
