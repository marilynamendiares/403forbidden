// src/app/books/[slug]/[index]/page.tsx
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation"; // ← добавили для редиректа после delete
import Markdown from "@/components/Markdown";
import { timeAgo } from "@/lib/TimeAgo";
import ChapterEditorClient from "@/components/ChapterEditorClient";
import { redis, chapterLockKey } from "@/server/redis";
import ChapterLiveClient from "@/components/ChapterLiveClient"; // ← NEW

export const dynamic = "force-dynamic";

type ChapRes = {
  book: { title: string; slug: string };
  chapter: {
    id: string;
    index: number;
    title: string;
    markdown: string | null;
    isDraft: boolean;
    publishedAt: string | null;
    updatedAt: string;
  };
  author: {
    id: string | null;
    username: string | null;
    displayName: string | null;
    email: string | null;
  };
  canEdit: boolean;
};

async function getChapter(slug: string, index: string): Promise<ChapRes | null> {
  const h = await headers();
  const origin =
    h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const cookie = (await cookies()).toString();

  const res = await fetch(`${origin}/api/books/${slug}/${index}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : {},
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function ChapterPage({
  params,
}: {
  params: { slug: string; index: string };
}) {
  const { slug, index } = params;
  const data = await getChapter(slug, index);
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

  const { book, chapter, author, canEdit } = data;

  // SSR: читаем лок из Redis только для редакторов (ускоряет показ баннера)
  const sLock = canEdit
    ? await redis.get<{ userId: string; username?: string; since: number }>(
        chapterLockKey(chapter.id)
      )
    : null;

  // ── Server Action: PUBLISH текущей главы ───────────────────────────────────
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

  // ── Server Action: DELETE текущей главы ────────────────────────────────────
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
    redirect(`/books/${slug}`); // назад к книге после удаления
  }

  // ── Server Action: PATCH save (как у тебя было) ────────────────────────────
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
            {/* created by */}
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

        {/* Панель действий: Publish (для draft), Delete (если canEdit) */}
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

      {/* SSR-баннер: только для редакторов */}
      {canEdit && sLock && (
        <div className="rounded-lg border border-yellow-300/40 bg-yellow-50/10 p-3 text-sm">
          Сейчас редактирует <b>@{sLock.username ?? sLock.userId}</b>.
        </div>
      )}

      <Markdown>{chapter.markdown ?? ""}</Markdown>

      {canEdit && (
        <ChapterEditorClient
          chapterId={chapter.id}
          canEdit={canEdit}
          defaultTitle={chapter.title}
          defaultContent={chapter.markdown ?? ""}
          onSave={save}
        />
      )}

      {/* 🔴 Невидимый клиент для SSE — держим в самом низу */}
      <ChapterLiveClient slug={slug} index={index} />
    </div>
  );
}
