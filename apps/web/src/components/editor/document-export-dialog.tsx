import { useState } from "react";
import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import {
  Braces,
  Check,
  ChevronDown,
  Code2,
  Download,
  FileText,
  FileType,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExportButton } from "@/components/ui/animated-button";

const exportFormats = [
  { id: "pdf", label: "PDF", extension: "pdf", icon: FileText },
  { id: "html", label: "HTML", extension: "html", icon: Code2 },
  { id: "markdown", label: "Markdown", extension: "md", icon: FileType },
  { id: "text", label: "Plain text", extension: "txt", icon: FileText },
  { id: "json", label: "Tiptap JSON", extension: "json", icon: Braces },
] as const;

type ExportFormat = (typeof exportFormats)[number]["id"];

function sanitizeFilename(value: string) {
  const safeName = Array.from(value.trim())
    .map((character) =>
      /[<>:"/\\|?*]/.test(character) ||
      character.charCodeAt(0) < 32 ||
      character.charCodeAt(0) === 127
        ? "-"
        : character,
    )
    .join("")
    .replace(/\.(pdf|html?|md|txt|json)$/i, "")
    .replace(/[. ]+$/g, "");

  return Array.from(safeName).slice(0, 180).join("") || "Untitled document";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markedText(node: JSONContent) {
  let text = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        text = `**${text}**`;
        break;
      case "italic":
        text = `_${text}_`;
        break;
      case "strike":
        text = `~~${text}~~`;
        break;
      case "code":
        text = `\`${text}\``;
        break;
      case "link":
        text = `[${text}](${String(mark.attrs?.href ?? "")})`;
        break;
      case "subscript":
        text = `<sub>${text}</sub>`;
        break;
      case "superscript":
        text = `<sup>${text}</sup>`;
        break;
    }
  }

  return text;
}

function inlineMarkdown(nodes: JSONContent[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return markedText(node);
      if (node.type === "hardBreak") return "  \n";
      if (node.type === "image") {
        const alt = String(node.attrs?.alt ?? "");
        const src = String(node.attrs?.src ?? "");
        return `![${alt}](${src})`;
      }
      return inlineMarkdown(node.content);
    })
    .join("");
}

function listItemMarkdown(node: JSONContent, depth: number, prefix: string) {
  const blocks = node.content ?? [];
  const first = blocks[0];
  const firstLine = first ? markdownBlock(first, depth + 1) : "";
  const nested = blocks
    .slice(1)
    .map((block) => markdownBlock(block, depth + 1))
    .filter(Boolean)
    .join("\n");

  return `${"  ".repeat(depth)}${prefix}${firstLine}${nested ? `\n${nested}` : ""}`;
}

function markdownBlock(node: JSONContent, depth = 0): string {
  const children = node.content ?? [];

  switch (node.type) {
    case "doc":
      return children.map((child) => markdownBlock(child)).filter(Boolean).join("\n\n");
    case "page": {
      const title = String(node.attrs?.title ?? "").trim();
      const content = children.map((child) => markdownBlock(child)).filter(Boolean).join("\n\n");
      return [title ? `# ${title}` : "", content].filter(Boolean).join("\n\n");
    }
    case "paragraph":
      return inlineMarkdown(children);
    case "heading": {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 1));
      return `${"#".repeat(level)} ${inlineMarkdown(children)}`;
    }
    case "blockquote":
      return children
        .map((child) => markdownBlock(child))
        .filter(Boolean)
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "bulletList":
      return children
        .map((child) => listItemMarkdown(child, depth, "- "))
        .join("\n");
    case "orderedList": {
      const start = Number(node.attrs?.start) || 1;
      return children
        .map((child, index) =>
          listItemMarkdown(child, depth, `${start + index}. `),
        )
        .join("\n");
    }
    case "taskList":
      return children
        .map((child) => {
          const checked = child.attrs?.checked === true;
          return listItemMarkdown(child, depth, checked ? "- [x] " : "- [ ] ");
        })
        .join("\n");
    case "codeBlock":
      return `\`\`\`${String(node.attrs?.language ?? "")}\n${children
        .map((child) => child.text ?? "")
        .join("")}\n\`\`\``;
    case "horizontalRule":
      return "---";
    case "table":
      return children
        .map((row, index) => {
          const cells = (row.content ?? []).map((cell) =>
            inlineMarkdown(cell.content),
          );
          const line = `| ${cells.join(" | ")} |`;
          return index === 0
            ? `${line}\n| ${cells.map(() => "---").join(" | ")} |`
            : line;
        })
        .join("\n");
    default:
      return inlineMarkdown(children);
  }
}

function plainText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  const children = node.content ?? [];
  const rendered = children.map(plainText);

  if (node.type === "page") {
    const title = String(node.attrs?.title ?? "").trim();
    return [title, ...rendered].filter(Boolean).join("\n\n");
  }

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "blockquote" ||
    node.type === "codeBlock" ||
    node.type === "listItem" ||
    node.type === "taskItem" ||
    node.type === "tableRow"
  ) {
    return rendered.filter(Boolean).join(node.type === "tableRow" ? "\t" : "\n");
  }

  if (node.type === "image") return String(node.attrs?.alt ?? "");
  if (node.type === "horizontalRule") return "---";
  return rendered.filter(Boolean).join("\n");
}

function buildExportHtml(title: string, content: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; color: #171717; }
    body { margin: 0 auto; max-width: 820px; padding: 48px 56px; line-height: 1.65; }
    [data-page] { padding: 0; }
    [data-page-title]::before { content: attr(data-page-title); display: block; margin: 0 0 1em; font-size: 1.5em; font-weight: 700; line-height: 1.2; }
    h1, h2, h3, h4 { line-height: 1.25; margin: 1.4em 0 0.6em; }
    p { margin: 0.7em 0; }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #bdbdbd; padding: 6px 8px; text-align: left; }
    pre { overflow-wrap: anywhere; white-space: pre-wrap; padding: 12px; background: #f4f4f5; }
    blockquote { margin: 1em 0; border-left: 3px solid #aaa; padding-left: 1em; color: #444; }
    @media print {
      @page { size: A4; margin: 18mm; }
      body { max-width: none; padding: 0; }
      [data-page] { break-after: page; }
      [data-page]:last-child { break-after: auto; }
      h1, h2, h3, h4, tr, img { break-inside: avoid; }
    }
  </style>
</head>
<body><main>${content}</main></body>
</html>`;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printAsPdf(title: string, content: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("The print window was blocked. Allow pop-ups and try again.");
  }

  printWindow.document.open();
  printWindow.document.write(buildExportHtml(title, content));
  printWindow.document.close();
  window.setTimeout(() => {
    if (printWindow.closed) return;
    try {
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("Could not open the PDF print dialog:", error);
      toast.error("Could not open the print dialog. Please try again.");
    }
  }, 300);
}

export function DocumentExportDialog({
  editor,
  documentName,
}: {
  editor: Editor | null;
  documentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState(documentName);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const selectedFormat =
    exportFormats.find((option) => option.id === format) ?? exportFormats[0];
  const SelectedFormatIcon = selectedFormat.icon;

  function handleExport() {
    if (!editor || editor.isDestroyed) {
      toast.error("The document is not ready to export. Please try again.");
      return;
    }

    const safeFilename = sanitizeFilename(filename);
    const fullFilename = `${safeFilename}.${selectedFormat.extension}`;
    const html = editor.getHTML();

    try {
      switch (format) {
        case "pdf":
          printAsPdf(safeFilename, html);
          setOpen(false);
          return;
        case "html":
          downloadFile(
            fullFilename,
            buildExportHtml(safeFilename, html),
            "text/html;charset=utf-8",
          );
          break;
        case "markdown":
          downloadFile(
            fullFilename,
            `${markdownBlock(editor.getJSON()).trim()}\n`,
            "text/markdown;charset=utf-8",
          );
          break;
        case "text":
          downloadFile(
            fullFilename,
            `${plainText(editor.getJSON()).trim()}\n`,
            "text/plain;charset=utf-8",
          );
          break;
        case "json":
          downloadFile(
            fullFilename,
            `${JSON.stringify(editor.getJSON(), null, 2)}\n`,
            "application/json;charset=utf-8",
          );
          break;
      }

      setOpen(false);
      toast.success(`${selectedFormat.label} export downloaded.`);
    } catch (error) {
      console.error("Could not export document:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not export this document. Please try again.",
      );
    }
  }

  return (
    <>
      <ExportButton
        type="button"
        className="h-auto min-h-14 w-full justify-start rounded-xl px-3.5 py-2 text-left leading-tight whitespace-normal"
        onClick={() => {
          setFilename(documentName);
          setOpen(true);
        }}
        disabled={!editor}
      >
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="text-sm font-medium leading-tight">
            Export document
          </span>
          <span className="text-[11px] font-normal leading-tight text-primary-foreground/75">
            PDF · HTML · Markdown · TXT · JSON
          </span>
        </span>
      </ExportButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export document</DialogTitle>
            <DialogDescription>
              Choose a file format and name for your document export.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-export-format">File format</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      id="document-export-format"
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    />
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <SelectedFormatIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span>{selectedFormat.label}</span>
                    <span className="text-muted-foreground">
                      .{selectedFormat.extension}
                    </span>
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {exportFormats.map((option) => {
                    const FormatIcon = option.icon;
                    return (
                      <DropdownMenuItem
                        key={option.id}
                        onClick={() => setFormat(option.id)}
                        className="cursor-pointer"
                      >
                        <FormatIcon className="size-4 text-muted-foreground" />
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          .{option.extension}
                        </span>
                        {format === option.id && (
                          <Check
                            className="ml-auto size-4"
                            aria-label="Selected"
                          />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              {format === "pdf" && (
                <p className="text-xs text-muted-foreground">
                  Choose “Save as PDF” in the print dialog to download your PDF.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-export-name">File name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="document-export-name"
                  value={filename}
                  onChange={(event) => setFilename(event.currentTarget.value)}
                  maxLength={180}
                  autoComplete="off"
                  className="min-w-0"
                />
                <span className="shrink-0 text-sm text-muted-foreground">
                  .{selectedFormat.extension}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={!editor}
            >
              <Download className="size-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
