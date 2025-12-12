// src/components/RichChapterEditorClient.tsx
"use client";

import { useState, useTransition } from "react";

type Props = {
  chapterId: string;
  canEdit: boolean;
  defaultTitle: string;
  defaultContent: string;
  onSave: (formData: FormData) => Promise<void> | void;
};

// Пока это просто заглушка под будущий Tiptap-редактор.
// API совпадает с ChapterEditorClient, чтобы можно было легко подменять.
export default function RichChapterEditorClient({
  chapterId,
  canEdit,
  defaultTitle,
  defaultContent,
  onSave,
}: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [pending, startTransition] = useTransition();

  const disabled = !canEdit;

  const handleSubmit = (fd?: FormData) => {
    if (disabled) return;
    const formData = fd ?? new FormData();
    formData.set("title", title);
    formData.set("content", content);

    startTransition(async () => {
      await onSave(formData);
    });
  };

  return (
    <form
      className="space-y-3 border border-neutral-800 rounded-xl p-4"
      action={handleSubmit}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium uppercase tracking-wide">
          Rich editor (stub)
        </h2>
        <span className="text-xs opacity-60">
          {pending ? "Saving…" : "Cmd/Ctrl+S"}
        </span>
      </div>

      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2"
        required
        disabled={disabled}
        placeholder="Title"
      />

      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded bg-transparent border border-neutral-700 px-3 py-2 min-h-60"
        required
        disabled={disabled}
        placeholder="Rich editor stub: content goes here…"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={disabled || pending}
          className="rounded bg-white text-black px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <p className="opacity-60 text-xs">
        This is a placeholder for the future Tiptap-based editor.
      </p>
    </form>
  );
}
