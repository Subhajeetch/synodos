import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DocumentSummary } from "@synodos/shared";
import { api, ApiError } from "@/lib/api";

export const documentKeys = {
  all: ["documents"] as const,
  list: () => [...documentKeys.all, "list"] as const,
  detail: (id: string) => [...documentKeys.all, "detail", id] as const,
  members: (id: string) => [...documentKeys.all, "members", id] as const,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function useDocuments() {
  return useQuery({
    queryKey: documentKeys.list(),
    queryFn: () => api<DocumentSummary[]>("/api/documents"),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: documentKeys.detail(id ?? ""),
    queryFn: () => api<DocumentSummary>(`/api/documents/${id}`),
    enabled: Boolean(id),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string }) =>
      api<DocumentSummary>("/api/documents", { method: "POST", json: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRenameDocument({ silent = false }: { silent?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api<DocumentSummary>(`/api/documents/${id}`, {
        method: "PATCH",
        json: { title },
      }),
    onSuccess: (_doc, { id }) => {
      if (!silent) toast.success("Document renamed");
      void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
      void queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      toast.success("Document deleted");
      // Remove it from the cached list immediately, then confirm with a refetch.
      queryClient.setQueryData<DocumentSummary[]>(documentKeys.list(), (old) =>
        old?.filter((d) => d.id !== id),
      );
      queryClient.removeQueries({ queryKey: documentKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export type DocumentMember = {
  userId: string;
  name: string;
  email: string;
  role: "editor" | "viewer" | "owner";
};

export function useDocumentMembers(id: string | undefined) {
  return useQuery({
    queryKey: documentKeys.members(id ?? ""),
    queryFn: () => api<DocumentMember[]>(`/api/documents/${id}/members`),
    enabled: Boolean(id),
  });
}

export function useAddDocumentMember(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: "editor" | "viewer" }) =>
      api<DocumentMember>(`/api/documents/${docId}/members`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () => {
      toast.success("Member added to document");
      void queryClient.invalidateQueries({ queryKey: documentKeys.members(docId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRemoveDocumentMember(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api<void>(`/api/documents/${docId}/members/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Member removed");
      void queryClient.invalidateQueries({ queryKey: documentKeys.members(docId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}