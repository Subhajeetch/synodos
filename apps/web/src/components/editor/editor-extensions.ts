import type { AnyExtension } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableHeader, TableRow } from "@tiptap/extension-table";
import { Typography } from "@tiptap/extension-typography";
import { Image } from "@tiptap/extension-image";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { Doc } from "yjs";
import { StyledTableCell } from "./table-cell";
import { Page } from "./page";
import { renderCollaborationCursor } from "./collaboration-cursor";

type EditorUser = {
  id: string;
  name: string;
  avatar: string | null;
  color: string;
};

export function createEditorExtensions({
  document,
  provider,
  user,
}: {
  document: Doc;
  provider?: HocuspocusProvider;
  user?: EditorUser;
}) {
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      undoRedo: false,
      trailingNode: false,
      heading: { levels: [1, 2, 3, 4] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => {
          try {
            return ["http:", "https:", "mailto:"].includes(
              new URL(url, "https://synodos.invalid").protocol,
            );
          } catch {
            return false;
          }
        },
      },
    }),
    Placeholder.configure({ placeholder: "Start writing…" }),
    CharacterCount,
    TextStyleKit,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    StyledTableCell,
    Typography,
    Image.configure({ allowBase64: false }),
    Page.configure({ titleMap: document.getMap<string>("pageMetadata") }),
    Collaboration.configure({ document }),
  ];

  if (provider && user) {
    extensions.push(
      CollaborationCaret.configure({
        provider,
        user,
        render: renderCollaborationCursor,
      }),
    );
  }

  return extensions;
}
