// src/components/editor/RichPostEditor.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { richPostExtensions } from "@/lib/richEditorConfig";
import { uploadEditorImage } from "@/lib/imageUploadClient";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Code2,
  Braces,
  Minus,
  Image as ImageIcon,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  tone?: "dark" | "light";
};

export function RichPostEditor({ value, onChange, disabled, tone = "dark" }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor(
    {
      extensions: richPostExtensions,
      content: value || "",
      editable: !disabled,
      autofocus: "end",
      immediatelyRender: false,
      onUpdate({ editor }) {
        const html = editor.getHTML();
        onChange(html);
      },
      editorProps: {
        attributes: {
          class:
            "post-body prose prose-invert max-w-none min-h-[120px] w-full focus:outline-none whitespace-pre-wrap",
        },
      },
    },
    [disabled]
  );

  // форсим перерисовку тулбара при смене выделения, чтобы isActive(...) был актуален
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      forceUpdate((x) => x + 1);
    };

    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);

    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor]);

  // синхронизация пропа -> editor (без onUpdate)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="w-full rounded-md border border-neutral-700 bg-transparent p-2 text-sm opacity-60">
        Loading editor…
      </div>
    );
  }

  const isActive = editor.isActive.bind(editor);

  // и для текста, и для картинок (align хранится в attrs.align у image)
  const isAlignActive = (align: "left" | "center" | "right") => {
    return (
      editor.isActive({ textAlign: align }) ||
      editor.isActive("image", { align })
    );
  };

  const toggleAlign = (align: "left" | "center" | "right") => {
    const chain = editor.chain().focus();

    if (editor.isActive("image")) {
      // если выделена картинка — обновляем её атрибут align
      chain.updateAttributes("image", { align }).run();
    } else {
      // иначе выравниваем текстовый блок
      chain.setTextAlign(align).run();
    }
  };

  // если хочешь file-upload вместо prompt:
  const handleInsertImageFromFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadEditorImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (error) {
      console.error("Image upload failed", error);
      window.alert("Image upload failed. Check R2 config and try again.");
    }

    e.target.value = "";
  };

  const toolbarTone =
    tone === "light"
      ? {
          shell: "border-[#2D2D2D]/14 bg-[rgba(198,201,198,0.42)] text-[#2D2D2D] backdrop-blur-[2px]",
          separator: "bg-[#2D2D2D]/10",
          idleButton: "text-[#585B58] hover:bg-[rgba(120,126,121,0.14)] hover:text-[#2D2D2D]",
          activeButton: "bg-[rgba(255,255,255,0.46)] text-[#2D2D2D] ring-1 ring-[#2D2D2D]/10",
          status: "text-[#2D2D2D]/50",
        }
      : {
          shell: "border-neutral-800 bg-neutral-950/80 text-neutral-100",
          separator: "bg-neutral-700",
          idleButton: "text-neutral-300 hover:bg-neutral-800 hover:text-white",
          activeButton: "bg-neutral-200 text-black",
          status: "text-neutral-300/60",
        };


  const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    title?: string;
    disabled?: boolean;
    children: React.ReactNode;
  }> = ({ onClick, active, title, disabled, children }) => (
    <button
      type="button"
      // ключевой момент — mousedown + preventDefault
      onMouseDown={(e) => {
        e.preventDefault(); // не переводить фокус на кнопку, не сбрасывать selection
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      title={title}
      className={
        "flex h-7 w-7 items-center justify-center rounded text-[13px] transition " +
        (disabled
          ? "opacity-40 cursor-not-allowed"
          : active
          ? toolbarTone.activeButton
          : toolbarTone.idleButton)
      }
    >
      {children}
    </button>
  );


  return (
    <div className="space-y-2">
      {/* скрытый input для загрузки файла (если захочешь) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Toolbar */}
      <div
        className={[
          "flex flex-wrap items-center gap-1 rounded-md border px-2 py-1 text-xs",
          toolbarTone.shell,
        ].join(" ")}
      >
        {/* inline styles */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={isActive("bold")}
          disabled={disabled}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={isActive("italic")}
          disabled={disabled}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={isActive("underline")}
          disabled={disabled}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={isActive("strike")}
          disabled={disabled}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className={["mx-1 h-4 w-px", toolbarTone.separator].join(" ")} />

        {/* headings / lists */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading")}
          disabled={disabled}
          title="Heading 2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={isActive("bulletList")}
          disabled={disabled}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={isActive("orderedList")}
          disabled={disabled}
          title="Ordered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className={["mx-1 h-4 w-px", toolbarTone.separator].join(" ")} />

        {/* text / image alignment */}
        <ToolbarButton
          onClick={() => toggleAlign("left")}
          active={isAlignActive("left")}
          disabled={disabled}
          title="Align left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => toggleAlign("center")}
          active={isAlignActive("center")}
          disabled={disabled}
          title="Align center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => toggleAlign("right")}
          active={isAlignActive("right")}
          disabled={disabled}
          title="Align right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>


        <span className={["mx-1 h-4 w-px", toolbarTone.separator].join(" ")} />

        {/* quote + code */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={isActive("blockquote")}
          disabled={disabled}
          title="Quote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* inline code */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={isActive("code")}
          disabled={disabled}
          title="Inline code"
        >
          <Code2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* code block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={isActive("codeBlock")}
          disabled={disabled}
          title="Code block"
        >
          <Braces className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* horizontal rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          title="Horizontal rule"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className={["mx-1 h-4 w-px", toolbarTone.separator].join(" ")} />

        {/* image */}

        {/* image */}
        <ToolbarButton
          // 🪝 сейчас используем загрузку файла, внутри которой уже есть крючок под R2
          onClick={handleInsertImageFromFile}
          // если захочешь обратно prompt по URL — вернёшь handleInsertImageClick
          disabled={disabled}
          title="Insert image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className={["ml-auto text-[11px]", toolbarTone.status].join(" ")}>
          {disabled ? "Posting disabled" : "Rich text enabled"}
        </span>
      </div>

      {/* Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
