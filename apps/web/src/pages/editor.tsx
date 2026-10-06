import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
} from "@hocuspocus/provider-react";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { FullPageSpinner } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import { documentKeys, useDocument } from "@/hooks/use-documents";
import { ApiError } from "@/lib/api";
import { COLLAB_URL, getCollabToken } from "@/lib/collab";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isPending, error, refetch } = useDocument(id);
  const queryClient = useQueryClient();

  // The dashboard's cached list is stale after editing; refresh it on the way out.
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
    },
    [queryClient],
  );

  if (isPending) return <FullPageSpinner />;

  if (!doc) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">
          {notFound ? "Document not found" : "Couldn't open this document"}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {notFound
            ? "It may have been deleted, or you don't have access to it."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
        <div className="flex gap-2">
          {!notFound && (
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          )}
          <Button nativeButton={false} render={<Link to="/dashboard/overview" />}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <HocuspocusProviderWebsocketComponent url={COLLAB_URL}>
      <HocuspocusRoom name={doc.id} token={getCollabToken}>
        <EditorWorkspace doc={doc} />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}

export default EditorPage;