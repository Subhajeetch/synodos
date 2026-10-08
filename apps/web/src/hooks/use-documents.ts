import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createElement } from "react";
import { toast } from "sonner";
import { PersonToast } from "@/components/ui/person-toast";
import {
  getNotificationPreferences,
  playPresenceSound,
} from "@/hooks/use-notification-preferences";
import type {
  DocumentAccessStatus,
  DocumentInvitation,
  DocumentJoinRequest,
  DocumentMember as SharedDocumentMember,
  DocumentSharingOverview,
  DocumentSummary,
} from "@synodos/shared";
import { api, ApiError } from "@/lib/api";

export const documentKeys = {
  all: ["documents"] as const,
  list: () => [...documentKeys.all, "list"] as const,
  detail: (id: string) => [...documentKeys.all, "detail", id] as const,
  members: (id: string) => [...documentKeys.all, "members", id] as const,
  sharing: (id: string) => [...documentKeys.all, "sharing", id] as const,
  access: (id: string) => [...documentKeys.all, "access", id] as const,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function notifyPresenceChange(
  person: { name: string | null; email: string; image: string | null },
  online: boolean,
) {
  const name = person.name || person.email;
  playPresenceSound(online);
  notifyPerson(
    person,
    online ? `${name} joined` : `${name} left`,
    online ? "is now active in this document." : "is no longer active.",
    online ? "success" : "info",
  );
}

export function notifyMemberJoined(person: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  const name = person.name || person.email;
  notifyPerson(
    person,
    `${name} joined the document`,
    "They now have access to this document.",
    "success",
  );
}

function invalidateSharing(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
) {
  void queryClient.invalidateQueries({ queryKey: documentKeys.sharing(id) });
  void queryClient.invalidateQueries({ queryKey: documentKeys.members(id) });
  void queryClient.invalidateQueries({ queryKey: documentKeys.list() });
}

function notifyPerson(
  person: { name: string | null; email: string; image: string | null },
  title: string,
  detail: string,
  tone: "success" | "info" | "warning" | "error",
) {
  if (!getNotificationPreferences().popupEnabled) return;

  toast.custom(
    () =>
      createElement(PersonToast, {
        name: person.name || person.email,
        image: person.image,
        title,
        detail,
        tone,
      }),
    { duration: 4500 },
  );
}

export function notifyAccessRequest(person: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  notifyPerson(
    person,
    "Access requested",
    `${person.name || person.email} asked to join this document.`,
    "info",
  );
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
    refetchInterval: (query) => (query.state.data ? 5_000 : false),
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

export function useRenameDocument({
  silent = false,
}: { silent?: boolean } = {}) {
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

export type DocumentMember = SharedDocumentMember;

export function useDocumentMembers(id: string | undefined, refresh = false) {
  return useQuery({
    queryKey: documentKeys.members(id ?? ""),
    queryFn: () => api<DocumentMember[]>(`/api/documents/${id}/members`),
    enabled: Boolean(id),
    refetchInterval: refresh ? 10_000 : false,
  });
}

export function useDocumentSharing(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: documentKeys.sharing(id ?? ""),
    queryFn: () => api<DocumentSharingOverview>(`/api/documents/${id}/sharing`),
    enabled: Boolean(id) && enabled,
    refetchInterval: enabled ? 10_000 : false,
  });
}

export function useDocumentAccessStatus(
  id: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: documentKeys.access(id ?? ""),
    queryFn: () =>
      api<DocumentAccessStatus>(`/api/documents/${id}/access-status`),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) =>
      query.state.data?.status === "requested" ||
      query.state.data?.status === "invited"
        ? 5_000
        : false,
    retry: false,
  });
}

export function useAddDocumentInvitation(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: "editor" | "viewer" }) =>
      api<DocumentInvitation>(`/api/documents/${docId}/invitations`, {
        method: "POST",
        json: input,
      }),
    onSuccess: (invitation) => {
      notifyPerson(
        invitation,
        "Invitation sent",
        `${invitation.email} is invited as ${invitation.role}.`,
        "success",
      );
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useAcceptDocumentInvitation(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{
        status: "accepted" | "already-member";
        member: DocumentMember;
      }>(`/api/documents/${docId}/invitations/accept`, { method: "POST" }),
    onSuccess: ({ status, member }) => {
      if (status === "accepted") {
        notifyPerson(
          member,
          "Invitation accepted",
          "You joined the document.",
          "success",
        );
      }
      void queryClient.invalidateQueries({
        queryKey: documentKeys.detail(docId),
      });
      void queryClient.invalidateQueries({
        queryKey: documentKeys.access(docId),
      });
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRequestDocumentAccess(
  docId: string,
  person: { name: string | null; email: string; image: string | null },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ status: "requested" }>(`/api/documents/${docId}/join-requests`, {
        method: "POST",
      }),
    onSuccess: () => {
      notifyPerson(
        person,
        "Access request sent",
        "The document owner will review your request.",
        "info",
      );
      void queryClient.invalidateQueries({
        queryKey: documentKeys.access(docId),
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useApproveJoinRequest(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; role: "editor" | "viewer" }) =>
      api<DocumentMember>(
        `/api/documents/${docId}/join-requests/${input.requestId}/approve`,
        { method: "POST", json: { role: input.role } },
      ),
    onSuccess: () => {
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRejectJoinRequest(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: DocumentJoinRequest) =>
      api<void>(`/api/documents/${docId}/join-requests/${request.id}`, {
        method: "DELETE",
      }),
    onSuccess: (_result, request) => {
      notifyPerson(
        request,
        "Access request declined",
        "Access to this document was declined.",
        "warning",
      );
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRevokeDocumentInvitation(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitation: DocumentInvitation) =>
      api<void>(`/api/documents/${docId}/invitations/${invitation.id}`, {
        method: "DELETE",
      }),
    onSuccess: (_result, invitation) => {
      notifyPerson(
        invitation,
        "Invitation revoked",
        `The invitation for ${invitation.email} was revoked.`,
        "info",
      );
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRemoveDocumentMember(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (member: DocumentMember) =>
      api<void>(`/api/documents/${docId}/members/${member.userId}`, {
        method: "DELETE",
      }),
    onSuccess: (_result, member) => {
      notifyPerson(
        member,
        "Collaborator removed",
        "Access to this document was removed.",
        "warning",
      );
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateDocumentMemberRole(docId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: "editor" | "viewer" }) =>
      api<{ userId: string; role: "editor" | "viewer" }>(
        `/api/documents/${docId}/members/${input.userId}`,
        { method: "PATCH", json: { role: input.role } },
      ),
    onSuccess: ({ role }) => {
      toast.success(`Collaborator role changed to ${role}`);
      invalidateSharing(queryClient, docId);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
