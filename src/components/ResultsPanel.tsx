import { useDiseasesByBodyPart } from "@/hooks/useDiseasesByBodyPart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DiseaseCard } from "./DiseaseCard";

interface ResultsPanelProps {
  selectedPartId: number | null;
  selectedPartName: string | null;
}

export function ResultsPanel({ selectedPartId, selectedPartName }: ResultsPanelProps) {
  const { data: diseases, loading, error } = useDiseasesByBodyPart(selectedPartId);

  const refetch = () => {
    // The hook will automatically refetch when selectedPartId changes
    // This is just a visual trigger - the hook handles the actual fetch
    window.dispatchEvent(new Event("resize"));
  };

  return (
    <div className="lg:w-[380px] w-full flex flex-col gap-4">
      {/* Title area */}
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold text-ink flex-1 truncate">
          {selectedPartName ?? "Pilih bagian tubuh"}
        </h2>
      </div>

      {/* Content area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 flex flex-col p-4 pt-4 overflow-y-auto">
          {selectedPartId === null ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <p className="text-muted-foreground text-sm">
                Klik bagian tubuh untuk melihat penyakit terkait
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-3 flex-1">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
              <p className="text-destructive text-sm">Gagal memuat data</p>
              <p className="text-muted-foreground text-xs max-w-xs">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Coba Lagi
              </Button>
            </div>
          ) : diseases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <p className="text-muted-foreground text-sm">
                Tidak ada penyakit terkait bagian ini
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {diseases.map((disease) => (
                <DiseaseCard key={disease.id} disease={disease} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}