import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Check,
  CheckSquare,
  ChevronDown,
  Code,
  Combine,
  Eraser,
  Ellipsis,
  LayoutGrid,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Paintbrush,
  PanelTop,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Split,
  Subscript,
  Superscript,
  Table2,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      && (url.protocol === "mailto:"
        ? url.pathname.length > 0
        : Boolean(url.hostname))
      ? value
      : null;
  } catch {
    return null;
  }
}

export function EditorToolbar({ editor, disabled }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [customTableSizeOpen, setCustomTableSizeOpen] = useState(false);
  const [tableSize, setTableSize] = useState({ rows: 3, columns: 3 });
  const rootRef = useRef<HTMLDivElement>(null);
  const tableGridRef = useRef<HTMLDivElement>(null);
  const overflowToolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!customTableSizeOpen) return;
    tableGridRef.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
  }, [customTableSizeOpen]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setToolbarWidth(entry?.contentRect.width ?? 0);
      setMoreOpen(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!moreOpen) return;
    const firstControl =
      overflowToolbarRef.current?.querySelector<HTMLElement>(
        "button:not(:disabled), input:not(:disabled)",
      );
    if (!firstControl) return;
    firstControl.tabIndex = 0;
    firstControl.focus();
  }, [moreOpen]);
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
      fontFamily: current.getAttributes("textStyle").fontFamily ?? "",
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
      a.fontFamily === b.fontFamily &&
      a.fontSize === b.fontSize &&
      a.lineHeight === b.lineHeight),
  });
  const linkHref = safeHref(linkValue.trim());

  function run(command: () => void) {
    command();
    editor.commands.focus();
  }

  function onToolbarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled)',
      ),
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
    event.currentTarget
      .querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
      .forEach((control) => control.setAttribute("tabindex", "-1"));
    (event.target as HTMLElement).setAttribute("tabindex", "0");
  }

  function moveTableGridFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    rows: number,
    columns: number,
  ) {
    const next = {
      rows: Math.min(8, Math.max(1, rows)),
      columns: Math.min(8, Math.max(1, columns)),
    };
    if (
      next.rows === rows &&
      next.columns === columns &&
      !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "ArrowUp") next.rows = Math.max(1, rows - 1);
    if (event.key === "ArrowDown") next.rows = Math.min(8, rows + 1);
    if (event.key === "ArrowLeft") next.columns = Math.max(1, columns - 1);
    if (event.key === "ArrowRight") next.columns = Math.min(8, columns + 1);
    if (event.key === "Home") {
      next.rows = 1;
      next.columns = 1;
    }
    if (event.key === "End") {
      next.rows = 8;
      next.columns = 8;
    }
    setTableSize(next);
    tableGridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-rows="${next.rows}"][data-columns="${next.columns}"]`,
      )
      ?.focus();
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

  function tableAction(
    label: string,
    icon: typeof Bold,
    command: () => void,
    destructive = false,
  ) {
    const Icon = icon;
    return (
      <Button
        key={label}
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 justify-start gap-2 px-2 text-xs font-normal",
          destructive && "text-destructive hover:text-destructive",
        )}
        title={label}
        aria-label={label}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => run(command)}
      >
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
      </Button>
    );
  }

  function insertTable(rows: number, columns: number) {
    run(() =>
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols: columns, withHeaderRow: true })
        .run(),
    );
    setTableOpen(false);
  }

  function selectMenu(
    label: string,
    value: string,
    options: { value: string; label: string; style?: CSSProperties }[],
    onSelect: (value: string) => void,
    displayValue?: string,
  ) {
    const selectedOption = options.find((option) => option.value === value);
    return (
      <DropdownMenu key={label}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              tabIndex={-1}
              className="h-8 max-w-36 justify-between gap-2 px-2 font-normal"
              aria-label={label}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
            />
          }
        >
          <span
            className="truncate"
            style={
              selectedOption?.style?.fontFamily
                ? { fontFamily: selectedOption.style.fontFamily }
                : undefined
            }
          >
            {displayValue ?? label}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSelect(option.value)}
                className="cursor-pointer"
              >
                <span style={option.style}>{option.label}</span>
                {option.value === value && (
                  <Check className="ml-auto size-4" aria-hidden="true" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const items = (
    <>
        {action("Undo", "Ctrl+Z", Undo2, false, () => editor.chain().focus().undo().run())}
        {action("Redo", "Ctrl+Shift+Z", Redo2, false, () => editor.chain().focus().redo().run())}
        <span data-toolbar-separator="" className="mx-1 h-5 w-px shrink-0 bg-border" />
        {selectMenu(
          "Text style",
          state.h1 ? "1" : state.h2 ? "2" : state.h3 ? "3" : state.h4 ? "4" : "p",
          [
            { value: "p", label: "Paragraph" },
            { value: "1", label: "Heading 1", style: { fontSize: "1.5rem" } },
            { value: "2", label: "Heading 2", style: { fontSize: "1.25rem" } },
            { value: "3", label: "Heading 3", style: { fontSize: "1.125rem" } },
            { value: "4", label: "Heading 4", style: { fontSize: "1rem" } },
          ],
          (value) =>
            run(() =>
              value === "p"
                ? editor.chain().focus().setParagraph().run()
                : editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 | 4 }).run(),
            ),
          state.h1 ? "Heading 1" : state.h2 ? "Heading 2" : state.h3 ? "Heading 3" : state.h4 ? "Heading 4" : "Paragraph",
        )}
        {selectMenu(
          "Font family",
          state.fontFamily,
          [
            { value: "", label: "Default font" },
            ...SYSTEM_FONTS.map((font) => ({
              value: font,
              label: font.split(",")[0] ?? font,
              style: { fontFamily: font },
            })),
          ],
          (value) =>
            run(() =>
              value
                ? editor.chain().focus().setMark("textStyle", { fontFamily: value }).run()
                : editor.chain().focus().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
            ),
          state.fontFamily
            ? (SYSTEM_FONTS.find((font) => font === state.fontFamily)?.split(",")[0] ??
              state.fontFamily.split(",")[0] ??
              "Font")
            : "Font",
        )}
        {selectMenu(
          "Font size",
          state.fontSize,
          [
            { value: "", label: "Default size" },
            ...[8, 9, 10, 11, 12, 14, 16, 18, 24, 32, 48, 72].map((size) => ({
              value: `${size}pt`,
              label: `${size} pt`,
            })),
          ],
          (value) =>
            run(() =>
              value
                ? editor.chain().focus().setMark("textStyle", { fontSize: value }).run()
                : editor.chain().focus().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
            ),
          state.fontSize || "Size",
        )}
        {selectMenu(
          "Line height",
          state.lineHeight,
          [
            { value: "", label: "Default line height" },
            ...["1", "1.15", "1.5", "1.75", "2"].map((height) => ({
              value: height,
              label: `${height}×`,
            })),
          ],
          (value) =>
            run(() =>
              value
                ? editor.chain().focus().setMark("textStyle", { lineHeight: value }).run()
                : editor.chain().focus().setMark("textStyle", { lineHeight: null }).removeEmptyTextStyle().run(),
            ),
          state.lineHeight ? `${state.lineHeight}×` : "Line height",
        )}
        <span data-toolbar-separator="" className="mx-1 h-5 w-px shrink-0 bg-border" />
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
        <span data-toolbar-separator="" className="mx-1 h-5 w-px shrink-0 bg-border" />
        {action("Align left", "", AlignLeft, state.alignment === "left", () => editor.chain().focus().setTextAlign("left").run())}
        {action("Align center", "", AlignCenter, state.alignment === "center", () => editor.chain().focus().setTextAlign("center").run())}
        {action("Align right", "", AlignRight, state.alignment === "right", () => editor.chain().focus().setTextAlign("right").run())}
        {action("Justify", "", AlignJustify, state.alignment === "justify", () => editor.chain().focus().setTextAlign("justify").run())}
        <span data-toolbar-separator="" className="mx-1 h-5 w-px shrink-0 bg-border" />
        {action("Bullet list", "", List, state.bullet, () => editor.chain().focus().toggleBulletList().run())}
        {action("Numbered list", "", ListOrdered, state.ordered, () => editor.chain().focus().toggleOrderedList().run())}
        {action("Task list", "", CheckSquare, state.task, () => editor.chain().focus().toggleTaskList().run())}
        {action("Indent list", "Tab", List, false, () => editor.chain().focus().sinkListItem(state.task ? "taskItem" : "listItem").run())}
        {action("Outdent list", "Shift+Tab", ListOrdered, false, () => editor.chain().focus().liftListItem(state.task ? "taskItem" : "listItem").run())}
        {action("Quote", "", Quote, state.quote, () => editor.chain().focus().toggleBlockquote().run())}
        {action("Code block", "", SquareCode, state.codeBlock, () => editor.chain().focus().toggleCodeBlock().run())}
        {action("Horizontal rule", "", Minus, false, () => editor.chain().focus().setHorizontalRule().run())}
        <Popover open={tableOpen} onOpenChange={setTableOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant={state.table ? "secondary" : "ghost"}
                size="sm"
                tabIndex={-1}
                className="h-8 gap-2 px-2"
                aria-label="Table options"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
              />
            }
          >
            <Table2 className="size-4" aria-hidden="true" />
            <span>Table</span>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(24rem,calc(100vw-2rem))] gap-4 p-4"
            aria-label="Table options"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">Insert table</p>
              <p className="text-xs text-muted-foreground">
                Choose a size, up to 8 × 8.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {[3, 4, 5].map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={disabled}
                      onClick={() => insertTable(size, size)}
                      aria-label={`Insert ${size} by ${size} table`}
                    >
                      {size} × {size}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant={customTableSizeOpen ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-2 px-2"
                  aria-expanded={customTableSizeOpen}
                  aria-controls="editor-custom-table-size"
                  disabled={disabled}
                  onClick={() => setCustomTableSizeOpen((open) => !open)}
                >
                  <LayoutGrid className="size-4" aria-hidden="true" />
                  Custom size
                </Button>
              </div>
              <div
                id="editor-custom-table-size"
                aria-hidden={!customTableSizeOpen}
                inert={!customTableSizeOpen}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none",
                  customTableSizeOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Columns × rows</span>
                      <span className="font-medium text-foreground">
                        {tableSize.columns} × {tableSize.rows}
                      </span>
                    </div>
                    <div
                      ref={tableGridRef}
                      role="grid"
                      aria-label="Choose custom table dimensions"
                      aria-rowcount={8}
                      aria-colcount={8}
                      className="grid grid-cols-8 gap-1.5"
                    >
                      {Array.from({ length: 8 }, (_, rowIndex) => (
                        <div
                          key={rowIndex}
                          role="row"
                          aria-rowindex={rowIndex + 1}
                          className="contents"
                        >
                          {Array.from({ length: 8 }, (_, columnIndex) => {
                            const rows = rowIndex + 1;
                            const columns = columnIndex + 1;
                            const selected =
                              rows <= tableSize.rows &&
                              columns <= tableSize.columns;
                            return (
                              <button
                                key={columnIndex}
                                type="button"
                                role="gridcell"
                                data-rows={rows}
                                data-columns={columns}
                                tabIndex={
                                  customTableSizeOpen &&
                                  rows === tableSize.rows &&
                                  columns === tableSize.columns
                                    ? 0
                                    : -1
                                }
                                aria-label={`${columns} columns by ${rows} rows`}
                                aria-selected={selected}
                                disabled={disabled || !customTableSizeOpen}
                                onFocus={() => setTableSize({ rows, columns })}
                                onMouseEnter={() => setTableSize({ rows, columns })}
                                onKeyDown={(event) =>
                                  moveTableGridFocus(event, rows, columns)
                                }
                                onClick={() => insertTable(rows, columns)}
                                className={cn(
                                  "aspect-square rounded-sm border transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  selected
                                    ? "border-primary bg-primary/25"
                                    : "border-border bg-background hover:border-primary/60",
                                )}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {state.table && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Rows</p>
                    <div className="grid grid-cols-2 gap-1">
                      {tableAction("Insert row above", BetweenHorizontalStart, () => editor.chain().focus().addRowBefore().run())}
                      {tableAction("Insert row below", BetweenHorizontalEnd, () => editor.chain().focus().addRowAfter().run())}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Columns</p>
                    <div className="grid grid-cols-2 gap-1">
                      {tableAction("Insert column left", BetweenVerticalStart, () => editor.chain().focus().addColumnBefore().run())}
                      {tableAction("Insert column right", BetweenVerticalEnd, () => editor.chain().focus().addColumnAfter().run())}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Cells and style</p>
                    <div className="grid grid-cols-2 gap-1">
                      {tableAction("Merge cells", Combine, () => editor.chain().focus().mergeCells().run())}
                      {tableAction("Split cell", Split, () => editor.chain().focus().splitCell().run())}
                      {tableAction("Toggle header row", PanelTop, () => editor.chain().focus().toggleHeaderRow().run())}
                      <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" title="Cell background color">
                        <Paintbrush className="size-4" aria-hidden="true" />
                        <span className="flex-1">Cell color</span>
                        <input
                          type="color"
                          aria-label="Cell background color"
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
                          className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start"
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
                        <Eraser className="size-4" aria-hidden="true" />
                        Reset cell color
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 border-t pt-2">
                    {tableAction("Delete row", TableRowsSplit, () => editor.chain().focus().deleteRow().run(), true)}
                    {tableAction("Delete column", TableColumnsSplit, () => editor.chain().focus().deleteColumn().run(), true)}
                    {tableAction("Delete table", Trash2, () => editor.chain().focus().deleteTable().run(), true)}
                  </div>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
        <Popover
          open={linkOpen}
          onOpenChange={(open) => {
            setLinkOpen(open);
            if (open) setLinkValue(String(editor.getAttributes("link").href ?? ""));
          }}
        >
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant={state.link ? "secondary" : "ghost"}
                size="icon"
                title="Link"
                aria-label="Link"
                tabIndex={-1}
                aria-pressed={state.link}
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
              />
            }
          >
            <LinkIcon className="size-4" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 gap-3 p-3">
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!linkHref) return;
                editor.chain().focus().extendMarkRange("link").setLink({ href: linkHref }).run();
                setLinkOpen(false);
                editor.commands.focus();
              }}
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">Link</p>
                <p className="text-xs text-muted-foreground">
                  Add a web address or email link to the selected text.
                </p>
              </div>
              <input
                type="text"
                inputMode="url"
                aria-label="Link URL"
                autoFocus
                value={linkValue}
                onChange={(event) => setLinkValue(event.currentTarget.value)}
                placeholder="https://example.com"
                aria-invalid={linkValue.trim().length > 0 && !linkHref}
                aria-describedby={
                  linkValue.trim().length > 0 && !linkHref
                    ? "editor-link-validation"
                    : undefined
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              {linkValue.trim().length > 0 && !linkHref && (
                <p
                  id="editor-link-validation"
                  className="text-xs text-destructive"
                  role="status"
                >
                  Enter a valid http, https, or mailto link.
                </p>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                {state.link && linkHref && (
                  <a
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center px-2 text-sm text-primary underline"
                    onClick={() => setLinkOpen(false)}
                  >
                    Open link
                  </a>
                )}
                <div className="ml-auto flex gap-2">
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
                  <Button type="submit" size="sm" disabled={!linkHref}>
                    Apply
                  </Button>
                </div>
              </div>
            </form>
          </PopoverContent>
        </Popover>
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
  const toolbarGroups = Children.toArray(
    (items as ReactElement<{ children: ReactNode }>).props.children,
  ).reduce<ReactNode[][]>((groups, item) => {
    const isSeparator =
      isValidElement<{ "data-toolbar-separator"?: string }>(item) &&
      item.props["data-toolbar-separator"] !== undefined;
    if (isSeparator) {
      groups.push([]);
    } else {
      groups[groups.length - 1]?.push(item);
    }
    return groups;
  }, [[]]);
  const visibleGroupCount =
    toolbarWidth >= 1800
      ? toolbarGroups.length
      : toolbarWidth >= 1400
        ? Math.min(4, toolbarGroups.length)
        : toolbarWidth >= 1150
          ? Math.min(3, toolbarGroups.length)
          : toolbarWidth >= 760
            ? Math.min(2, toolbarGroups.length)
            : 1;
  const hasOverflow = visibleGroupCount < toolbarGroups.length;
  const visibleItems = toolbarGroups
    .slice(0, visibleGroupCount)
    .flatMap((group, index) => [
      ...(index > 0
        ? [
            <span
              key={`visible-separator-${index}`}
              className="mx-1 h-5 w-px shrink-0 bg-border"
              aria-hidden="true"
            />,
          ]
        : []),
      ...group,
    ]);
  const overflowItems = toolbarGroups
    .slice(visibleGroupCount)
    .flatMap((group, index) => [
      ...(index > 0
        ? [
            <span
              key={`overflow-separator-${index}`}
              className="mx-1 h-5 w-px shrink-0 bg-border"
              aria-hidden="true"
            />,
          ]
        : []),
      ...group,
    ]);

  return (
    <div
      ref={rootRef}
      className="editor-toolbar relative z-10 shrink-0 border-b bg-background shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-1 px-3 py-2">
        <div
          role="toolbar"
          aria-label="Document formatting"
          aria-orientation="horizontal"
          onFocusCapture={onToolbarFocus}
          onKeyDown={onToolbarKeyDown}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        >
          {visibleItems}
        </div>
        {hasOverflow && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 px-2"
                  aria-expanded={moreOpen}
                  aria-haspopup="dialog"
                  aria-label="More formatting options"
                />
              }
            >
              <Ellipsis className="size-4" aria-hidden="true" />
              More
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="max-h-[70dvh] w-[min(56rem,calc(100vw-1rem))] gap-0 overflow-y-auto p-2"
            >
              <div
                ref={overflowToolbarRef}
                role="toolbar"
                aria-label="More document formatting"
                aria-orientation="horizontal"
                onFocusCapture={onToolbarFocus}
                onKeyDown={onToolbarKeyDown}
                className="flex flex-wrap items-center gap-1"
              >
                {overflowItems}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
