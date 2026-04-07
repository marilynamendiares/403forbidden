// src/app/arcs/[slug]/[index]/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ChapterLiveClient from "@/features/chapters/ui/ChapterLiveClient";
import {
  closeChapter,
  deleteChapterForUser,
  HttpError,
  listChaptersForViewer,
  openChapter,
  publishChapterForUser,
  updateChapterForUser,
} from "@/server/services/chapters";
import { ChapterIntroClient } from "@/components/chapter/ChapterIntroClient";
import { DeleteChapterControl } from "@/components/chapter/DeleteChapterControl";
import { ChapterStatusActions } from "@/components/chapter/ChapterStatusActions";
import { ChapterStatusSummary } from "@/components/chapter/ChapterStatusSummary";

// Поток постов и композер
import { ChapterPostsSectionClient } from "@/components/chapter/ChapterPostsSectionClient";
import { StickyCenterRail } from "@/components/layout/StickyCenterRail";
import { ChapterRailNav } from "@/components/chapter/ChapterRailNav";
import ShellScrollModeSetter from "@/app/shell/ShellScrollMode";
import ShellSurfaceSetter from "@/app/shell/ShellSurface";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import { computeReadingStats } from "@/lib/readingTime";
import ReadStateTracker from "@/components/arcs/ReadStateTracker";
import { getSessionViewer } from "@/server/session";
import { getWalletEurodollars } from "@/server/services/shop";
import {
  getChapterPageView,
  getNextPublishedChapterIndex,
  getChapterPostsWithInteractionsByChapterId,
} from "@/server/repos/chapters";

export const dynamic = "force-dynamic";

type ChapterListItem = {
  id: string;
  index: number;
  title: string;
  publishedAt: string | null;
  _count?: { posts?: number };
  postsCount?: number;
  postCount?: number;
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
          ← Back to arc
        </Link>
        <h1 className="text-2xl font-semibold">Bad chapter index</h1>
      </div>
    );
  }

  const { userId: me } = await getSessionViewer();
  const data = await getChapterPageView({ slug, index: idx, viewerId: me });
  if (!data) {
    return (
      <div className="space-y-6">
        <a
          className="text-sm opacity-70 hover:underline"
          href={`/arcs/${slug}`}
        >
          ← Back to arc
        </a>
        <h1 className="text-2xl font-semibold">Chapter not found</h1>
      </div>
    );
  }

  const {
    arc,
    chapter,
    canEditIntro,
    canManageChapter,
    canDeleteChapter,
    canPost,
    canToggle,
  } = data;
  const isClosed = (chapter.status ?? "OPEN") === "CLOSED";
  const [
    chapterListData,
    initialPostFeed,
    nextChapterIndex,
  ] = await Promise.all([
    listChaptersForViewer({ slug, viewerId: me }),
    getChapterPostsWithInteractionsByChapterId({
      chapterId: chapter.id,
      limit: 50,
      viewerId: me,
    }),
    getNextPublishedChapterIndex({
      arcId: arc.id,
      currentIndex: chapter.index,
    }),
  ]);
  const chapters = chapterListData?.chapters ?? [];
  const chapterNavItems = (chapters as ChapterListItem[]).map((c) => ({
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

  const chapterPosts = initialPostFeed.items;

  const chapterPostNavItems = chapterPosts
    .map((post) => ({
      id: post.id,
      snippet: extractFirstSentence(post.contentMd),
    }))
    .filter((post) => post.snippet.length > 0);

  const readingSource = [
    stripHtml(chapter.markdown ?? ""),
    ...chapterPosts.map((post) => stripHtml(post.contentMd ?? "")),
  ]
    .filter(Boolean)
    .join(" ");
  const chapterReadingStats = computeReadingStats(readingSource);
  const lastVisiblePost = chapterPosts.at(-1) ?? null;
  const publicationLabel = chapter.isDraft ? "Draft" : "Published";
  const progressLabel = (chapter.status ?? "OPEN") === "CLOSED" ? "Completed" : "Ongoing";

  const REOPEN_COST = 10;

  let canAffordReopen = false;
  if (me && canToggle) {
    canAffordReopen = (await getWalletEurodollars(me)) >= REOPEN_COST;
  }


  // ── Server Action: PUBLISH ─────────────────────────────────────────────────
  async function publishThisChapter() {
    "use server";
    if (!me) {
      throw new Error("Unauthorized");
    }
    await publishChapterForUser({ userId: me, slug, index: chapter.index });

    // чтобы обновился и список глав, и сама страница
    revalidatePath(`/arcs/${slug}`);
    revalidatePath(`/arcs/${slug}/${chapter.index}`);
    redirect(`/arcs/${slug}/${chapter.index}`);
  }

  // ── Server Action: TOGGLE OPEN/CLOSE ───────────────────────────────────────
  async function toggleChapterStatus() {
    "use server";
    if (!me) {
      throw new Error("Unauthorized");
    }
    if ((chapter.status ?? "OPEN") === "OPEN") {
      await closeChapter({ userId: me, arcSlug: slug, chapterId: chapter.id });
    } else {
      await openChapter({ userId: me, arcSlug: slug, chapterId: chapter.id });
    }

    revalidatePath(`/arcs/${slug}/${chapter.index}`);
    redirect(`/arcs/${slug}/${chapter.index}`);
  }

  // ── Server Action: DELETE ──────────────────────────────────────────────────
  async function deleteThisChapter() {
    "use server";
    if (!me) {
      throw new Error("Unauthorized");
    }
    await deleteChapterForUser({ userId: me, slug, index: chapter.index });

    revalidatePath(`/arcs/${slug}`);
    redirect(`/arcs/${slug}`);
  }

  // ── Server Action: SAVE (PATCH) ────────────────────────────────────────────
  async function save(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const content = String(formData.get("content") ?? "");
    if (!me) {
      throw new Error("Unauthorized");
    }
    try {
      await updateChapterForUser({ userId: me, slug, index: chapter.index, title, content });
    } catch (error) {
      if (error instanceof HttpError) {
        throw new Error(`Failed to update chapter (${error.status}): ${error.message}`);
      }
      throw error;
    }
    revalidatePath(`/arcs/${slug}/${chapter.index}`);
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden text-[#2D2D2D]">
      {me ? (
        <ReadStateTracker
          arcId={arc.id}
          lastChapterId={chapter.id}
          lastPostId={lastVisiblePost?.id ?? null}
          lastReadPostCreatedAt={lastVisiblePost?.createdAt ?? null}
        />
      ) : null}
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
                {arc.title}
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
              canEdit={canEditIntro}
              defaultTitle={chapter.title}
              defaultContent={chapter.markdown ?? ""}
              onSave={save}
            />

            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">Posts</h2>
              <ChapterPostsSectionClient
                slug={slug}
                index={chapter.index}
                currentUserId={me}
                disabled={!canPost}
                nextChapterIndex={nextChapterIndex}
                initialItems={initialPostFeed.items}
                initialNextCursor={initialPostFeed.nextCursor}
              />

              <ChapterStatusSummary
                publicationLabel={publicationLabel}
                progressLabel={progressLabel}
                minutes={chapterReadingStats.minutes}
                words={chapterReadingStats.words}
              />

              <ChapterStatusActions
                canManageChapter={canManageChapter}
                canToggle={canToggle}
                isDraft={chapter.isDraft}
                isClosed={isClosed}
                canAffordReopen={canAffordReopen}
                reopenCost={REOPEN_COST}
                onPublish={publishThisChapter}
                onToggle={toggleChapterStatus}
              />
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

            {canDeleteChapter && (
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
