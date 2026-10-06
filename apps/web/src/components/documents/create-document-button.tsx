import { LoaderCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useCreateDocument } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";

export function CreateDocumentButton({
  className,
  onCreated,
}: {
  className?: string;
  onCreated?: () => void;
}) {
  const navigate = useNavigate();
  const create = useCreateDocument();

  return (
    <Button
      className={cn(
        "group relative w-full overflow-hidden transition-all duration-300 hover:shadow-md sm:w-auto",
        className
      )}
      disabled={create.isPending}
      onClick={() =>
        create.mutate(
          {},
          {
            onSuccess: (doc) => {
              onCreated?.();
              navigate(`/docs/${doc.id}`);
            },
          },
        )
      }
    >
      <span className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-white/0 dark:via-white/5 dark:to-white/0" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {create.isPending ? <LoaderCircle className="animate-spin size-4" /> : <Plus className="size-4 transition-transform duration-300 group-hover:rotate-90" />}
        New document
      </span>
    </Button>
  );
}
