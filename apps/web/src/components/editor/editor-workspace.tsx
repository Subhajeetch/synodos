import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Clock3,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Loader2,
  Minus,
  PanelRight,
  PanelsTopLeft,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { isChangeOrigin } from "@tiptap/extension-collaboration";
import { yUndoPluginKey } from "@tiptap/y-tiptap";
import { WebSocketStatus } from "@hocuspocus/provider";
import {
  useHocuspocusEvent,
  useHocuspocusProvider,
} from "@hocuspocus/provider-react";
import {
  documentRestoredMessageSchema,
  canEdit,
  canManageMembers,
  MAX_DOCUMENT_MEMBERS,
  documentDeletedMessageSchema,
  memberRemovedMessageSchema,
  memberRoleChangedMessageSchema,
  type DocumentMember,
  type DocumentSummary,
} from "@synodos/shared";
import type { DocumentVersionSummary } from "@synodos/shared";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  documentKeys,
  useDocumentMembers,
  useDocumentSharing,
} from "@/hooks/use-documents";
import { useOfflinePersistence } from "@/hooks/use-offline-persistence";
import { usePresence } from "@/hooks/use-presence";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import {
  useDocumentVersion,
  useDocumentVersions,
  useRestoreDocumentVersion,
} from "@/hooks/use-document-versions";
import {
  clampZoom,
  getZoom,
  logSliderToZoom,
  setZoom,
  subscribeZoom,
  zoomToLogSlider,
} from "@/lib/zoom/zoom-store";
import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api";
import { api } from "@/lib/api";
import { decodeVersionState } from "@/lib/version-snapshot";
import { userColor } from "@/lib/colors";
import { scheduleSoundPreload } from "@/lib/audio/sound-engine";
import {
  dismissNotificationScope,
  setNotificationCurrentUser,
  notifyPresenceChange,
  notifyMemberJoined,
  notifyAccessRequest,
} from "@/lib/notifications/notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConnectionStatus } from "./connection-status";
import { showActiveCollaborationCursors } from "./collaboration-cursor";
import "./collaboration-cursor.css";
import "./editor-document.css";
import { EditorSidebar } from "./editor-sidebar";
import { EditorToolbar } from "./editor-toolbar";
import { AddPageButton } from "./page-controls";
import { getPageRanges } from "./page-actions";
import { InviteMemberDialog } from "./invite-member-dialog";
import { PresenceAvatars } from "./presence";
import { SyncErrorBanner } from "./sync-error-banner";
import { TitleInput } from "./title-input";
import { createEditorExtensions } from "./editor-extensions";
import { VersionPreviewPanel } from "./version-preview-panel";
import type { Doc } from "yjs";

import { useQueryClient } from "@tanstack/react-query";

type VersionWithPosition = DocumentVersionSummary & {
  position: number;
  total: number;
};

function getPageSummaries(doc: ProseMirrorNode) {
  return getPageRanges(doc).map((page) => ({
    position: page.from + 1,
    preview:
      page.node?.textContent ??
      doc
        .slice(page.from, page.to)
        .content.textBetween(0, page.to - page.from, " "),
  }));
}

function getCharacterMetrics(editor: Editor) {
  const characterCount = editor.storage.characterCount;
  const text = editor.state.doc.textContent;
  const words =
    typeof characterCount?.words === "function"
      ? characterCount.words()
      : text.trim().split(/\s+/).filter(Boolean).length;
  const characters =
    typeof characterCount?.characters === "function"
      ? characterCount.characters()
      : text.length;
  return { wordCount: words, characterCount: characters };
}

function persistZoom(
  docId: string,
  zoom: number,
  mode: "manual" | "fit-width" | "fit-page",
) {
  try {
    window.localStorage.setItem(
      `synodos:zoom:${docId}`,
      JSON.stringify({ zoom, mode }),
    );
  } catch (error) {
    console.warn("Could not persist document zoom:", error);
  }
}

function applyPaperZoom(
  canvas: HTMLElement,
  paperFrame: HTMLElement,
  currentZoom: number,
  nextZoom: number,
  anchor: { x: number; y: number },
) {
  const beforeRect = paperFrame.getBoundingClientRect();
  const anchorOffsetX = (anchor.x - beforeRect.left) / currentZoom;
  const anchorOffsetY = (anchor.y - beforeRect.top) / currentZoom;

  const sizer = canvas.querySelector<HTMLElement>(".editor-canvas__sizer");
  const stage = canvas.querySelector<HTMLElement>(".editor-canvas__stage");
  const contentHeight =
    paperFrame.querySelector<HTMLElement>(".editor-document")?.offsetHeight ??
    1123;
  const horizontalSlack =
    794 * nextZoom > canvas.clientWidth ? Math.ceil(canvas.clientWidth / 2) : 0;
  canvas.style.setProperty("--zoom", String(nextZoom));
  sizer?.style.setProperty("width", `${794 * nextZoom}px`);
  sizer?.style.setProperty("height", `${contentHeight * nextZoom}px`);
  stage?.style.setProperty("--pan-slack-x", `${horizontalSlack}px`);
  paperFrame.style.transform = `scale(${nextZoom})`;
  paperFrame.style.transformOrigin = "0 0";

  const afterRect = paperFrame.getBoundingClientRect();
  canvas.scrollLeft += afterRect.left + anchorOffsetX * nextZoom - anchor.x;
  canvas.scrollTop += afterRect.top + anchorOffsetY * nextZoom - anchor.y;
}

function EditorPagesFooter({
  editor,
  onZoomChange,
  handToolActive,
  onToggleHandTool,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  onZoomChange: (
    zoom: number,
    mode?: "manual" | "fit-width" | "fit-page",
  ) => void;
  handToolActive: boolean;
  onToggleHandTool: () => void;
}) {
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [zoomPresetsOpen, setZoomPresetsOpen] = useState(false);
  const [footerWidth, setFooterWidth] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  const zoomPresetMenuRef = useRef<HTMLDivElement>(null);
  const zoom = useSyncExternalStore(subscribeZoom, getZoom, getZoom);
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const ranges = getPageRanges(currentEditor.state.doc);
      const currentRangeIndex = ranges.reduce(
        (activePage, page, index) =>
          currentEditor.state.selection.anchor >= page.from
            ? index
            : activePage,
        0,
      );
      return {
        doc: thumbnailsOpen ? currentEditor.state.doc : null,
        currentPage: currentRangeIndex + 1,
        pageCount: ranges.length,
        ...getCharacterMetrics(currentEditor),
      };
    },
    equalityFn: (a, b) =>
      a === b ||
      (!!a &&
        !!b &&
        a.doc === b.doc &&
        a.currentPage === b.currentPage &&
        a.pageCount === b.pageCount &&
        a.wordCount === b.wordCount &&
        a.characterCount === b.characterCount),
  });
  const pages = useMemo(
    () => (editorState.doc ? getPageSummaries(editorState.doc) : []),
    [editorState.doc],
  );
  const currentPage = editorState.currentPage;
  const PageToggleIcon = thumbnailsOpen ? ChevronDown : ChevronUp;
  const compact = footerWidth < 960;
  const narrow = footerWidth < 700;

  useEffect(() => {
    if (zoomPresetsOpen) {
      zoomPresetMenuRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
    }
  }, [zoomPresetsOpen]);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setFooterWidth(entry?.contentRect.width ?? 0);
      setMoreOpen(false);
      setZoomPresetsOpen(false);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  function goToPage(position: number) {
    editor.chain().focus().setTextSelection(position).scrollIntoView().run();
  }

  function selectZoomPreset(preset: string) {
    const canvas = editor.view.dom.closest<HTMLElement>(".editor-canvas");
    if (!canvas) return;
    if (preset === "fit-width") {
      onZoomChange(
        Math.min(3, Math.max(0.25, (canvas.clientWidth - 32) / 794)),
        "fit-width",
      );
    } else if (preset === "fit-page") {
      onZoomChange(
        Math.min(
          3,
          Math.max(
            0.25,
            Math.min(
              (canvas.clientWidth - 32) / 794,
              (canvas.clientHeight - 48) / 1123,
            ),
          ),
        ),
        "fit-page",
      );
    } else {
      onZoomChange(Number(preset) / 100, "manual");
    }
    setZoomPresetsOpen(false);
  }

  const zoomSlider = (
    <div className="relative w-28 sm:w-40">
      <Slider
        min={0}
        max={100}
        step={1}
        value={[Math.round(zoomToLogSlider(zoom) * 100)]}
        aria-label="Zoom"
        aria-valuetext={`${Math.round(zoom * 100)} percent`}
        onValueChange={(value) => {
          const nextZoom = Array.isArray(value) ? value[0] : value;
          if (typeof nextZoom === "number") {
            onZoomChange(logSliderToZoom(nextZoom / 100), "manual");
          }
        }}
      />
    </div>
  );
  const zoomPresetControl = (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-12 px-1 tabular-nums text-muted-foreground"
        aria-label="Zoom percentage and presets"
        aria-haspopup="menu"
        aria-expanded={zoomPresetsOpen}
        onClick={() => setZoomPresetsOpen((open) => !open)}
      >
        {Math.round(zoom * 100)}%
      </Button>
      {zoomPresetsOpen && (
        <div
          ref={zoomPresetMenuRef}
          role="menu"
          aria-label="Zoom presets"
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]',
              ),
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (event.key === "Escape") {
              event.preventDefault();
              setZoomPresetsOpen(false);
              event.currentTarget.previousElementSibling
                ?.querySelector("button")
                ?.focus();
            } else if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              items.length
            ) {
              event.preventDefault();
              const offset = event.key === "ArrowDown" ? 1 : -1;
              items[(index + offset + items.length) % items.length]?.focus();
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              items[event.key === "Home" ? 0 : items.length - 1]?.focus();
            }
          }}
          className="absolute bottom-full left-1/2 z-30 mb-2 flex min-w-36 -translate-x-1/2 flex-col rounded-md border bg-popover p-1 shadow-lg"
        >
          {[
            ["fit-width", "Fit width"],
            ["fit-page", "Fit page"],
            ...[50, 75, 100, 125, 150, 200, 300].map((percent) => [
              String(percent),
              `${percent}%`,
            ]),
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className="rounded px-3 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              onClick={() => selectZoomPreset(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const fitWidthButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const canvas = editor.view.dom.closest<HTMLElement>(".editor-canvas");
        if (canvas) {
          onZoomChange(
            Math.min(3, Math.max(0.25, (canvas.clientWidth - 32) / 794)),
            "fit-width",
          );
        }
      }}
    >
      Fit width
    </Button>
  );
  const handButton = (
    <Button
      type="button"
      variant={handToolActive ? "secondary" : "ghost"}
      size="sm"
      aria-pressed={handToolActive}
      onClick={onToggleHandTool}
    >
      Hand
    </Button>
  );
  const pagesButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-expanded={thumbnailsOpen}
      aria-controls={thumbnailsOpen ? "editor-page-thumbnails" : undefined}
      aria-label="Toggle page thumbnails"
      onClick={() => setThumbnailsOpen((open) => !open)}
      className="gap-1.5 px-2"
    >
      <PanelsTopLeft className="size-4" aria-hidden="true" />
      <span>Pages</span>
      <PageToggleIcon
        className="size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
    </Button>
  );

  return (
    <footer
      ref={footerRef}
      className="relative z-20 flex h-14 w-full shrink-0 items-center justify-center border-t bg-background px-2 shadow-[0_-2px_8px_rgb(15_23_42/0.04)] sm:px-4"
    >
      {thumbnailsOpen && (
        <div
          id="editor-page-thumbnails"
          role="region"
          aria-label="Page thumbnails"
          className="absolute inset-x-0 bottom-full border-t border-border/70 bg-background/95 px-4 py-3 shadow-lg backdrop-blur"
        >
          <div className="flex items-end gap-3 overflow-x-auto pb-1">
            {pages.map((page, index) => {
              const pageNumber = index + 1;
              const isCurrent = pageNumber === currentPage;
              return (
                <button
                  key={`${page.position}-${pageNumber}`}
                  type="button"
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={`Go to page ${pageNumber}`}
                  onClick={() => goToPage(page.position)}
                  className="group flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-md p-1.5 text-left"
                >
                  <span
                    className={cn(
                      "flex aspect-[210/297] w-full flex-col overflow-hidden rounded-sm border bg-white p-2 shadow-sm transition",
                      isCurrent
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border group-hover:border-primary/50",
                    )}
                  >
                    {page.preview ? (
                      <span className="line-clamp-7 break-words text-[5px] leading-[1.4] text-neutral-600">
                        {page.preview}
                      </span>
                    ) : (
                      <span className="mt-1 space-y-1" aria-hidden="true">
                        <span className="block h-1 w-3/4 rounded bg-neutral-200" />
                        <span className="block h-1 w-full rounded bg-neutral-100" />
                        <span className="block h-1 w-4/5 rounded bg-neutral-100" />
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isCurrent
                        ? "font-semibold text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    Page {pageNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex min-w-0 max-w-full items-center justify-center gap-1 text-sm sm:gap-2">
        {!narrow && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              disabled={zoom <= 0.25}
              onClick={() => onZoomChange(zoom / 1.25, "manual")}
            >
              <Minus className="size-4" aria-hidden="true" />
            </Button>
            {zoomSlider}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              disabled={zoom >= 3}
              onClick={() => onZoomChange(zoom * 1.25, "manual")}
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
        {zoomPresetControl}
        {!narrow && (
          <>
            {fitWidthButton}
            {handButton}
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            {pagesButton}
          </>
        )}
        <span
          className="min-w-12 tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {currentPage} / {editorState.pageCount}
        </span>
        {compact && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2"
                  aria-label="More view controls"
                  aria-expanded={moreOpen}
                  aria-haspopup="dialog"
                />
              }
            >
              <Ellipsis className="size-4" aria-hidden="true" />
              <span className="max-[360px]:hidden">More</span>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="max-h-[min(70dvh,32rem)] w-[min(22rem,calc(100vw-1rem))] gap-3 overflow-y-auto p-3"
            >
              {narrow && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Zoom out"
                    disabled={zoom <= 0.25}
                    onClick={() => onZoomChange(zoom / 1.25, "manual")}
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </Button>
                  {zoomSlider}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Zoom in"
                    disabled={zoom >= 3}
                    onClick={() => onZoomChange(zoom * 1.25, "manual")}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
              {narrow && (
                <div className="flex flex-wrap items-center gap-2">
                  {fitWidthButton}
                  {handButton}
                  {pagesButton}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t pt-2 text-xs text-muted-foreground">
                <span>{editorState.wordCount} words</span>
                <span>{editorState.characterCount} characters</span>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {!compact && (
          <span className="hidden tabular-nums text-xs text-muted-foreground md:inline">
            {editorState.wordCount} words · {editorState.characterCount}{" "}
            characters
          </span>
        )}
      </div>
    </footer>
  );
}

/** Must be rendered inside <HocuspocusRoom>. */
class EditorWorkspaceErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("EditorWorkspace render failure:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center bg-background p-6 text-center">
          <div className="max-w-md space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-base font-semibold">
              Something went wrong rendering the editor.
            </p>
            <p className="text-sm text-muted-foreground">
              Your changes are safe in the collaboration server or the local
              copy.
            </p>
            {new URLSearchParams(window.location.search).has("version") && (
              <p className="break-words font-mono text-xs text-muted-foreground">
                {this.state.error.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

class VersionPreviewErrorBoundary extends Component<
  { children: ReactNode; onReturnToLive: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Version preview render failure:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="mx-auto mt-8 max-w-lg rounded-lg border border-destructive/30 bg-background p-4 text-sm shadow"
        >
          <p className="font-medium">
            This saved version couldn’t be rendered.
          </p>
          <p className="mt-1 text-muted-foreground">
            The current document is still available and has not been changed.
          </p>
          <p className="mt-2 break-words font-mono text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <Button
            className="mt-3"
            size="sm"
            onClick={this.props.onReturnToLive}
          >
            Return to current document
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

function VersionPreviewEditor({
  document,
  versionId,
  onEditorChange,
}: {
  document: Doc;
  versionId: string;
  onEditorChange: (versionId: string, editor: Editor | null) => void;
}) {
  const editor = useEditor(
    {
      editable: false,
      extensions: createEditorExtensions({ document }),
      editorProps: {
        attributes: {
          class:
            "prose prose-neutral max-w-none text-neutral-950 focus:outline-none " +
            "prose-headings:text-neutral-950 prose-p:text-neutral-800 prose-strong:text-neutral-950 " +
            "prose-code:text-neutral-950 prose-code:before:content-none prose-code:after:content-none",
        },
      },
    },
    [document],
  );

  useEffect(() => {
    onEditorChange(versionId, editor);
    return () => onEditorChange(versionId, null);
  }, [editor, onEditorChange, versionId]);

  return editor ? <EditorContent editor={editor} /> : null;
}

export function EditorWorkspace({ doc }: { doc: DocumentSummary }) {
  return (
    <EditorWorkspaceErrorBoundary>
      <EditorWorkspaceContent key={doc.id} doc={doc} />
    </EditorWorkspaceErrorBoundary>
  );
}

function EditorWorkspaceContent({ doc }: { doc: DocumentSummary }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const provider = useHocuspocusProvider();
  const selectedVersionId = searchParams.get("version");
  const versionQuery = useDocumentVersion(doc.id, selectedVersionId);
  const versionsQuery = useDocumentVersions(doc.id);
  const restoreVersion = useRestoreDocumentVersion(doc.id);
  const previewSnapshot = useMemo(() => {
    if (!versionQuery.data) return null;
    try {
      const document = decodeVersionState(versionQuery.data.state);
      return { document, error: null };
    } catch (error) {
      return {
        document: null,
        error:
          error instanceof Error
            ? error
            : new Error("The saved version could not be decoded"),
      };
    }
  }, [versionQuery.data]);
  const previewDocument = previewSnapshot?.document ?? null;
  const [previewEditor, setPreviewEditor] = useState<{
    versionId: string;
    editor: Editor;
  } | null>(null);
  const [versionNavigation, setVersionNavigation] = useState<{
    direction: "older" | "newer";
    targetVersionId: string | null;
  } | null>(null);
  const handlePreviewEditorChange = useCallback(
    (versionId: string, nextEditor: Editor | null) => {
      setPreviewEditor((current) => {
        if (nextEditor) return { versionId, editor: nextEditor };
        return current?.versionId === versionId ? null : current;
      });
    },
    [],
  );
  const loadedVersions = useMemo(
    () => versionsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [versionsQuery.data],
  );
  const restoreOperation = useRef<{
    versionId: string;
    operationId: string;
  } | null>(null);
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const selectVersion = useCallback(
    (versionId: string | null) => {
      const nextParams = new URLSearchParams(searchParams);
      if (versionId) nextParams.set("version", versionId);
      else nextParams.delete("version");
      setSearchParams(nextParams, { replace: versionId === null });
    },
    [searchParams, setSearchParams],
  );
  const navigateVersion = useCallback(
    async (direction: "older" | "newer") => {
      if (!selectedVersionId) return;
      setVersionNavigation({ direction, targetVersionId: null });
      const index = loadedVersions.findIndex(
        (version) => version.id === selectedVersionId,
      );
      const cached = loadedVersions[index + (direction === "older" ? 1 : -1)];
      if (cached) {
        setVersionNavigation({
          direction,
          targetVersionId: cached.id,
        });
        selectVersion(cached.id);
        return;
      }
      try {
        const response = await api<{
          version: VersionWithPosition | null;
        }>(
          `/api/documents/${doc.id}/versions/${selectedVersionId}/neighbor?direction=${direction}`,
        );
        if (response.version) {
          setVersionNavigation({
            direction,
            targetVersionId: response.version.id,
          });
          selectVersion(response.version.id);
        } else {
          setVersionNavigation(null);
        }
      } catch (error) {
        setVersionNavigation(null);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not navigate version history",
        );
      }
    },
    [doc.id, loadedVersions, selectVersion, selectedVersionId],
  );

  useEffect(
    () => () => {
      previewDocument?.destroy();
    },
    [previewDocument],
  );

  useEffect(() => {
    if (
      selectedVersionId &&
      versionQuery.isError &&
      versionQuery.error instanceof ApiError &&
      versionQuery.error.status === 404
    ) {
      selectVersion(null);
      toast.info("That saved version is no longer available", {
        description: "You are back in the current document.",
      });
    }
  }, [
    selectedVersionId,
    selectVersion,
    versionQuery.error,
    versionQuery.isError,
  ]);

  useEffect(() => {
    if (!selectedVersionId) return;
    function handleHistoryKeydown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]',
        )
      ) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        selectVersion(null);
        return;
      }

      const delta =
        event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
      if (!delta || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      void navigateVersion(delta > 0 ? "older" : "newer");
    }
    window.addEventListener("keydown", handleHistoryKeydown);
    return () => window.removeEventListener("keydown", handleHistoryKeydown);
  }, [loadedVersions, selectVersion, selectedVersionId, navigateVersion]);

  const [syncError, setSyncError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [retryingSync, setRetryingSync] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [handToolActive, setHandToolActive] = useState(false);
  const [initialView] = useState(() => {
    try {
      const stored = window.localStorage.getItem(`synodos:zoom:${doc.id}`);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (typeof parsed === "number" && parsed >= 0.25 && parsed <= 3) {
          return { zoom: parsed, mode: "manual" as const };
        }
        if (
          parsed &&
          typeof parsed === "object" &&
          "zoom" in parsed &&
          typeof parsed.zoom === "number" &&
          parsed.zoom >= 0.25 &&
          parsed.zoom <= 3 &&
          "mode" in parsed &&
          ["manual", "fit-width", "fit-page"].includes(String(parsed.mode))
        ) {
          return {
            zoom: parsed.zoom,
            mode: parsed.mode as "manual" | "fit-width" | "fit-page",
          };
        }
      }
    } catch (error) {
      console.warn("Could not read document zoom:", error);
    }
    return {
      zoom:
        typeof window !== "undefined" && window.innerWidth < 794
          ? Math.max(0.25, (window.innerWidth - 32) / 794)
          : 1,
      mode:
        typeof window !== "undefined" && window.innerWidth < 794
          ? ("fit-width" as const)
          : ("manual" as const),
    };
  });
  const initialZoom = initialView.zoom;
  const zoomModeRef = useRef(initialView.mode);
  const zoomRef = useRef(initialZoom);
  const pendingZoomRef = useRef(initialZoom);
  const zoomFrameRef = useRef<number | null>(null);
  const canvasNodeRef = useRef<HTMLElement | null>(null);
  const [canvasElement, setCanvasElement] = useState<HTMLElement | null>(null);
  const canvasRef = useCallback((element: HTMLElement | null) => {
    canvasNodeRef.current = element;
    setCanvasElement(element);
  }, []);
  const pageTitleMap = provider.document.getMap<string>("pageMetadata");

  useEffect(() => {
    setZoom(initialZoom);
    return () => {
      setZoom(1);
    };
  }, [initialZoom]);

  const { savedLocally, clear } = useOfflinePersistence(
    provider.document,
    doc.id,
    userId,
  );
  const isOwner = canManageMembers(doc.role);
  const { data: members, isPending: membersPending } = useDocumentMembers(
    doc.id,
    true,
  );
  const { data: sharing } = useDocumentSharing(doc.id, isOwner);
  const users = usePresence(userId);
  const currentUsersRef = useRef(users);
  const { preferences: collaborationPreferences } =
    useNotificationPreferences();
  const previousOnlineUsers = useRef<Set<string>>(new Set());
  const previousMemberIds = useRef<Set<string>>(new Set());
  const previousRequestIds = useRef<Set<string>>(new Set());
  const initializedPresence = useRef(false);
  const initializedMembers = useRef(false);
  const initializedRequests = useRef(false);
  const handledLostAccess = useRef(false);
  const suppressReconnectPresence = useRef(false);
  const removedUserIds = useRef(new Set<string>());

  const queryClient = useQueryClient();

  useEffect(() => scheduleSoundPreload(), []);
  useEffect(() => {
    setNotificationCurrentUser(userId);
    return () => setNotificationCurrentUser(undefined);
  }, [userId]);

  const handleAccessLost = useCallback(() => {
    if (handledLostAccess.current) return;
    handledLostAccess.current = true;
    queryClient.removeQueries({
      queryKey: ["document-versions", doc.id],
    });
    toast.warning("You have been removed", {
      id: `document-access-removed-${doc.id}`,
      description: "You have been removed from this document room.",
    });
    navigate("/dashboard/overview", { replace: true });
  }, [doc.id, navigate, queryClient]);

  useEffect(() => {
    currentUsersRef.current = users;
  }, [users]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const previousCursors = new Map<number, string>();
    const onAwarenessUpdate = () => {
      const states = awareness.getStates();

      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID || !state.cursor) {
          previousCursors.delete(clientId);
          return;
        }

        const cursorState = JSON.stringify(state.cursor);
        if (previousCursors.get(clientId) === cursorState) return;

        previousCursors.set(clientId, cursorState);
        if (typeof state.user?.id === "string") {
          showActiveCollaborationCursors(state.user.id);
        }
      });

      for (const clientId of previousCursors.keys()) {
        if (!states.has(clientId)) previousCursors.delete(clientId);
      }
    };

    awareness.on("update", onAwarenessUpdate);
    return () => {
      awareness.off("update", onAwarenessUpdate);
    };
  }, [provider]);

  useHocuspocusEvent("authenticationFailed", ({ reason }) => {
    console.warn("Collab authentication failed:", reason);
    setSyncError(reason);
    setRetryingSync(false);
  });
  useHocuspocusEvent("authenticated", () => {
    setSyncError(null);
    setRetryingSync(false);
    void queryClient.invalidateQueries({
      queryKey: documentKeys.detail(doc.id),
    });
  });
  useHocuspocusEvent("stateless", ({ payload }) => {
    let message: unknown;
    try {
      message = JSON.parse(payload);
    } catch {
      return;
    }
    const documentDeleted = documentDeletedMessageSchema.safeParse(message);
    if (documentDeleted.success && documentDeleted.data.documentId === doc.id) {
      toast.warning("Document deleted", {
        id: `document-deleted-${doc.id}`,
        description: "This document was deleted by its owner.",
      });
      void clear().catch((error) => {
        console.error("Could not clear the deleted offline document:", error);
      });
      navigate("/dashboard/overview", { replace: true });
      queryClient.removeQueries({
        queryKey: ["document-versions", doc.id],
      });
      return;
    }
    const restored = documentRestoredMessageSchema.safeParse(message);
    if (restored.success) {
      void queryClient.invalidateQueries({
        queryKey: ["document-versions", doc.id],
      });
      toast.info("This document was restored", {
        description: `${restored.data.actorName} restored an earlier version. Your current view has not changed.`,
      });
      return;
    }
    const parsed = memberRemovedMessageSchema.safeParse(message);
    if (parsed.success) {
      const removedUserId = parsed.data.userId;
      if (removedUserId !== userId) {
        removedUserIds.current.add(removedUserId);
        return;
      }

      handleAccessLost();
      return;
    }

    const roleChange = memberRoleChangedMessageSchema.safeParse(message);
    if (!roleChange.success || roleChange.data.userId !== userId) return;

    const roleLabel = roleChange.data.role === "editor" ? "Editor" : "Viewer";
    queryClient.setQueryData<DocumentSummary>(
      documentKeys.detail(doc.id),
      (current) =>
        current ? { ...current, role: roleChange.data.role } : current,
    );
    queryClient.setQueryData<DocumentSummary[]>(
      documentKeys.list(),
      (current) =>
        current?.map((document) =>
          document.id === doc.id
            ? { ...document, role: roleChange.data.role }
            : document,
        ),
    );
    queryClient.setQueryData<DocumentMember[]>(
      documentKeys.members(doc.id),
      (current) =>
        current?.map((member) =>
          member.userId === userId
            ? { ...member, role: roleChange.data.role }
            : member,
        ),
    );
    toast.success(`Your role has changed to ${roleLabel}`);
  });

  const lostAccess = syncError === "Forbidden";
  const editable = canEdit(doc.role) && !lostAccess;
  const reservedCollaborators = new Set([
    ...(members ?? []).map((member) => member.userId),
    ...(sharing?.invitations ?? []).map((invitation) => invitation.userId),
    ...(sharing?.requests ?? []).map((request) => request.userId),
  ]).size;
  const memberLimitReached = reservedCollaborators >= MAX_DOCUMENT_MEMBERS;

  useEffect(() => {
    if (handledLostAccess.current) return;
    if (membersPending || !members) return;
    if (!provider.synced || suppressReconnectPresence.current) return;
    const onlineIds = new Set(
      users
        .filter((presenceUser) => !presenceUser.isYou)
        .map((user) => user.id),
    );
    if (!initializedPresence.current) {
      if (!users.some((presenceUser) => presenceUser.isYou)) return;

      const timeout = window.setTimeout(() => {
        previousOnlineUsers.current = onlineIds;
        initializedPresence.current = true;
      }, 800);
      return () => window.clearTimeout(timeout);
    }

    for (const onlineUserId of onlineIds) {
      removedUserIds.current.delete(onlineUserId);
      if (previousOnlineUsers.current.has(onlineUserId)) continue;
      const member = members.find((item) => item.userId === onlineUserId);
      if (member) notifyPresenceChange(member, true, doc.id);
    }
    for (const userId of previousOnlineUsers.current) {
      if (onlineIds.has(userId)) continue;
      if (removedUserIds.current.has(userId)) continue;
      const member = members.find((item) => item.userId === userId);
      if (member) notifyPresenceChange(member, false, doc.id);
    }
    previousOnlineUsers.current = onlineIds;
  }, [doc.id, members, membersPending, provider, users]);

  useEffect(() => {
    let baselineTimer: number | undefined;
    const baselineAfterSync = () => {
      window.clearTimeout(baselineTimer);
      baselineTimer = window.setTimeout(() => {
        previousOnlineUsers.current = new Set(
          currentUsersRef.current
            .filter((user) => !user.isYou)
            .map((user) => user.id),
        );
        initializedPresence.current = true;
        suppressReconnectPresence.current = false;
      }, 1000);
    };
    const onStatus = ({ status }: { status: WebSocketStatus }) => {
      if (status === WebSocketStatus.Disconnected) {
        suppressReconnectPresence.current = true;
        window.clearTimeout(baselineTimer);
      }
    };
    provider.on("status", onStatus);
    provider.on("synced", baselineAfterSync);
    if (provider.synced) baselineAfterSync();
    return () => {
      window.clearTimeout(baselineTimer);
      provider.off("status", onStatus);
      provider.off("synced", baselineAfterSync);
    };
  }, [provider]);

  useEffect(() => {
    if (!isOwner || membersPending || !members) return;
    const memberIds = new Set(members.map((member) => member.userId));
    if (!initializedMembers.current) {
      previousMemberIds.current = memberIds;
      initializedMembers.current = true;
      return;
    }
    for (const member of members) {
      if (!previousMemberIds.current.has(member.userId)) {
        notifyMemberJoined(member, doc.id);
      }
    }
    previousMemberIds.current = memberIds;
  }, [doc.id, isOwner, members, membersPending]);

  useEffect(() => {
    if (!sharing) return;
    const requestIds = new Set(sharing.requests.map((request) => request.id));
    if (!initializedRequests.current) {
      previousRequestIds.current = requestIds;
      initializedRequests.current = true;
      return;
    }
    for (const request of sharing.requests) {
      if (!previousRequestIds.current.has(request.id)) {
        notifyAccessRequest(request, doc.id);
      }
    }
    previousRequestIds.current = requestIds;
  }, [doc.id, sharing]);

  useEffect(() => () => dismissNotificationScope(doc.id), [doc.id]);
  useEffect(
    () => () => {
      queryClient.removeQueries({
        queryKey: ["document-versions", doc.id],
      });
    },
    [doc.id, queryClient],
  );

  async function retrySync() {
    setRetryingSync(true);
    try {
      await provider.connect();
    } catch (error) {
      console.error("Could not reconnect to collaboration:", error);
      setSyncError("Connection failed. Please try again.");
      setRetryingSync(false);
    }
  }

  // Access revoked: don't keep a readable local copy around.
  useEffect(() => {
    if (lostAccess) {
      void clear().catch((error) => {
        console.error("Could not clear the offline document copy:", error);
      });
    }
  }, [lostAccess, clear]);

  useEffect(() => {
    if (!lostAccess || handledLostAccess.current) return;
    handleAccessLost();
  }, [handleAccessLost, lostAccess]);

  useEffect(() => {
    document.title = `${doc.title} · Synodos`;
    return () => {
      document.title = "Synodos";
    };
  }, [doc.title]);

  const user = {
    id: userId ?? "anonymous", // `id` lets presence dedupe multiple tabs
    name: session?.user.name ?? "Anonymous",
    avatar: session?.user.image ?? null,
    color: userColor(userId ?? "anonymous"),
  };

  const editor = useEditor(
    {
      editable: editable && !selectedVersionId,
      extensions: createEditorExtensions({
        document: provider.document,
        provider,
        user,
      }),
      editorProps: {
        attributes: {
          class:
            "prose prose-neutral max-w-none text-neutral-950 focus:outline-none " +
            "prose-headings:text-neutral-950 prose-p:text-neutral-800 prose-strong:text-neutral-950 " +
            "prose-code:text-neutral-950 prose-code:before:content-none prose-code:after:content-none",
        },
        scrollThreshold: 80,
        scrollMargin: 80,
      },
    },
    [provider],
  );

  useEffect(() => {
    if (!editor) return;
    editor.commands.updateUser({
      id: userId ?? "anonymous",
      name: session?.user.name ?? "Anonymous",
      avatar: session?.user.image ?? null,
      color: userColor(userId ?? "anonymous"),
    });
  }, [editor, session?.user.image, session?.user.name, userId]);

  useEffect(() => {
    if (!editor) return;
    yUndoPluginKey.getState(editor.state)?.undoManager.addToScope(pageTitleMap);
  }, [editor, pageTitleMap]);

  useEffect(() => {
    if (!editor || !editable || selectedVersionId) return;

    const migration = provider.document.getMap<boolean>("editorMigrations");
    function migratePages() {
      if (!provider.synced || migration.get("explicitPagesV2")) return;

      const nodes: ProseMirrorNode[] = [];
      editor.state.doc.forEach((node) => nodes.push(node));
      const existingPages = nodes.filter((node) => node.type.name === "page");
      const looseContent = nodes.filter((node) => node.type.name !== "page");

      // If all nodes are already page nodes, just mark migrated!
      if (existingPages.length > 0 && looseContent.length === 0) {
        migration.set("explicitPagesV2", true);
        return;
      }

      let pageNodes: ProseMirrorNode[];
      if (existingPages.length === 0) {
        pageNodes = [
          editor.schema.nodes.page.create(
            { title: pageTitleMap.get("root") ?? "" },
            nodes,
          ),
        ];
      } else {
        const meaningfulLooseContent = looseContent.filter(
          (node) => node.textContent.trim() || node.type.name !== "paragraph",
        );
        pageNodes = [...existingPages];
        if (meaningfulLooseContent.length > 0) {
          const firstPage = pageNodes[0];
          pageNodes[0] = firstPage.type.create(
            firstPage.attrs,
            [...meaningfulLooseContent, ...firstPage.content.content],
            firstPage.marks,
          );
        }
      }

      const transaction = editor.state.tr.replaceWith(
        0,
        editor.state.doc.content.size,
        pageNodes,
      );
      editor.view.dispatch(transaction);
      yUndoPluginKey.getState(editor.state)?.undoManager.clear();
      pageTitleMap.delete("root");
      migration.set("explicitPagesV2", true);
    }

    provider.on("synced", migratePages);
    if (provider.synced) migratePages();
    return () => {
      provider.off("synced", migratePages);
    };
  }, [editor, editable, selectedVersionId, pageTitleMap, provider]);

  useEffect(() => {
    const canvas = canvasElement;
    if (!canvas) return;
    const scrollContainer = canvas;
    const initialPaper = canvas.querySelector<HTMLElement>(
      ".editor-paper-frame",
    );
    if (initialPaper) {
      const rect = canvas.getBoundingClientRect();
      applyPaperZoom(canvas, initialPaper, zoomRef.current, zoomRef.current, {
        x: rect.left + canvas.clientWidth / 2,
        y: rect.top + canvas.clientHeight / 2,
      });
    }

    let pinchStartDistance = 0;
    let pinchStartZoom = zoomRef.current;
    let pendingZoomAnchor = { x: 0, y: 0 };
    let wheelFrame: number | null = null;
    let wheelStartedAt = 0;
    let wheelFrom = zoomRef.current;
    let wheelTo = zoomRef.current;
    let wheelAnchor = { x: 0, y: 0 };
    let spacePan = false;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    const clampZoom = (value: number) => Math.min(3, Math.max(0.25, value));
    function scheduleZoom(value: number, anchorX: number, anchorY: number) {
      zoomModeRef.current = "manual";
      pendingZoomRef.current = clampZoom(value);
      pendingZoomAnchor = { x: anchorX, y: anchorY };
      if (zoomFrameRef.current !== null) return;

      zoomFrameRef.current = window.requestAnimationFrame(() => {
        zoomFrameRef.current = null;
        const nextZoom = pendingZoomRef.current;
        const paperFrame = scrollContainer.querySelector<HTMLElement>(
          ".editor-paper-frame",
        );
        if (paperFrame) {
          applyPaperZoom(
            scrollContainer,
            paperFrame,
            zoomRef.current,
            nextZoom,
            pendingZoomAnchor,
          );
        }
        zoomRef.current = nextZoom;
        persistZoom(doc.id, nextZoom, "manual");
        setZoom(nextZoom);
      });
    }
    const distanceBetweenTouches = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const discrete = event.deltaMode === WheelEvent.DOM_DELTA_LINE;
      const next = clampZoom(
        pendingZoomRef.current *
          Math.exp(-event.deltaY * (discrete ? 0.004 : 0.006)),
      );
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!discrete || reducedMotion) {
        scheduleZoom(next, event.clientX, event.clientY);
        return;
      }
      wheelFrom = zoomRef.current;
      wheelTo = next;
      wheelAnchor = { x: event.clientX, y: event.clientY };
      wheelStartedAt = performance.now();
      if (wheelFrame !== null) window.cancelAnimationFrame(wheelFrame);
      const animate = (now: number) => {
        const progress = Math.min(1, (now - wheelStartedAt) / 120);
        const eased = 1 - (1 - progress) ** 3;
        scheduleZoom(
          Math.exp(
            Math.log(wheelFrom) +
              (Math.log(wheelTo) - Math.log(wheelFrom)) * eased,
          ),
          wheelAnchor.x,
          wheelAnchor.y,
        );
        wheelFrame =
          progress < 1 ? window.requestAnimationFrame(animate) : null;
      };
      wheelFrame = window.requestAnimationFrame(animate);
    }
    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 2) return;
      pinchStartDistance = distanceBetweenTouches(event.touches);
      pinchStartZoom = zoomRef.current;
    }
    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2 || !pinchStartDistance) return;
      event.preventDefault();
      const anchorX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const anchorY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      scheduleZoom(
        clampZoom(
          pinchStartZoom *
            Math.pow(
              distanceBetweenTouches(event.touches) / pinchStartDistance,
              1.35,
            ),
        ),
        anchorX,
        anchorY,
      );
    }
    function resetPinch() {
      pinchStartDistance = 0;
    }
    let gestureZoom = zoomRef.current;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureZoom = zoomRef.current;
    };
    const onGestureChange = (event: Event) => {
      const gestureEvent = event as Event & {
        scale: number;
        clientX: number;
        clientY: number;
      };
      event.preventDefault();
      scheduleZoom(
        gestureZoom * gestureEvent.scale,
        gestureEvent.clientX,
        gestureEvent.clientY,
      );
    };
    function isTextEntry(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      if (target.closest('[role="dialog"] input, [role="dialog"] textarea')) {
        return true;
      }
      const editable = target.closest<HTMLElement>('[contenteditable="true"]');
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(editable)
      );
    }
    function isExternalInput(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      if (
        target.closest(
          '[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] [contenteditable="true"]',
        )
      ) {
        return true;
      }
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(
          target.closest('[contenteditable="true"]') &&
          !target.closest(".ProseMirror"),
        )
      );
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.code === "Space" &&
        !isTextEntry(event.target) &&
        !event.repeat
      ) {
        spacePan = true;
        scrollContainer.classList.add("editor-canvas--hand");
        event.preventDefault();
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || isExternalInput(event.target))
        return;
      const direction =
        event.key === "+" || event.key === "=" || event.key === "Add"
          ? 1
          : event.key === "-" || event.key === "Subtract"
            ? -1
            : 0;
      const bounds = scrollContainer.getBoundingClientRect();
      const anchorX = bounds.left + scrollContainer.clientWidth / 2;
      const anchorY = bounds.top + scrollContainer.clientHeight / 2;
      if (direction) {
        event.preventDefault();
        scheduleZoom(
          zoomRef.current * (direction > 0 ? 1.25 : 0.8),
          anchorX,
          anchorY,
        );
      } else if (event.key === "0") {
        event.preventDefault();
        scheduleZoom(1, anchorX, anchorY);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      spacePan = false;
      scrollContainer.classList.toggle("editor-canvas--hand", handToolActive);
    }
    function handleWindowBlur() {
      spacePan = false;
      dragging = false;
      scrollContainer.classList.remove("editor-canvas--dragging");
      scrollContainer.classList.toggle("editor-canvas--hand", handToolActive);
    }
    function pointerDown(event: PointerEvent) {
      if (event.button !== 1 && !spacePan && !handToolActive) return;
      dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      scrollContainer.setPointerCapture(event.pointerId);
      scrollContainer.classList.add("editor-canvas--dragging");
      event.preventDefault();
    }
    function pointerMove(event: PointerEvent) {
      if (!dragging) return;
      scrollContainer.scrollLeft -= event.clientX - pointerX;
      scrollContainer.scrollTop -= event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
    }
    function pointerUp(event: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      scrollContainer.classList.remove("editor-canvas--dragging");
      if (scrollContainer.hasPointerCapture(event.pointerId)) {
        scrollContainer.releasePointerCapture(event.pointerId);
      }
    }
    const paper = scrollContainer.querySelector<HTMLElement>(
      ".editor-paper-frame",
    );
    const sizer = scrollContainer.querySelector<HTMLElement>(
      ".editor-canvas__sizer",
    );
    const onViewportResize = () => {
      const frame = scrollContainer.querySelector<HTMLElement>(
        ".editor-paper-frame",
      );
      if (!frame) return;
      const nextMode = zoomModeRef.current;
      const rect = frame.getBoundingClientRect();
      const oldCenterX = rect.left + scrollContainer.clientWidth / 2;
      const oldCenterY = rect.top + scrollContainer.clientHeight / 2;
      const documentX = (oldCenterX - rect.left) / zoomRef.current;
      const documentY = (oldCenterY - rect.top) / zoomRef.current;
      let nextZoom = zoomRef.current;
      if (nextMode === "fit-width") {
        nextZoom = Math.min(
          3,
          Math.max(0.25, (scrollContainer.clientWidth - 32) / 794),
        );
      } else if (nextMode === "fit-page") {
        nextZoom = Math.min(
          3,
          Math.max(
            0.25,
            Math.min(
              (scrollContainer.clientWidth - 32) / 794,
              (scrollContainer.clientHeight - 48) / 1123,
            ),
          ),
        );
      }
      if (nextMode !== "manual") {
        applyPaperZoom(scrollContainer, frame, zoomRef.current, nextZoom, {
          x: oldCenterX,
          y: oldCenterY,
        });
        zoomRef.current = nextZoom;
        pendingZoomRef.current = nextZoom;
        persistZoom(doc.id, nextZoom, nextMode);
        setZoom(nextZoom);
      } else {
        const updatedRect = frame.getBoundingClientRect();
        const nextCenterX =
          scrollContainer.getBoundingClientRect().left +
          scrollContainer.clientWidth / 2;
        const nextCenterY =
          scrollContainer.getBoundingClientRect().top +
          scrollContainer.clientHeight / 2;
        scrollContainer.scrollLeft +=
          updatedRect.left + documentX * zoomRef.current - nextCenterX;
        scrollContainer.scrollTop +=
          updatedRect.top + documentY * zoomRef.current - nextCenterY;
      }
    };
    const canvasResizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onViewportResize)
        : null;
    canvasResizeObserver?.observe(scrollContainer);
    const observer =
      paper && sizer && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const height = entry.borderBoxSize[0]?.blockSize;
            sizer.style.height = `${(height ?? paper.offsetHeight) * zoomRef.current}px`;
          })
        : null;
    if (paper && observer) observer.observe(paper);

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", resetPinch);
    canvas.addEventListener("touchcancel", resetPinch);
    canvas.addEventListener("gesturestart", onGestureStart, { passive: false });
    canvas.addEventListener("gesturechange", onGestureChange, {
      passive: false,
    });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    return () => {
      if (zoomFrameRef.current !== null) {
        window.cancelAnimationFrame(zoomFrameRef.current);
        zoomFrameRef.current = null;
      }
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", resetPinch);
      canvas.removeEventListener("touchcancel", resetPinch);
      canvas.removeEventListener("gesturestart", onGestureStart);
      canvas.removeEventListener("gesturechange", onGestureChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      if (wheelFrame !== null) window.cancelAnimationFrame(wheelFrame);
      observer?.disconnect();
      canvasResizeObserver?.disconnect();
    };
  }, [canvasElement, doc.id, handToolActive]);

  function handleFooterZoomChange(
    nextZoom: number,
    mode: "manual" | "fit-width" | "fit-page" = "manual",
  ) {
    const clampedZoom = clampZoom(nextZoom);
    const canvas = canvasNodeRef.current;
    const paperFrame = canvas?.querySelector<HTMLElement>(
      ".editor-paper-frame",
    );
    if (canvas && paperFrame) {
      const bounds = canvas.getBoundingClientRect();
      applyPaperZoom(canvas, paperFrame, zoomRef.current, clampedZoom, {
        x: bounds.left + canvas.clientWidth / 2,
        y: bounds.top + canvas.clientHeight / 2,
      });
    }
    zoomRef.current = clampedZoom;
    pendingZoomRef.current = clampedZoom;
    zoomModeRef.current = mode;
    persistZoom(doc.id, clampedZoom, mode);
    setZoom(clampedZoom);
  }

  function handleRestoreVersion() {
    if (!selectedVersionId) return;
    if (restoreOperation.current?.versionId !== selectedVersionId) {
      restoreOperation.current = {
        versionId: selectedVersionId,
        operationId: crypto.randomUUID(),
      };
    }
    restoreVersion.mutate(
      {
        versionId: selectedVersionId,
        operationId: restoreOperation.current.operationId,
      },
      {
        onSuccess: () => {
          restoreOperation.current = null;
          toast.success("Version restored for everyone");
          selectVersion(null);
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError &&
              error.code === "COLLABORATION_UNAVAILABLE"
              ? "The collaboration service is unavailable. The document was not confirmed as restored."
              : error instanceof ApiError && error.code === "DOCUMENT_CHANGED"
                ? "The document changed while restore was starting. Review the live document, then try restoring again."
                : error instanceof Error
                  ? error.message
                  : "The version could not be restored.",
          );
        },
      },
    );
  }

  useEffect(() => {
    editor?.setEditable(editable && !selectedVersionId);
  }, [editor, editable, selectedVersionId]);

  useEffect(() => {
    if (!editor || !provider.awareness) return;

    const awareness = provider.awareness;
    let typingTimeout: number | undefined;

    function setTyping(isTyping: boolean) {
      const localUser = awareness.getLocalState()?.user;
      if (!localUser || typeof localUser !== "object") return;
      if (Boolean(localUser.isTyping) === isTyping) return;

      awareness.setLocalStateField("user", { ...localUser, isTyping });
    }

    function handleEditorUpdate({ transaction }: { transaction: Transaction }) {
      if (!transaction.docChanged || isChangeOrigin(transaction)) return;
      setTyping(true);
      window.clearTimeout(typingTimeout);
      typingTimeout = window.setTimeout(() => setTyping(false), 1500);
    }

    editor.on("update", handleEditorUpdate);
    return () => {
      editor.off("update", handleEditorUpdate);
      window.clearTimeout(typingTimeout);
      setTyping(false);
    };
  }, [editor, provider]);

  if (!editor) {
    return (
      <div
        className="flex h-dvh items-center justify-center bg-background text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading editor</span>
      </div>
    );
  }
  const footerEditor =
    selectedVersionId && previewEditor?.versionId === selectedVersionId
      ? previewEditor.editor
      : editor;

  return (
    <VersionPreviewErrorBoundary
      key={selectedVersionId ?? "live-document"}
      onReturnToLive={() => selectVersion(null)}
    >
      <div className="flex h-dvh flex-col bg-background text-foreground">
        <header className="flex h-14 shrink-0 items-center gap-3 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b border-border/40 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to dashboard"
            className="text-muted-foreground hover:text-foreground"
            nativeButton={false}
            render={<Link to="/dashboard/overview" />}
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <TitleInput
              key={doc.title}
              doc={doc}
              readOnly={!editable || Boolean(selectedVersionId)}
            />
            {selectedVersionId ? (
              <Badge variant="outline" className="font-medium">
                Past version
              </Badge>
            ) : !editable ? (
              <Badge
                variant="secondary"
                className="px-2 font-medium bg-secondary/50 text-secondary-foreground/80 hover:bg-secondary/50"
              >
                View only
              </Badge>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block">
              <PresenceAvatars users={users} />
            </div>
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <div className="h-4 w-px bg-border" />
              <ConnectionStatus savedLocally={savedLocally} />
            </div>
            <ThemeToggle />
            <div className="h-4 w-px bg-border/60" />
            <Button
              variant={sidebarOpen ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs font-medium transition-colors",
                sidebarOpen && "bg-secondary text-foreground",
              )}
              onClick={() => setSidebarOpen((prev) => !prev)}
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              aria-label="Toggle document sidebar"
            >
              <Users className="size-3.5 text-primary" />
              <span className="font-semibold">{users.length}</span>
              <PanelRight
                className={cn(
                  "size-3.5 transition-transform",
                  !sidebarOpen && "opacity-60",
                )}
              />
            </Button>

            {canManageMembers(doc.role) && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="inline-flex"
                      tabIndex={memberLimitReached ? 0 : undefined}
                      aria-label={
                        memberLimitReached
                          ? `Maximum of ${MAX_DOCUMENT_MEMBERS} collaborators reached`
                          : undefined
                      }
                    />
                  }
                >
                  <Button
                    className="h-8"
                    onClick={() => setInviteDialogOpen(true)}
                    disabled={memberLimitReached}
                  >
                    <UserPlus className="size-4" />
                    Invite
                  </Button>
                </TooltipTrigger>
                {memberLimitReached && (
                  <TooltipContent>
                    Maximum of {MAX_DOCUMENT_MEMBERS} collaborators per
                    document, including the owner and pending invitations or
                    requests.
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        </header>

        {inviteDialogOpen && (
          <InviteMemberDialog
            doc={doc}
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
          />
        )}

        {syncError && (
          <SyncErrorBanner
            reason={syncError}
            retrying={retryingSync}
            localCopyAvailable={savedLocally}
            onRetry={() => void retrySync()}
          />
        )}

        <EditorToolbar
          editor={footerEditor}
          disabled={!editable || Boolean(selectedVersionId)}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/30 dark:bg-[#111113]">
          <main
            ref={canvasRef}
            className={cn(
              "editor-canvas relative flex-1 overflow-y-auto overflow-x-auto",
              handToolActive && "editor-canvas--hand",
            )}
            style={{ ["--zoom" as string]: String(initialZoom) }}
          >
            {selectedVersionId && (
              <div
                role="status"
                aria-live="polite"
                className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2 text-center text-sm font-medium text-foreground"
              >
                <Clock3 className="size-4" aria-hidden="true" />
                You are viewing a past version, not the live document.
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => selectVersion(null)}
                >
                  Back to current document
                </Button>
              </div>
            )}
            {selectedVersionId && versionQuery.isPending && (
              <div className="absolute inset-x-0 top-16 z-20 flex justify-center">
                <div
                  role="status"
                  className="rounded-lg border bg-background p-3 text-sm shadow"
                >
                  <Loader2
                    className="mr-2 inline size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading saved version…
                </div>
              </div>
            )}
            {selectedVersionId &&
              (previewSnapshot?.error || versionQuery.isError) &&
              !(
                versionQuery.error instanceof ApiError &&
                versionQuery.error.status === 404
              ) && (
                <div
                  role="alert"
                  className="absolute inset-x-4 top-16 z-20 mx-auto max-w-lg rounded-lg border border-destructive/30 bg-background p-4 text-sm shadow"
                >
                  <p className="font-medium">
                    This version could not be previewed.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {previewSnapshot?.error?.message ??
                      (versionQuery.error instanceof Error
                        ? versionQuery.error.message
                        : "Try again or return to the current document.")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void versionQuery.refetch()}
                    >
                      Try again
                    </Button>
                    <Button size="sm" onClick={() => selectVersion(null)}>
                      Return to current document
                    </Button>
                  </div>
                </div>
              )}
            {selectedVersionId &&
              versionQuery.data &&
              !previewSnapshot?.error && (
                <VersionPreviewPanel
                  version={versionQuery.data}
                  role={doc.role}
                  position={versionQuery.data.position}
                  total={versionQuery.data.total}
                  canOlder={
                    versionQuery.data.position < versionQuery.data.total
                  }
                  canNewer={versionQuery.data.position > 1}
                  loadingDirection={
                    !versionQuery.isError &&
                    versionNavigation &&
                    (versionNavigation.targetVersionId === null ||
                      (versionNavigation.targetVersionId ===
                        selectedVersionId &&
                        previewEditor?.versionId !== selectedVersionId))
                      ? versionNavigation.direction
                      : null
                  }
                  activeCollaborators={
                    users.filter((user) => !user.isYou).length
                  }
                  onPrevious={() => void navigateVersion("older")}
                  onNext={() => void navigateVersion("newer")}
                  onBack={() => selectVersion(null)}
                  onRestore={handleRestoreVersion}
                  restoring={restoreVersion.isPending}
                />
              )}
            <div className="editor-canvas__stage">
              <div
                className="editor-canvas__sizer"
                style={{
                  width: `${794 * initialZoom}px`,
                  height: `${1123 * initialZoom}px`,
                }}
              >
                <div
                  className="editor-paper-frame"
                  style={{
                    transform: `scale(${initialZoom})`,
                    transformOrigin: "0 0",
                  }}
                >
                  <div
                    className={cn(
                      "editor-document text-neutral-950",
                      collaborationPreferences.alwaysShowCursor &&
                        "always-show-collaboration-cursor",
                    )}
                  >
                    <div hidden={Boolean(selectedVersionId)}>
                      <EditorContent editor={editor} />
                    </div>
                    {selectedVersionId && previewDocument ? (
                      <VersionPreviewEditor
                        key={selectedVersionId}
                        document={previewDocument}
                        versionId={selectedVersionId}
                        onEditorChange={handlePreviewEditorChange}
                      />
                    ) : (
                      <AddPageButton editor={editor} editable={editable} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {sidebarOpen && (
            <EditorSidebar
              doc={doc}
              role={doc.role}
              users={users}
              editor={editor}
              selectedVersionId={selectedVersionId}
              onSelectVersion={selectVersion}
              onClose={() => setSidebarOpen(false)}
              className="fixed inset-y-14 right-0 z-30 w-full sm:static sm:inset-auto sm:w-80 md:w-88 border-l border-border/50 shrink-0 shadow-lg sm:shadow-none"
            />
          )}
        </div>
        <EditorPagesFooter
          editor={footerEditor}
          onZoomChange={handleFooterZoomChange}
          handToolActive={handToolActive}
          onToggleHandTool={() => setHandToolActive((active) => !active)}
        />
      </div>
    </VersionPreviewErrorBoundary>
  );
}
