import { useState } from "react";
import { updateDocumentSchema, type DocumentSummary } from "@synodos/shared";
import { Input } from "@/components/ui/input";
import { useRenameDocument } from "@/hooks/use-documents";

type Props = { doc: DocumentSummary; readOnly: boolean };

export function TitleInput({ doc, readOnly }: Props) {
  const [value, setValue] = useState(doc.title);
  const rename = useRenameDocument({ silent: true });

  function commit() {
    const parsed = updateDocumentSchema.safeParse({ title: value });
    if (!parsed.success) {
      setValue(doc.title); // empty or too long: revert
      return;
    }
    if (parsed.data.title === doc.title) {
      setValue(parsed.data.title);
      return;
    }
    rename.mutate(
      { id: doc.id, title: parsed.data.title },
      { onError: () => setValue(doc.title) },
    );
  }

  return (
    <Input
      aria-label="Document title"
      value={value}
      readOnly={readOnly}
      maxLength={200}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="h-9 max-w-[46vw] border-transparent bg-transparent text-base font-medium shadow-none hover:border-input focus-visible:border-ring sm:max-w-md"
    />
  );
}
