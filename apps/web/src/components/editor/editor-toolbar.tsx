import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { editor: Editor; disabled: boolean };

const SYSTEM_FONTS = [
  "Arial, sans-serif",
  "Georgia, serif",
  "Tahoma, sans-serif",
  "Verdana, sans-serif",
  "ui-monospace, monospace",
];

function safeHref(value: string) {
  try {
    const url = new URL(value, "https://synodos.invalid");
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function EditorToolbar({ editor, disabled }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [compact, setCompact] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const firstControl = toolbarRef.current?.querySelector<HTMLElement>(
      "button:not(:disabled), select:not(:disabled), input:not(:disabled)",
    );
    firstControl?.setAttribute("tabindex", "0");
  }, [compact, moreOpen]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setCompact((entry?.contentRect.width ?? 1200) < 920);
      setMoreOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      sub: current.isActive("subscript"),
      sup: current.isActive("superscript"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      h4: current.isActive("heading", { level: 4 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      task: current.isActive("taskList"),
      quote: current.isActive("blockquote"),
      codeBlock: current.isActive("codeBlock"),
      table: current.isActive("table"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      alignment: current.getAttributes("paragraph").textAlign ?? "left",
      fontSize: current.getAttributes("textStyle").fontSize ?? "",
      lineHeight: current.getAttributes("textStyle").lineHeight ?? "",
    }),
    equalityFn: (a, b) =>
      a === b ||
      (!!a &&
      !!b &&
      a.bold === b.bold &&
      a.italic === b.italic &&
      a.underline === b.underline &&
      a.strike === b.strike &&
      a.code === b.code &&
      a.sub === b.sub &&
      a.sup === b.sup &&
      a.h1 === b.h1 &&
      a.h2 === b.h2 &&
      a.h3 === b.h3 &&
      a.h4 === b.h4 &&
      a.bullet === b.bullet &&
      a.ordered === b.ordered &&
      a.task === b.task &&
      a.quote === b.quote &&
      a.codeBlock === b.codeBlock &&
      a.table === b.table &&
      a.link === b.link &&
      a.canUndo === b.canUndo &&
      a.canRedo === b.canRedo &&
      a.alignment === b.alignment &&
      a.fontSize === b.fontSize &&
      a.lineHeight === b.lineHeight),
  });

  function run(command: () => void) {
    command();
    editor.commands.focus();
  }

  function onToolbarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      toolbarRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), select:not(:disabled), input:not(:disabled)',
      ) ?? [],
    );
    const currentIndex = buttons.indexOf(document.activeElement as HTMLElement);
    if (currentIndex < 0 || buttons.length === 0) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[nextIndex]?.focus();
  }

  function onToolbarFocus(event: FocusEvent<HTMLDivElement>) {
    toolbarRef.current
      ?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), select:not(:disabled), input:not(:disabled)',
      )
      .forEach((control) => control.setAttribute("tabindex", "-1"));
    (event.target as HTMLElement).setAttribute("tabindex", "0");
  }

  function action(
    label: string,
    shortcut: string,
    icon: typeof Bold,
    active: boolean,
    command: () => void,
  ) {
    const Icon = icon;
    return (
      <Button
        key={label}
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={label === "Undo" ? 0 : -1}
        className={cn(
          "size-8 shrink-0 text-muted-foreground",
          active && "bg-primary/10 text-primary",
        )}
        title={shortcut ? `${label} (${shortcut})` : label}
        aria-label={shortcut ? `${label} (${shortcut})` : label}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run(command)}
      >
        <Icon className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  const items = (
    <>
        {action("Undo", "Ctrl+Z", Undo2, false, () => editor.chain().focus().undo().run())}
        {action("Redo", "Ctrl+Shift+Z", Redo2, false, () => editor.chain().focus().redo().run())}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <select
          aria-label="Text style"
          title="Text style"
          tabIndex={-1}
          disabled={disabled}
          value={state.h1 ? "1" : state.h2 ? "2" : state.h3 ? "3" : state.h4 ? "4" : "p"}
          onChange={(event) => {
            const value = event.currentTarget.value;
            run(() =>
              value === "p"
                ? editor.chain().focus().setParagraph().run()
                : editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 | 4 }).run(),
            );
          }}
          className="h-8 max-w-32 rounded-md border bg-background px-2 text-sm"
        >
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>
        <select
          aria-label="Font family"
          title="Font family"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) =>
            run(() =>
              event.currentTarget.value
                ? editor.chain().focus().setMark("textStyle", { fontFamily: event.currentTarget.value }).run()
                : editor.chain().focus().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
            )
          }
          className="h-8 max-w-32 rounded-md border bg-background px-2 text-sm"
          defaultValue=""
        >
          <option value="">Font</option>
          {SYSTEM_FONTS.map((font) => (
            <option key={font} value={font}>{font.split(",")[0]}</option>
          ))}
        </select>
        <select
          aria-label="Font size"
          title="Font size"
          tabIndex={-1}
          disabled={disabled}
          value={state.fontSize}
          onChange={(event) =>
            run(() =>
              event.currentTarget.value
                ? editor.chain().focus().setMark("textStyle", { fontSize: event.currentTarget.value }).run()
                : editor.chain().focus().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
            )
          }
          className="h-8 w-20 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Size</option>
          {[8, 9, 10, 11, 12, 14, 16, 18, 24, 32, 48, 72].map((size) => (
            <option key={size} value={`${size}pt`}>{size} pt</option>
          ))}
        </select>
        <select
          aria-label="Line height"
          title="Line height"
          tabIndex={-1}
          disabled={disabled}
          value={state.lineHeight}
          onChange={(event) =>
            run(() =>
              event.currentTarget.value
                ? editor.chain().focus().setMark("textStyle", { lineHeight: event.currentTarget.value }).run()
                : editor.chain().focus().setMark("textStyle", { lineHeight: null }).removeEmptyTextStyle().run(),
            )
          }
          className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Line height</option>
          {["1", "1.15", "1.5", "1.75", "2"].map((height) => (
            <option key={height} value={height}>{height}×</option>
          ))}
        </select>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        {action("Bold", "Ctrl+B", Bold, state.bold, () => editor.chain().focus().toggleBold().run())}
        {action("Italic", "Ctrl+I", Italic, state.italic, () => editor.chain().focus().toggleItalic().run())}
        {action("Underline", "Ctrl+U", Underline, state.underline, () => editor.chain().focus().toggleUnderline().run())}
        {action("Strikethrough", "Ctrl+Shift+X", Strikethrough, state.strike, () => editor.chain().focus().toggleStrike().run())}
        {action("Inline code", "Ctrl+E", Code, state.code, () => editor.chain().focus().toggleCode().run())}
        {action("Subscript", "", Subscript, state.sub, () => editor.chain().focus().toggleSubscript().run())}
        {action("Superscript", "", Superscript, state.sup, () => editor.chain().focus().toggleSuperscript().run())}
        <label className="flex h-8 shrink-0 items-center gap-1 rounded-md px-1 text-xs" title="Text color">
          <span className="sr-only">Text color</span>
          <input
            type="color"
            aria-label="Text color"
            tabIndex={-1}
            disabled={disabled}
            onChange={(event) =>
              run(() => editor.chain().focus().setColor(event.currentTarget.value).run())
            }
            className="size-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().unsetColor().run())}
        >
          Reset color
        </Button>
        <label className="flex h-8 shrink-0 items-center gap-1 rounded-md px-1 text-xs" title="Highlight color">
          <span className="sr-only">Highlight color</span>
          <input
            type="color"
            aria-label="Highlight color"
            tabIndex={-1}
            disabled={disabled}
            onChange={(event) =>
              run(() =>
                editor.chain().focus().toggleHighlight({ color: event.currentTarget.value }).run(),
              )
            }
            className="size-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().unsetHighlight().run())}
        >
          Reset highlight
        </Button>
        {action("Align left", "", AlignLeft, state.alignment === "left", () => editor.chain().focus().setTextAlign("left").run())}
        {action("Align center", "", AlignCenter, state.alignment === "center", () => editor.chain().focus().setTextAlign("center").run())}
        {action("Align right", "", AlignRight, state.alignment === "right", () => editor.chain().focus().setTextAlign("right").run())}
        {action("Justify", "", AlignJustify, state.alignment === "justify", () => editor.chain().focus().setTextAlign("justify").run())}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        {action("Bullet list", "", List, state.bullet, () => editor.chain().focus().toggleBulletList().run())}
        {action("Numbered list", "", ListOrdered, state.ordered, () => editor.chain().focus().toggleOrderedList().run())}
        {action("Task list", "", CheckSquare, state.task, () => editor.chain().focus().toggleTaskList().run())}
        {action("Indent list", "Tab", List, false, () => editor.chain().focus().sinkListItem(state.task ? "taskItem" : "listItem").run())}
        {action("Outdent list", "Shift+Tab", ListOrdered, false, () => editor.chain().focus().liftListItem(state.task ? "taskItem" : "listItem").run())}
        {action("Quote", "", Quote, state.quote, () => editor.chain().focus().toggleBlockquote().run())}
        {action("Code block", "", SquareCode, state.codeBlock, () => editor.chain().focus().toggleCodeBlock().run())}
        {action("Horizontal rule", "", Minus, false, () => editor.chain().focus().setHorizontalRule().run())}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Insert table"
          aria-label="Insert table"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
        >
          <span aria-hidden="true" className="text-sm font-semibold">▦</span>
        </Button>
        {state.table && (
          <>
            {action("Add row", "", List, false, () => editor.chain().focus().addRowAfter().run())}
            {action("Add row before", "", List, false, () => editor.chain().focus().addRowBefore().run())}
            {action("Add column", "", ListOrdered, false, () => editor.chain().focus().addColumnAfter().run())}
            {action("Delete column", "", X, false, () => editor.chain().focus().deleteColumn().run())}
            {action("Delete row", "", X, false, () => editor.chain().focus().deleteRow().run())}
            {action("Merge cells", "", LinkIcon, false, () => editor.chain().focus().mergeCells().run())}
            {action("Split cell", "", LinkIcon, false, () => editor.chain().focus().splitCell().run())}
            {action("Toggle header row", "", CheckSquare, false, () => editor.chain().focus().toggleHeaderRow().run())}
            <label className="flex h-8 shrink-0 items-center gap-1 rounded-md px-1 text-xs" title="Table cell background">
              <span className="sr-only">Table cell background</span>
              <input
                type="color"
                aria-label="Table cell background"
                tabIndex={-1}
                disabled={disabled}
                onChange={(event) =>
                  run(() =>
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("backgroundColor", event.currentTarget.value)
                      .run(),
                  )
                }
                className="size-6 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              tabIndex={-1}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                run(() =>
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute("backgroundColor", null)
                    .run(),
                )
              }
            >
              Reset cell
            </Button>
            {action("Delete table", "", X, false, () => editor.chain().focus().deleteTable().run())}
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Link"
          aria-label="Link"
          tabIndex={-1}
          aria-pressed={state.link}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setLinkValue(String(editor.getAttributes("link").href ?? ""));
            setLinkOpen((open) => !open);
          }}
        >
          <LinkIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Clear formatting"
          aria-label="Clear formatting"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
    </>
  );

  return (
    <div
      ref={rootRef}
      className="editor-toolbar relative z-10 shrink-0 border-b bg-background shadow-sm"
    >
      {!compact && (
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label="Document formatting"
          aria-orientation="horizontal"
          onFocusCapture={onToolbarFocus}
          onKeyDown={onToolbarKeyDown}
          className="flex items-center gap-1 overflow-x-auto px-3 py-2"
        >
          {items}
        </div>
      )}
      {compact && (
        <div className="flex items-center justify-end px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((open) => !open)}
          >
            More
          </Button>
        </div>
      )}
      {compact && moreOpen && (
        <div className="absolute inset-x-2 top-full z-30 max-h-[60dvh] overflow-y-auto rounded-md border bg-popover p-2 shadow-lg">
          <div
            ref={toolbarRef}
            role="toolbar"
            aria-label="More document formatting"
            aria-orientation="horizontal"
            onFocusCapture={onToolbarFocus}
            onKeyDown={onToolbarKeyDown}
            className="flex flex-wrap items-center gap-1"
          >
            {items}
          </div>
        </div>
      )}
      {linkOpen && (
        <form
          className="absolute left-3 top-full z-30 flex gap-2 rounded-md border bg-popover p-2 shadow-lg"
          onSubmit={(event) => {
            event.preventDefault();
            const href = safeHref(linkValue);
            if (!href) return;
            const chain = editor.chain().focus().extendMarkRange("link");
            if (editor.isActive("link")) chain.setLink({ href }).run();
            else chain.setLink({ href }).run();
            setLinkOpen(false);
            editor.commands.focus();
          }}
        >
          <input
            type="url"
            aria-label="Link URL"
            autoFocus
            value={linkValue}
            onChange={(event) => setLinkValue(event.currentTarget.value)}
            placeholder="https://example.com"
            className="h-8 min-w-56 rounded border bg-background px-2 text-sm"
          />
          <Button type="submit" size="sm" disabled={!safeHref(linkValue)}>Apply</Button>
          {state.link && safeHref(linkValue) && (
            <a
              href={safeHref(linkValue) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center px-2 text-sm text-primary underline"
              onClick={() => setLinkOpen(false)}
            >
              Open link
            </a>
          )}
          {state.link && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkOpen(false);
              }}
            >
              Remove
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" aria-label="Close link editor" onClick={() => setLinkOpen(false)}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </form>
      )}
    </div>
  );
}
