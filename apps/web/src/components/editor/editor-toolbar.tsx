import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
};

type Props = { editor: Editor; disabled: boolean };

export function EditorToolbar({ editor, disabled }: Props) {
  // Re-renders only when one of these values changes (not on every transaction).
  const s = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        h1: e.isActive("heading", { level: 1 }),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        quote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  const chain = () => editor.chain().focus();

  const groups: Item[][] = [
    [
      { label: "Undo", icon: Undo2, disabled: !s.canUndo, run: () => chain().undo().run() },
      { label: "Redo", icon: Redo2, disabled: !s.canRedo, run: () => chain().redo().run() },
    ],
    [
      { label: "Bold", icon: Bold, active: s.bold, run: () => chain().toggleBold().run() },
      { label: "Italic", icon: Italic, active: s.italic, run: () => chain().toggleItalic().run() },
      { label: "Strikethrough", icon: Strikethrough, active: s.strike, run: () => chain().toggleStrike().run() },
      { label: "Inline code", icon: Code, active: s.code, run: () => chain().toggleCode().run() },
    ],
    [
      { label: "Heading 1", icon: Heading1, active: s.h1, run: () => chain().toggleHeading({ level: 1 }).run() },
      { label: "Heading 2", icon: Heading2, active: s.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
      { label: "Heading 3", icon: Heading3, active: s.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    ],
    [
      { label: "Bullet list", icon: List, active: s.bullet, run: () => chain().toggleBulletList().run() },
      { label: "Numbered list", icon: ListOrdered, active: s.ordered, run: () => chain().toggleOrderedList().run() },
      { label: "Quote", icon: Quote, active: s.quote, run: () => chain().toggleBlockquote().run() },
      { label: "Code block", icon: SquareCode, active: s.codeBlock, run: () => chain().toggleCodeBlock().run() },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex shrink-0 flex-wrap items-center gap-1.5 bg-background px-4 py-2 border-b shadow-sm z-10"
    >
      {groups.map((group, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <div className="mx-1 h-5 w-px bg-border" />}
          {group.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-8 text-muted-foreground transition-colors",
                item.active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                !item.active && "hover:bg-muted hover:text-foreground"
              )}
              title={item.label}
              aria-label={item.label}
              aria-pressed={item.active}
              disabled={disabled || item.disabled}
              // Keep the editor's selection when clicking toolbar buttons.
              onMouseDown={(e) => e.preventDefault()}
              onClick={item.run}
            >
              <item.icon className="size-4" />
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
