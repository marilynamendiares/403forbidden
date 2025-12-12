// src/components/editor/RichPostViewer.tsx
"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { richPostExtensions } from "@/lib/richEditorConfig";

type ViewerProps = {
  value: string;
};

export function RichPostViewer({ value }: ViewerProps) {
  const editor = useEditor(
    {
      extensions: richPostExtensions,
      content: value || "",
      editable: false,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          // ВНИМАНИЕ: без post-body/prose — эти классы даём снаружи
          class: "w-full whitespace-pre-wrap focus:outline-none",
        },
      },
    },
    []
  );

  // синхронизация пропа -> editor
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="opacity-60 text-sm">
        Loading…
      </div>
    );
  }

  return <EditorContent editor={editor} />;
}
