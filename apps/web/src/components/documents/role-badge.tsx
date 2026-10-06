import type { DocumentRole } from "@synodos/shared";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<DocumentRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const VARIANTS: Record<DocumentRole, "default" | "secondary"> = {
  owner: "default",
  editor: "secondary",
  viewer: "secondary",
};

export function RoleBadge({ role }: { role: DocumentRole }) {
  return <Badge variant={VARIANTS[role]}>{LABELS[role]}</Badge>;
}
