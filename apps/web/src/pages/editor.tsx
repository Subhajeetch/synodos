import { useParams } from "react-router";

export function EditorPage() {
  const { id } = useParams();
  return <div className="p-8">Editor for document {id} (coming soon)</div>;
}