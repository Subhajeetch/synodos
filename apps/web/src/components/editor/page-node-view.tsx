import { useEffect } from "react";
import { NodeViewContent, NodeViewWrapper, useEditorState } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { getPageRanges } from "./page-actions";
import { PageControls } from "./page-controls";

export function PageNodeView({
  editor,
  node,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const pageState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const position = getPos();
      if (typeof position !== "number") return { index: -1, count: 0 };
      const pages = getPageRanges(currentEditor.state.doc);
      return { index: pages.findIndex((page) => page.from === position), count: pages.length };
    },
    equalityFn: (a, b) =>
      a === b || (!!a && !!b && a.index === b.index && a.count === b.count),
  });

  useEffect(() => {
    const position = getPos();
    if (typeof position !== "number") return;
    const nodeDOM = editor.view.nodeDOM(position);
    if (!(nodeDOM instanceof HTMLElement)) return;
    const wrapper = nodeDOM;
    const content = wrapper?.querySelector<HTMLElement>(".editor-page-content");
    if (!wrapper || !content || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      wrapper.classList.toggle(
        "editor-page-node--overflow",
        content.scrollHeight > 1123,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [editor, getPos, node]);

  return (
    <NodeViewWrapper as="section" data-page="" className="editor-page-node">
      <PageControls
        editor={editor}
        pageIndex={pageState.index < 0 ? 0 : pageState.index}
        title={String(node.attrs.title ?? "")}
        onTitleChange={(title) => updateAttributes({ title })}
        editable={editor.isEditable}
      />
      <div className="editor-page-surface">
        <NodeViewContent className="editor-page-content" />
      </div>
    </NodeViewWrapper>
  );
}
