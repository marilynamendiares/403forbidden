// src/components/chapter/ChapterPostItem.tsx
"use client";

import { useState, KeyboardEvent } from "react";
import Image from "next/image";
import Markdown from "@/components/Markdown";

export function ChapterPostItem(props: {
  post: {
    id: string;
    contentMd: string;
    createdAt: string;
    editedAt?: string | null;
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

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.contentMd);
  const [busy, setBusy] = useState(false);

  const canSave = !busy && text.trim().length > 0 && text !== post.contentMd;

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

    onAfterChange?.("deleted", post.id);
  }

  function onTextKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === "Enter";
    if (isCmdEnter) {
      e.preventDefault();
      void saveEdit();
    }
  }

  return (
    <article className="flex gap-3 py-3 border-b border-border/50">
      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
        {author.avatarUrl ? (
          <Image alt="" src={author.avatarUrl} width={32} height={32} />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm text-muted-foreground mb-1">
          posted by <span className="font-medium">@{author.username}</span>
          {" • "}
          <time dateTime={dt.toISOString()} title={display}>
            {display}
          </time>
          {post.editedAt && <span className="ml-1 opacity-60">(edited)</span>}
        </div>

        {!editing ? (
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">
            <Markdown>{post.contentMd}</Markdown>
          </div>
        ) : (
          <textarea
            className="w-full rounded-md border border-neutral-700 bg-transparent p-2 text-sm"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onTextKey}
            disabled={busy}
            placeholder="Edit your post…"
          />
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
                  title="Cmd/Ctrl+Enter"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setText(post.contentMd);
                  }}
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
