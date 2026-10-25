import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  DocumentVersionPage,
  DocumentVersionSnapshot,
  DocumentVersionSummary,
} from "@synodos/shared";
import { api } from "@/lib/api";

export const versionKeys = {
  all: (documentId: string) => ["document-versions", documentId] as const,
  list: (documentId: string) =>
    [...versionKeys.all(documentId), "list"] as const,
  detail: (documentId: string, versionId: string) =>
    [...versionKeys.all(documentId), "detail", versionId] as const,
};

export function useDocumentVersions(documentId: string) {
  return useInfiniteQuery({
    queryKey: versionKeys.list(documentId),
    queryFn: ({ pageParam }) =>
      api<DocumentVersionPage>(
        `/api/documents/${documentId}/versions${pageParam ? `?cursor=${pageParam}` : ""}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(documentId),
  });
}

export function useDocumentVersion(
  documentId: string,
  versionId: string | null,
) {
  return useQuery({
    queryKey: versionKeys.detail(documentId, versionId ?? ""),
    queryFn: () =>
      api<DocumentVersionSnapshot>(
        `/api/documents/${documentId}/versions/${versionId}`,
      ),
    enabled: Boolean(documentId && versionId),
    retry: false,
  });
}

export function useCreateDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) =>
      api<DocumentVersionSummary>(`/api/documents/${documentId}/versions`, {
        method: "POST",
        json: { label },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: versionKeys.all(documentId) }),
  });
}

export function useRenameDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, label }: { versionId: string; label: string }) =>
      api<DocumentVersionSummary>(
        `/api/documents/${documentId}/versions/${versionId}`,
        { method: "PATCH", json: { label } },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: versionKeys.all(documentId) }),
  });
}

export function useRestoreDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
      operationId,
    }: {
      versionId: string;
      operationId: string;
    }) =>
      api<{ status: "restored" | "already-restored"; versionId: string }>(
        `/api/documents/${documentId}/versions/${versionId}/restore`,
        { method: "POST", json: { operationId } },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: versionKeys.all(documentId),
      });
      await queryClient.invalidateQueries({
        queryKey: ["documents", "detail", documentId],
      });
    },
  });
}
