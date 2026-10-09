import { TableCell } from "@tiptap/extension-table";

export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-cell-background"),
        renderHTML: (attributes) =>
          attributes.backgroundColor
            ? {
                "data-cell-background": attributes.backgroundColor,
                style: `background-color: ${attributes.backgroundColor}`,
              }
            : {},
      },
    };
  },
});
