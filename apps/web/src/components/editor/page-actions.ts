import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import { toast } from "sonner";
import { getPageTitleMap } from "./page";

export type PageRange = {
  from: number;
  to: number;
  node: ProseMirrorNode | null;
};

function dispatchPageTransaction(editor: Editor, transaction: Transaction) {
  try {
    editor.view.dispatch(transaction);
    return true;
  } catch (error) {
    console.error("Could not apply page action:", error);
    toast.error("Could not update this page. Please try again.");
    return false;
  }
}

function runPageAction(action: () => boolean) {
  try {
    return action();
  } catch (error) {
    console.error("Could not apply page action:", error);
    toast.error("Could not update this page. Please try again.");
    return false;
  }
}

export function getPageRanges(doc: ProseMirrorNode): PageRange[] {
  const pages: PageRange[] = [];

  doc.forEach((node, offset) => {
    if (node.type.name === "page") {
      pages.push({ from: offset, to: offset + node.nodeSize, node });
    }
  });

  return pages.length > 0
    ? pages
    : [{ from: 0, to: doc.content.size, node: null }];
}

function asPageNode(editor: Editor, page: PageRange): ProseMirrorNode {
  if (page.node) return page.node;

  const content = editor.state.doc.slice(page.from, page.to).content;
  return editor.schema.nodes.page.create(
    {
      title:
        page.from === 0 ? (getPageTitleMap(editor)?.get("root") ?? "") : "",
    },
    content,
  );
}

function replacePages(
  editor: Editor,
  fromIndex: number,
  toIndex: number,
  orderedPages: PageRange[],
) {
  const pages = getPageRanges(editor.state.doc);
  const first = pages[fromIndex];
  const last = pages[toIndex];
  if (!first || !last) return false;

  const replacements = orderedPages.map((page) => asPageNode(editor, page));
  const tr = editor.state.tr.replaceWith(first.from, last.to, replacements);
  tr.setSelection(
    TextSelection.near(
      tr.doc.resolve(Math.min(first.from + 2, tr.doc.content.size)),
    ),
  );
  return dispatchPageTransaction(editor, tr.scrollIntoView());
}

export function addPageAfter(editor: Editor, pageIndex: number) {
  return runPageAction(() => {
    const pages = getPageRanges(editor.state.doc);
    const page = pages[pageIndex];
    if (!page) return false;

    const blankPage = editor.schema.nodes.page.create({ title: "" }, [
      editor.schema.nodes.paragraph.create(),
    ]);
    return dispatchPageTransaction(
      editor,
      editor.state.tr.insert(page.to, blankPage).scrollIntoView(),
    );
  });
}

export function duplicatePage(editor: Editor, pageIndex: number) {
  return runPageAction(() => {
    const pages = getPageRanges(editor.state.doc);
    const page = pages[pageIndex];
    if (!page) return false;

    const copy = asPageNode(editor, page);
    const title = copy.attrs.title;
    const duplicate = copy.type.create(
      { ...copy.attrs, title: title ? `${title} copy` : "" },
      copy.content,
      copy.marks,
    );
    return dispatchPageTransaction(
      editor,
      editor.state.tr.insert(page.to, duplicate).scrollIntoView(),
    );
  });
}

export function deletePage(editor: Editor, pageIndex: number) {
  return runPageAction(() => {
    const pages = getPageRanges(editor.state.doc);
    const page = pages[pageIndex];
    if (!page || pages.length <= 1) return false;

    return dispatchPageTransaction(
      editor,
      editor.state.tr.delete(page.from, page.to).scrollIntoView(),
    );
  });
}

export function movePage(editor: Editor, pageIndex: number, direction: -1 | 1) {
  return runPageAction(() => {
    const pages = getPageRanges(editor.state.doc);
    const adjacentIndex = pageIndex + direction;
    if (!pages[pageIndex] || !pages[adjacentIndex]) return false;

    const startIndex = Math.min(pageIndex, adjacentIndex);
    const endIndex = Math.max(pageIndex, adjacentIndex);
    const selected = pages[pageIndex];
    const adjacent = pages[adjacentIndex];
    const ordered = direction < 0 ? [selected, adjacent] : [adjacent, selected];

    return replacePages(editor, startIndex, endIndex, ordered);
  });
}
