// src/app/books/[slug]/[index]/page.tsx
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Markdown from "@/components/Markdown";
import { timeAgo } from "@/lib/TimeAgo";
import ChapterEditorClient from "@/components/ChapterEditorClient";
import { redis, chapterLockKey } from "@/server/redis";
import ChapterLiveClient from "@/components/ChapterLiveClient";
import { prisma } from "@/server/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getRole } from "@/server/access"; // 🆕 для вычисления canPost

// Поток постов и композер
import { ChapterPostList } from "@/components/chapter/ChapterPostList";
import { ChapterComposer } from "@/components/chapter/ChapterComposer";

export const dynamic = "force-dynamic";

type ChapRes = {
  book: { id: string; slug: string; title: string; ownerId: string }; // 🆕 id + ownerId
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
async function getChapterDirect(slug: string, index: number): Promise<ChapRes | null> {
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
      isDraft: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
      authorId: true,
      author: {
        select: {
          id: true,
          email: true,
          profile: { select: { username: true, displayName: true } },
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
      markdown: row.markdown,
      isDraft: row.isDraft,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      status: row.status as "OPEN" | "CLOSED" | undefined,
    },
    author: {
      id: row.author?.id ?? null,
      username: row.author?.profile?.username ?? null,
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
        <a className="text-sm opacity-70 hover:underline" href={`/books/${slug}`}>
          ← Back to book
        </a>
        <h1 className="text-2xl font-semibold">Bad chapter index</h1>
      </div>
    );
  }

  const data = await getChapterDirect(slug, idx);
  if (!data) {
    return (
      <div className="space-y-6">
        <a className="text-sm opacity-70 hover:underline" href={`/books/${slug}`}>
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

// 🧮 серверно вычисляем право постить (только OPEN и роли OWNER/EDITOR/AUTHOR)
let canPost = false;
if (me) {
  const role = await getRole(me, book.id);
  const isOwner = me === book.ownerId;
  canPost = !isClosed && (isOwner || role === "EDITOR" || role === "AUTHOR");
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
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const res = await fetch(`${origin}/api/books/${slug}/${chapter.index}/publish`, {
      method: "POST",
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to publish (${res.status}): ${txt}`);
    }
    revalidatePath(`/books/${slug}/${chapter.index}`);
  }

  // ── Server Action: DELETE ──────────────────────────────────────────────────
  async function deleteThisChapter() {
    "use server";
    const cookie = (await cookies()).toString();
    const h = await headers();
    const origin =
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
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
      h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const cookie = (await cookies()).toString();

    const res = await fetch(`${origin}/api/books/${slug}/${index}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title, content }),
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to update chapter (${res.status}): ${txt}`);
    }
    revalidatePath(`/books/${slug}/${index}`);
  }

  return (
    <div className="space-y-6">
      <a className="text-sm opacity-70 hover:underline" href={`/books/${book.slug}`}>
        ← Back to book
      </a>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            #{chapter.index} · {chapter.title} {chapter.isDraft ? "– Draft" : ""}
          </h1>

          <p className="opacity-60 text-sm mt-1">
            {chapter.isDraft ? "draft" : "published"}
            {" · "}updated {timeAgo(chapter.updatedAt)}
            {chapter.status && (
              <>
                {" · "}status: <b>{chapter.status}</b>
              </>
            )}
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
          </p>
        </div>

        <div className="flex gap-2">
          {chapter.isDraft && (
            <form action={publishThisChapter}>
              <button
                className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:bg-emerald-50"
                title="Publish chapter"
              >
                Publish
              </button>
            </form>
          )}
          {/* Delete доступен, если canEdit */}
          {canEdit && (
            <form action={deleteThisChapter}>
              <button
                className="rounded-xl border border-neutral-700 px-3 py-2 text-sm hover:bg-red-50"
                title="Delete chapter"
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Баннер блокировки */}
      {canEdit && sLock && (
        <div className="rounded-lg border border-yellow-300/40 bg-yellow-50/10 p-3 text-sm">
          Сейчас редактирует <b>@{sLock.username ?? sLock.userId}</b>.
        </div>
      )}

      {/* Тело главы */}
      <Markdown>{chapter.markdown ?? ""}</Markdown>

      {/* Редактор */}
      {canEdit && (
        <ChapterEditorClient
          chapterId={chapter.id}
          canEdit={canEdit}
          defaultTitle={chapter.title}
          defaultContent={chapter.markdown ?? ""}
          onSave={save}
        />
      )}

      {/* Поток постов */}
<div className="mt-8">
  <h2 className="mb-2 text-lg font-semibold">Posts</h2>
  {/* передаём currentUserId, чтобы показывать Edit/Delete только своим постам */}
  <ChapterPostList slug={slug} index={chapter.index} currentUserId={me} />
  {/* ВАЖНО: Composer должен бить по /api/books/[slug]/[index]/posts */}
  <ChapterComposer slug={slug} index={chapter.index} disabled={!canPost} />
</div>

      {/* SSE подписчик */}
      <ChapterLiveClient slug={slug} index={String(chapter.index)} />
    </div>
  );
}
