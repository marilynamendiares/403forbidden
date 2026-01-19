// src/components/chapter/ChapterPostItem.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ThumbsUp, Star } from "lucide-react";
import Markdown from "@/components/Markdown";
import { RichPostEditor } from "@/components/editor/RichPostEditor";
import { RichPostViewer } from "@/components/editor/RichPostViewer";


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
  author: { id: string; username: string; avatarUrl: string | null };
  currentUserId?: string | null;
  slug?: string;
  index?: number | string;
  onAfterChange?: (
    kind: "updated" | "deleted",
    postId: string,
    next?: Partial<{ contentMd: string; editedAt?: string | null }>
  ) => void;
}) {
  const { post, author, currentUserId, slug, index, onAfterChange } = props;
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
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const canSave = !busy && text.trim().length > 0 && dirty;

  // ─────────────────────────────────────────────────────────────
  // 1) При входе в режим редактирования — пытаемся подхватить локальный драфт
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editing || !draftKey) return;

    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setDraftRestored(false);
        return;
      }

      const parsed = JSON.parse(raw) as { content?: string } | null;
      if (!parsed || typeof parsed.content !== "string") {
        setDraftRestored(false);
        return;
      }

      const draft = parsed.content;
      const draftEmpty = draft.trim().length === 0;
      const baselineEmpty = baseline.trim().length === 0;

      // есть ли смысл в драфте?
      let hasMeaningful = false;
      if (!baselineEmpty) {
        hasMeaningful = !draftEmpty; // если уже есть текст на сервере — нужен непустой черновик
      } else {
        hasMeaningful = !draftEmpty; // новый пост — любой непустой драфт имеет смысл
      }

      const differsFromBaseline = draft !== baseline;

      if (!hasMeaningful || !differsFromBaseline) {
        // драфт бессмысленный — очищаем
        localStorage.removeItem(draftKey);
        setDraftRestored(false);
        return;
      }

      // подхватываем драфт в редактор
      setText(draft);
      setDraftRestored(true);
      setSaveState("saved");
      setLastSavedAt(null);
    } catch {
      setDraftRestored(false);
    }
  }, [editing, draftKey, baseline]);

  // ─────────────────────────────────────────────────────────────
  // 2) Автосохранение локального драфта (только в режиме редактирования)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editing || !draftKey) return;

    if (!dirty) {
      // нет отличий от baseline — очищаем локальный драфт
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setSaveState("idle");
      setLastSavedAt(null);
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      try {
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
          localStorage.removeItem(draftKey);
          setSaveState("idle");
          setLastSavedAt(null);
          return;
        }

        localStorage.setItem(draftKey, JSON.stringify({ content }));
        setSaveState("saved");
        setLastSavedAt(Date.now());
      } catch {
        // ignore
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [editing, text, dirty, draftKey, baseline]);

  // ─────────────────────────────────────────────────────────────
  // 3) Статус локального драфта (подпись под кнопками)
  // ─────────────────────────────────────────────────────────────
  let statusLabel = "No local changes";
  if (saveState === "saving") {
    statusLabel = "Saving draft…";
  } else if (saveState === "saved" && lastSavedAt) {
    const sec = Math.round((Date.now() - lastSavedAt) / 1000);
    if (sec <= 2) statusLabel = "Draft saved just now";
    else statusLabel = `Draft saved ${sec}s ago`;
  } else if (dirty) {
    statusLabel = "Unsaved changes";
  }

  // сброс локального драфта
  function discardLocalDraft() {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setText(baseline);
    setDraftRestored(false);
    setSaveState("idle");
    setLastSavedAt(null);
  }

  // ─────────────────────────────────────────────────────────────
  // 4) Сохранение / удаление на сервер
  // ─────────────────────────────────────────────────────────────
  async function saveEdit() {
    if (!slug || !index) return;
    if (!canSave) return;

    setBusy(true);
    const res = await fetch(`/api/books/${slug}/${index}/posts/${post.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentMd: text }),
      cache: "no-store",
      credentials: "include",
    });
    setBusy(false);

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to save (${res.status}) ${msg}`);
      return;
    }

    const json = await res.json().catch(() => null);
    onAfterChange?.("updated", post.id, json?.post ?? { contentMd: text });

    // успешный save → baseline на сервере обновится; локальный драфт больше не нужен
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    }
    setDraftRestored(false);
    setSaveState("idle");
    setLastSavedAt(null);
    setEditing(false);
  }

  async function remove() {
    if (!slug || !index) return;
    if (!confirm("Delete this post?")) return;

    setBusy(true);
    const res = await fetch(`/api/books/${slug}/${index}/posts/${post.id}`, {
      method: "DELETE",
      cache: "no-store",
      credentials: "include",
    });
    setBusy(false);

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to delete (${res.status}) ${msg}`);
      return;
    }

    // на удаление тоже чистим локальный драфт
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    }

    onAfterChange?.("deleted", post.id);
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
      setLastSavedAt(null);
    }
  }, [baseline, editing]);

// src/components/chapter/ChapterPostItem.tsx
// ... всё сверху БЕЗ изменений ...

  // простой флаг HTML vs markdown нам больше не нужен
  // const isHtml = baseline.trim().startsWith("<");

// ... всё до return оставляем как есть ...

  return (
    <article className="py-3 border-b border-border/50">
      {/* ШАПКА: аватарка + мета в одну строку */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
          {author.avatarUrl ? (
            <Image alt="" src={author.avatarUrl} width={32} height={32} />
          ) : null}
        </div>

        <div className="text-sm text-muted-foreground">
          posted by <span className="font-medium">@{author.username}</span>
          {" • "}
          <time dateTime={dt.toISOString()} title={display}>
            {display}
          </time>
          {post.editedAt && <span className="ml-1 opacity-60">(edited)</span>}
        </div>
      </div>

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
            <RichPostEditor value={text} onChange={setText} disabled={busy} />

            {/* статус локального драфта */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
              <span>{statusLabel}</span>
              {draftRestored && (
                <>
                  <span className="text-amber-300">· Local draft restored</span>
                  <button
                    type="button"
                    onClick={discardLocalDraft}
                    className="rounded-full border border-amber-500/60 px-2 py-px text-[11px] text-amber-100 hover:bg-amber-500/10"
                  >
                    Discard draft
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 👍 / ⭐ actions (only in view mode) */}
        {!editing && (
          <div className="mt-4 pt-1 flex items-center gap-4 text-xs text-neutral-400">
 <button
  type="button"
  disabled={!canReact}
  title={
    !canReact
      ? isMine
        ? "You cannot react to your own post"
        : "Login to react"
      : likedByMe
      ? "Remove like"
      : "Like"
  }
  className={[
    "inline-flex items-center gap-1 transition",
    !canReact ? "opacity-40 cursor-not-allowed" : "hover:text-white",
    likedByMe ? "text-emerald-400" : "text-neutral-400",
  ].join(" ")}
  onClick={async () => {
    if (!canReact) return;

    const nextLiked = !likedByMe;

    // optimistic
    setLikedByMe(nextLiked);
    setLikesCount((c) => c + (nextLiked ? 1 : -1));

    const res = await fetch(`/api/books/${slug}/${index}/posts/${post.id}/like`, {
      method: nextLiked ? "POST" : "DELETE",
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) {
      // rollback
      setLikedByMe(!nextLiked);
      setLikesCount((c) => c + (nextLiked ? -1 : 1));
      const msg = await res.text().catch(() => "");
      alert(`Like failed (${res.status}) ${msg}`);
      return;
    }

    const json = await res.json().catch(() => null);
    if (json && typeof json.likesCount === "number") setLikesCount(json.likesCount);
    if (json && typeof json.liked === "boolean") setLikedByMe(json.liked);
  }}
>
  <ThumbsUp className="h-4 w-4" />
  <span className="tabular-nums">{likesCount}</span>
</button>

<button
  type="button"
  disabled={!canReact || repGivenByMe}
  title={
    !canReact
      ? isMine
        ? "You cannot react to your own post"
        : "Login to react"
      : repGivenByMe
      ? "Reputation already given"
      : "Give reputation (+1)"
  }
  className={[
    "inline-flex items-center gap-1 transition",
    !canReact || repGivenByMe ? "opacity-40 cursor-not-allowed" : "hover:text-white",
    repGivenByMe ? "text-yellow-300" : "text-neutral-400",
  ].join(" ")}
  onClick={async () => {
    if (!canReact || repGivenByMe) return;

    // optimistic (one-way)
    setRepGivenByMe(true);
    setRepCount((c) => c + 1);

    const res = await fetch(
      `/api/books/${slug}/${index}/posts/${post.id}/reputation`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: 1 }),
        cache: "no-store",
        credentials: "include",
      }
    );

    if (!res.ok) {
      // rollback
      setRepGivenByMe(false);
      setRepCount((c) => c - 1);
      const msg = await res.text().catch(() => "");
      alert(`Reputation failed (${res.status}) ${msg}`);
      return;
    }

    const json = await res.json().catch(() => null);
    if (json && typeof json.repCount === "number") setRepCount(json.repCount);
  }}
>
  <Star className="h-4 w-4" />
  <span className="tabular-nums">{repCount}</span>
</button>
          </div>
        )}

        {isMine && (
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            {!editing ? (
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
              <>
                <button
                  onClick={saveEdit}
                  disabled={!canSave}
                  className="hover:text-foreground disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={busy}
                  className="hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
