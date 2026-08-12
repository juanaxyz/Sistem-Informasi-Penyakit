import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
type System = {
  id: number;
  nama: string;
  slug: string;
  deskripsi?: string | null;
  jumlah_penyakit?: number;
};

interface SystemSelectorCardProps {
  bodyPartId: number | null;
  bodyPartName: string | null;
  systems: System[];
  isLoading: boolean;
  error: Error | null;
  onSelectSystem: (systemId: number) => void;
  onClose: () => void;
}

export function SystemSelectorCard({
  bodyPartId,
  bodyPartName,
  systems,
  isLoading,
  error,
  onSelectSystem,
  onClose,
}: SystemSelectorCardProps) {
  if (bodyPartId === null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-selector-title"
    >
      <div
        className="relative w-full max-w-md bg-background rounded-xl shadow-xl p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-none shadow-none">
          <CardHeader className="p-4 pb-2 flex items-center justify-between">
            <div>
              <CardTitle className="text-lg" id="system-selector-title">
                Pilih Sistem Tubuh
              </CardTitle>

              <p className="text-sm text-muted-foreground mt-0.5">
                {bodyPartName} — {systems.length} sistem ditemukan
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Tutup"
            >
              ✕
            </Button>
          </CardHeader>

          <CardContent className="p-4 pt-0 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <p className="text-destructive text-sm">Gagal memuat sistem</p>

                <p className="text-muted-foreground text-xs max-w-xs">
                  {error.message}
                </p>
              </div>
            ) : systems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Tidak ada sistem tubuh di area ini
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {systems.map((system) => (
                  <Button
                    key={system.id}
                    variant="outline"
                    className="w-full justify-start gap-3 text-left h-auto py-3 px-4"
                    onClick={() => onSelectSystem(system.id)}
                  >
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">
                        {system.nama}
                      </p>

                      {system.deskripsi && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {system.deskripsi}
                        </p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
