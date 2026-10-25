import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { DocumentSummary } from "@synodos/shared";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentCard } from "./document-card";

type Props = {
  docs: DocumentSummary[];
  isPending: boolean;
  emptyTitle: string;
  emptyHint: string;
  emptyAction?: ReactNode;
};

const GRID = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function DocumentGrid({
  docs,
  isPending,
  emptyTitle,
  emptyHint,
  emptyAction,
}: Props) {
  if (isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="relative flex h-[164px] flex-col overflow-hidden rounded-xl border border-border/40 bg-card/30 p-5 shadow-sm"
          >
            <div className="absolute inset-x-0 top-0 h-1 w-full bg-muted" />
            <div className="mb-5 flex items-start justify-between gap-4 mt-1">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <Empty className="min-h-[50vh] rounded-xl border border-dashed border-border bg-card/20 shadow-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-primary/10 text-primary">
            <FileText className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-xl font-semibold tracking-tight">
            {emptyTitle}
          </EmptyTitle>
          <EmptyDescription className="text-base text-muted-foreground max-w-sm mx-auto">
            {emptyHint}
          </EmptyDescription>
        </EmptyHeader>
        {emptyAction && (
          <EmptyContent className="mt-4">{emptyAction}</EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className={GRID}>
      {docs.map((doc) => (
        <DocumentCard key={doc.id} doc={doc} />
      ))}
    </div>
  );
}
