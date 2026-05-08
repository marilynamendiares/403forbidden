// src/components/chapter/ChapterPostItem.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { RichPostEditor } from "@/components/editor/RichPostEditor";
import { clearDraft, readDraft, writeDraft } from "@/lib/draftStorage";
import { getWriterSaveErrorMessage, getWriterStatusLabel } from "@/lib/writerStatus";
import {
  deleteChapterPost,
  grantChapterPostReputation,
  toggleChapterPostLike,
  updateChapterPost,
} from "@/lib/chapterPostInteractionsClient";
import {
  ChapterPostEditActions,
  ChapterPostHeader,
  ChapterPostReactions,
} from "@/components/chapter/ChapterPostUi";


export function ChapterPostItem(props: {
  post: {
    id: string;
    contentMd: string;
    createdAt: string;
    editedAt?: string | null;

    // meta (from API)
    likesCount?: number;
    likedByMe?: boolean;
    repCount?: number;
    repGivenByMe?: boolean;
  };
  author: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  character?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  currentUserId?: string | null;
  slug?: string;
  index?: number | string;
  onAfterChange?: (
    kind: "updated" | "deleted",
    postId: string,
    next?: Partial<{ contentMd: string; editedAt?: string | null }>
  ) => void;
}) {
  const { post, author, character, currentUserId, slug, index, onAfterChange } = props;
  const dt = new Date(post.createdAt);
  const display = dt.toLocaleString();
  const isMine = !!currentUserId && currentUserId === author.id;

  const [likesCount, setLikesCount] = useState<number>(post.likesCount ?? 0);
  const [likedByMe, setLikedByMe] = useState<boolean>(post.likedByMe ?? false);

  const [repCount, setRepCount] = useState<number>(post.repCount ?? 0);
  const [repGivenByMe, setRepGivenByMe] = useState<boolean>(post.repGivenByMe ?? false);

  // если с сервера пришли новые мета-поля (SSE/рефетч) — синхронизируем
  useEffect(() => {
    setLikesCount(post.likesCount ?? 0);
    setLikedByMe(post.likedByMe ?? false);
    setRepCount(post.repCount ?? 0);
    setRepGivenByMe(post.repGivenByMe ?? false);
  }, [post.likesCount, post.likedByMe, post.repCount, post.repGivenByMe]);

  const canReact = !!currentUserId && !isMine && !!slug && !!index;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.contentMd);
  const [busy, setBusy] = useState(false);

  // baseline = то, что пришло с сервера (последняя сохранённая версия поста)
  const baseline = useMemo(() => post.contentMd, [post.contentMd]);

  // локальный драфт в localStorage — отдельный ключ под каждый пост
  const draftKey = useMemo(
    () => (post.id ? `chapter_post_draft:${post.id}` : ""),
    [post.id]
  );

  const dirty = text !== baseline;

  // статус локального драфта
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [draftRestored, setDraftRestored] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = !busy && text.trim().length > 0 && dirty;

  // ─────────────────────────────────────────────────────────────
  // 1) При входе в режим редактирования — пытаемся подхватить локальный драфт
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editing || !draftKey) return;

    const parsed = readDraft<{ content?: string }>(draftKey);
    if (!parsed || typeof parsed.content !== "string") {
      setDraftRestored(false);
      return;
    }

    const draft = parsed.content;
    const draftEmpty = draft.trim().length === 0;
    const baselineEmpty = baseline.trim().length === 0;

    let hasMeaningful = false;
    if (!baselineEmpty) {
      hasMeaningful = !draftEmpty;
    } else {
      hasMeaningful = !draftEmpty;
    }

    const differsFromBaseline = draft !== baseline;

    if (!hasMeaningful || !differsFromBaseline) {
      clearDraft(draftKey);
      setDraftRestored(false);
      return;
    }

    setText(draft);
    setDraftRestored(true);
    setSaveState("saved");
    setSaveError(null);
  }, [editing, draftKey, baseline]);

  // ─────────────────────────────────────────────────────────────
  // 2) Автосохранение локального драфта (только в режиме редактирования)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editing || !draftKey) return;

    if (!dirty) {
      clearDraft(draftKey);
      setSaveState("idle");
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      const content = text;
      const draftEmpty = content.trim().length === 0;
      const baselineEmpty = baseline.trim().length === 0;

      let hasMeaningful = false;
      if (!baselineEmpty) {
        hasMeaningful = !draftEmpty;
      } else {
        hasMeaningful = !draftEmpty;
      }

      const differsFromBaseline = content !== baseline;

      if (!hasMeaningful || !differsFromBaseline) {
        clearDraft(draftKey);
        setSaveState("idle");
        return;
      }

      if (writeDraft(draftKey, { content })) {
        setSaveState("saved");
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [editing, text, dirty, draftKey, baseline]);

  const hasDraftState = draftRestored || dirty || saveState === "saving" || saveState === "saved";
  const statusLabel = getWriterStatusLabel({
    draftRestored,
    hasDraftState,
    saveState,
    dirty,
  });

  // сброс локального драфта
  function discardLocalDraft() {
    if (!draftKey) return;
    clearDraft(draftKey);
    setText(baseline);
    setDraftRestored(false);
    setSaveState("idle");
    setSaveError(null);
  }

  // ─────────────────────────────────────────────────────────────
  // 4) Сохранение / удаление на сервер
  // ─────────────────────────────────────────────────────────────
  async function saveEdit() {
    if (!slug || !index) return;
    if (!canSave) return;

    setBusy(true);
    try {
      const json = await updateChapterPost({
        slug,
        index,
        postId: post.id,
        contentMd: text,
      });
      onAfterChange?.("updated", post.id, json?.post ?? { contentMd: text });

      clearDraft(draftKey);
      setDraftRestored(false);
      setSaveState("idle");
      setSaveError(null);
      setEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setSaveError(getWriterSaveErrorMessage(message, "chapter post"));
      return;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!slug || !index) return;
    if (!confirm("Delete this post?")) return;

    setBusy(true);
    try {
      await deleteChapterPost({
        slug,
        index,
        postId: post.id,
      });
      clearDraft(draftKey);
      onAfterChange?.("deleted", post.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      window.alert(message);
      return;
    } finally {
      setBusy(false);
    }
  }

  // отмена редактирования: закрываем редактор, but НЕ трогаем локальный драфт,
  // чтобы при следующем заходе можно было восстановиться
  function cancelEdit() {
    setEditing(false);
    setText(baseline);
  }

  // если с сервера пришло новое содержимое и мы НЕ в режиме редактирования —
  // подхватываем его в локальный state
  useEffect(() => {
    if (!editing) {
      setText(baseline);
      setDraftRestored(false);
      setSaveState("idle");
      setSaveError(null);
    }
  }, [baseline, editing]);

// src/components/chapter/ChapterPostItem.tsx
// ... всё сверху БЕЗ изменений ...

  // простой флаг HTML vs markdown нам больше не нужен
  // const isHtml = baseline.trim().startsWith("<");

// ... всё до return оставляем как есть ...

  return (
    <article className="py-3 border-b border-border/50">
      <ChapterPostHeader
        author={author}
        character={character ?? null}
        createdAt={post.createdAt}
        display={display}
        edited={Boolean(post.editedAt)}
      />

      {/* ТЕЛО ПОСТА + РЕДАКТОР: на всю ширину контейнера */}
      <div className="mt-2 min-w-0">
        {!editing ? (
          // ★ VIEW MODE: ВСЕГДА считаем, что в contentMd уже HTML из TipTap
          <div className="post-body prose prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: baseline,
              }}
            />
          </div>
        ) : (
          // EDIT MODE: RichPostEditor, как был
          <div className="post-body prose prose-invert max-w-none">
            <RichPostEditor
              value={text}
              onChange={setText}
              disabled={busy}
              tone="light"
            />
          </div>
        )}

        {!editing ? (
          <div className="mt-4 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
              {isMine ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="hover:text-red-500 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <span />
              )}
            </div>

            <ChapterPostReactions
              canReact={canReact}
              isMine={isMine}
              likedByMe={likedByMe}
              likesCount={likesCount}
              repGivenByMe={repGivenByMe}
              repCount={repCount}
              onToggleLike={async () => {
                if (!canReact) return;

                const nextLiked = !likedByMe;

                setLikedByMe(nextLiked);
                setLikesCount((c) => c + (nextLiked ? 1 : -1));

                try {
                  const json = await toggleChapterPostLike({
                    slug,
                    index,
                    postId: post.id,
                    nextLiked,
                  });
                  if (json && typeof json.likesCount === "number") setLikesCount(json.likesCount);
                  if (json && typeof json.liked === "boolean") setLikedByMe(json.liked);
                } catch (error) {
                  setLikedByMe(!nextLiked);
                  setLikesCount((c) => c + (nextLiked ? -1 : 1));
                  const message = error instanceof Error ? error.message : "Like failed";
                  window.alert(message);
                }
              }}
              onGiveReputation={async () => {
                if (!canReact || repGivenByMe) return;

                setRepGivenByMe(true);
                setRepCount((c) => c + 1);

                try {
                  const json = await grantChapterPostReputation({
                    slug,
                    index,
                    postId: post.id,
                    amount: 1,
                  });
                  if (json && typeof json.repCount === "number") setRepCount(json.repCount);
                } catch (error) {
                  setRepGivenByMe(false);
                  setRepCount((c) => c - 1);
                  const message = error instanceof Error ? error.message : "Reputation failed";
                  window.alert(message);
                }
              }}
            />
          </div>
        ) : isMine ? (
          <ChapterPostEditActions
            canSave={canSave}
            busy={busy}
            statusLabel={statusLabel}
            saveError={saveError}
            hasDraftState={hasDraftState}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onResetDraft={discardLocalDraft}
          />
        ) : null}
      </div>
    </article>
  );
}
