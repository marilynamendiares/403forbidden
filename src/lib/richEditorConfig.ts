// src/lib/richEditorConfig.ts
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";

export type MentionItem = {
  id: string;
  username: string;
  label: string;
};

// Пока демо-юзеры; потом сюда приедет API
const DEMO_USERS: MentionItem[] = [
  { id: "1", username: "marilyn", label: "Marilyn Amendiares" },
  { id: "2", username: "admin", label: "Admin" },
];

// Базовый путь к профилю
const MENTION_PROFILE_BASE = "/u";

// ─────────────────────────────────────────────────────────────
// Mention
// ─────────────────────────────────────────────────────────────

const mentionExtension = Mention.extend({
  // Говорим Tiptap, как распознавать mention из HTML
  // Поддерживаем и старый span, и новый a
  parseHTML() {
    return [
      { tag: `span[data-type="${this.name}"]` },
      { tag: `a[data-type="${this.name}"]` },
    ];
  },

  // Как рендерим mention в HTML
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs || {};

    const username =
      (attrs.label as string | undefined) ??
      (attrs.username as string | undefined) ??
      (attrs.id as string | undefined) ??
      "user";

    const id = (attrs.id as string | undefined) ?? username;

    return [
      "a",
      {
        // важно: по этим атрибутам parseHTML потом узнает mention
        "data-type": "mention",
        "data-id": id,
        "data-label": username,

        href: `${MENTION_PROFILE_BASE}/${encodeURIComponent(username)}`,
        target: "_blank",
        rel: "noreferrer",

        // классы / стили
        ...HTMLAttributes,
        // гарантируем, что mention-node точно есть
        class: `${HTMLAttributes.class ?? ""} mention-node`.trim(),
      },
      `@${username}`,
    ];
  },
}).configure({
  HTMLAttributes: {
    class: "mention-node",
  },

  suggestion: {
    char: "@",

    items: ({ query }: { query: string }) => {
      const q = (query ?? "").toLowerCase().trim();
      if (!q) return DEMO_USERS.slice(0, 5);
      return DEMO_USERS.filter((u) =>
        u.username.toLowerCase().includes(q)
      ).slice(0, 5);
    },

    render() {
      let dom: HTMLDivElement | null = null;
      let items: MentionItem[] = [];
      let selectedIndex = 0;

      // внутренняя команда mention’а
      let command:
        | ((props: { id: string; label: string }) => void)
        | null = null;

      const renderList = () => {
        if (!dom) return;
        dom.innerHTML = items
          .map(
            (item, index) => `
            <div class="mention-item ${
              index === selectedIndex ? "is-selected" : ""
            }" data-index="${index}">
              @${item.username}
            </div>
          `
          )
          .join("");
      };

      const updatePosition = (props: any) => {
        if (!dom) return;
        const rect = props.clientRect?.();
        if (!rect) return;

        const { left, bottom } = rect;
        const scrollX = window.scrollX ?? window.pageXOffset ?? 0;
        const scrollY = window.scrollY ?? window.pageYOffset ?? 0;

        dom.style.left = `${left + scrollX}px`;
        dom.style.top = `${bottom + scrollY + 4}px`;
      };

      return {
        onStart(props: any) {
          items = props.items ?? [];
          selectedIndex = props.selectedIndex ?? 0;
          command = props.command;

          dom = document.createElement("div");
          dom.className = "mention-suggest";
          dom.style.position = "absolute";
          dom.style.zIndex = "9999";
          document.body.appendChild(dom);

          dom.addEventListener("mousedown", (event) => {
            event.preventDefault();
            const target = event.target as HTMLElement | null;
            const el = target?.closest("[data-index]") as HTMLElement | null;
            if (!el || !command) return;

            const idx = Number(el.dataset.index ?? "-1");
            const item = items[idx];
            if (!item) return;

            command({ id: item.id, label: item.username });
          });

          updatePosition(props);
          renderList();
        },

        onUpdate(props: any) {
          items = props.items ?? [];
          selectedIndex = props.selectedIndex ?? 0;
          command = props.command;
          updatePosition(props);
          renderList();
        },

        onKeyDown(props: any) {
          if (!items.length) return false;
          const event: KeyboardEvent = props.event;

          if (event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % items.length;
            renderList();
            return true;
          }

          if (event.key === "ArrowUp") {
            selectedIndex =
              (selectedIndex - 1 + items.length) % items.length;
            renderList();
            return true;
          }

          if (event.key === "Enter") {
            const item = items[selectedIndex];
            if (!item || !command) return false;

            command({ id: item.id, label: item.username });
            return true;
          }

          return false;
        },

        onExit() {
          if (dom && dom.parentNode) {
            dom.parentNode.removeChild(dom);
          }
          dom = null;
          items = [];
          selectedIndex = 0;
          command = null;
        },
      };
    },
  } as any,
});

// ─────────────────────────────────────────────────────────────
// Общий набор экстеншенов для постов
// ─────────────────────────────────────────────────────────────

// блоковая картинка с поддержкой align (left / center / right)
const ImageBlock = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      align: {
        default: "left",
        parseHTML: (element) =>
          (element.getAttribute("data-align") as "left" | "center" | "right" | null) ??
          "left",
        renderHTML: (attrs) => {
          const align =
            (attrs.align as "left" | "center" | "right" | undefined) ?? "left";
          return {
            "data-align": align,
          };
        },
      },
    };
  },
});

export const richPostExtensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3],
    },
    codeBlock: {
      HTMLAttributes: {
        class:
          "my-3 overflow-x-auto rounded-lg bg-neutral-950/80 p-3 text-[0.8rem] font-mono",
      },
    },
    blockquote: {
      HTMLAttributes: {
        class: "border-l-2 border-neutral-700 pl-3 my-2 italic",
      },
    },
  }),
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    defaultAlignment: "left",
  }),
  ImageBlock.configure({
    inline: false, // делаем картинку блочной, чтобы текст был сверху/снизу
    allowBase64: true,
    HTMLAttributes: {
      class: "inline-image",
    },
  }),
  Placeholder.configure({
    placeholder: "Write your post…",
  }),
  mentionExtension,
];
