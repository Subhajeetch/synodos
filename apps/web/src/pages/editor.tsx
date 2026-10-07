import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
} from "@hocuspocus/provider-react";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Loader2,
  UserRoundPlus,
} from "lucide-react";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { FullPageSpinner } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import {
  documentKeys,
  useAcceptDocumentInvitation,
  useDocument,
  useDocumentAccessStatus,
  useRequestDocumentAccess,
} from "@/hooks/use-documents";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { COLLAB_URL, getCollabToken } from "@/lib/collab";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isPending, error, refetch } = useDocument(id);
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const documentMissing = error instanceof ApiError && error.status === 404;
  const access = useDocumentAccessStatus(id, documentMissing);
  const previousAccessStatus = useRef(access.data?.status);
  const requestAccess = useRequestDocumentAccess(id ?? "", {
    name: session?.user.name ?? null,
    email: session?.user.email ?? "Your account",
    image: session?.user.image ?? null,
  });
  const acceptInvitation = useAcceptDocumentInvitation(id ?? "");

  useEffect(() => {
    if (
      previousAccessStatus.current === "requested" &&
      access.data?.status === "none"
    ) {
      void refetch();
    }
    previousAccessStatus.current = access.data?.status;
  }, [access.data?.status, refetch]);

  // The dashboard's cached list is stale after editing; refresh it on the way out.
  useEffect(
    () => () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
    },
    [queryClient],
  );

  if (isPending) return <FullPageSpinner />;

  if (!doc) {
    if (documentMissing && access.isPending) return <FullPageSpinner />;

    const statusNotFound =
      access.error instanceof ApiError && access.error.status === 404;
    const accessUnavailable = access.isError && !statusNotFound;
    const status = access.data?.status;

    if (documentMissing && !statusNotFound && !accessUnavailable && !status) {
      return <FullPageSpinner />;
    }

    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        {statusNotFound ? (
          <>
            <h1 className="text-xl font-semibold">Document not found</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              This document may have been deleted or the link may be incorrect.
            </p>
          </>
        ) : accessUnavailable ? (
          <>
            <h1 className="text-xl font-semibold">We couldn’t verify access</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {access.error instanceof Error
                ? access.error.message
                : "Please try again. Your document and its access have not been changed."}
            </p>
            <Button
              variant="outline"
              onClick={() => void access.refetch()}
              disabled={access.isFetching}
            >
              {access.isFetching && <Loader2 className="size-4 animate-spin" />}
              Try again
            </Button>
          </>
        ) : status === "invited" ? (
          <>
            <KeyRound className="size-8 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-semibold">You’re invited</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Accept the pending invitation to open and collaborate on this
              document.
            </p>
            <Button
              onClick={() => acceptInvitation.mutate()}
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Accept invitation
            </Button>
          </>
        ) : status === "requested" ? (
          <>
            <Loader2 className="size-8 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-semibold">Request pending</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your request has been sent to the document owner. You’ll be able
              to open the document if they approve it.
            </p>
          </>
        ) : status === "rejected" ? (
          <>
            <h1 className="text-xl font-semibold">Access wasn’t granted</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              The document owner has already reviewed your request. Contact them
              if you think this was a mistake.
            </p>
          </>
        ) : status === "none" ? (
          <>
            <KeyRound
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold">You don’t have permission</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ask the document owner to grant you access. You can return to your
              dashboard at any time.
            </p>
            <Button
              onClick={() => requestAccess.mutate()}
              disabled={requestAccess.isPending}
            >
              {requestAccess.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserRoundPlus className="size-4" />
              )}
              Ask to join
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">
              Couldn’t open this document
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Something went wrong."}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </>
        )}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/dashboard/overview" />}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to dashboard
        </Button>
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
