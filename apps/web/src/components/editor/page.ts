import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { Map as YMap } from "yjs";
import type { Editor } from "@tiptap/react";
import { PageNodeView } from "./page-node-view";

export function getPageTitleMap(editor: Editor) {
  return editor.extensionManager.extensions.find(
    (extension) => extension.name === "page",
  )?.options.titleMap as YMap<string> | null | undefined;
}

export const Page = Node.create({
  name: "page",
  group: "block",
  content: "block+",
  isolating: true,
  addOptions() {
    return { titleMap: null as YMap<string> | null };
  },

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-page-title") ?? "",
        renderHTML: (attributes) =>
          attributes.title ? { "data-page-title": attributes.title } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-page]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-page": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageNodeView);
  },
});
