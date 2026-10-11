import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { DocumentGrid } from "@/components/documents/document-grid";
import { DashboardCollaboration } from "@/components/documents/dashboard-collaboration";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocuments } from "@/hooks/use-documents";

export default function OverviewPage() {
  const { data, isPending, isError, error, refetch } = useDocuments();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "shared" ? "shared" : "mine";

  const { mine, shared } = useMemo(() => {
    const docs = data ?? [];
    return {
      mine: docs.filter((d) => d.role === "owner"),
      shared: docs.filter((d) => d.role !== "owner"),
    };
  }, [data]);

  const activeDocs = tab === "shared" ? shared : mine;
  const isShared = tab === "shared";

  const handleTabChange = (value: string) => {
    if (value === "shared") {
      setParams({ tab: "shared" });
    } else {
      setParams({});
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documents</h1>
        <p className="text-muted-foreground">Create, manage and collaborate on documents</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="h-9 w-full justify-start bg-muted/50 p-1 sm:w-auto">
            <TabsTrigger value="mine" className="flex items-center gap-2 rounded-sm px-4 text-xs">
              My Documents
              {!isPending && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">{mine.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2 rounded-sm px-4 text-xs">
              Shared with me
              {!isPending && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">{shared.length}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled
          />
        </div>
      </div>

      <div>
        {isError ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 rounded-xl border border-border/50 bg-card/40 px-6 py-16 text-center shadow-sm">
            <p className="font-medium text-foreground">Couldn't load your documents</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button variant="outline" onClick={() => void refetch()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : (
          <DashboardCollaboration>
            <DocumentGrid
              docs={activeDocs}
              isPending={isPending}
              emptyTitle={isShared ? "Nothing shared with you" : "No documents yet"}
              emptyHint={
                isShared
                  ? "Documents other people invite you to will appear here."
                  : "Create your first document to start writing."
              }
            />
          </DashboardCollaboration>
        )}
      </div>
    </div>
  );
}
