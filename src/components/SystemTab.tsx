import { useState } from "react";
import { useBodySystems } from "@/hooks/useBodySystems";
import { useDiseasesByBodySystem } from "@/hooks/useDiseasesByBodySystem";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DiseaseCard } from "./DiseaseCard";
import type { BodySystem } from "@/lib/types";

export function SystemTab() {
  const { data: systems, loading: systemsLoading, error: systemsError } = useBodySystems();
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);

  const selectedSystem = systems.find((s) => s.id === selectedSystemId) ?? null;
  const { data: diseases, loading, error } = useDiseasesByBodySystem(selectedSystemId);

  const handleSystemClick = (system: BodySystem) => {
    setSelectedSystemId(system.id);
  };

  const handleBack = () => {
    setSelectedSystemId(null);
  };

  if (systemsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (systemsError) {
    return (
      <div className="text-center py-8 text-destructive text-sm">
        Gagal memuat sistem tubuh: {systemsError}
      </div>
    );
  }

  if (!selectedSystem) {
    return (
      <div className="space-y-3">
        {systems.map((system) => (
          <Card
            key={system.id}
            className="cursor-pointer transition-colors hover:bg-mint/50"
            onClick={() => handleSystemClick(system)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSystemClick(system);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={false}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-base text-ink">{system.nama}</h3>
                  {system.deskripsi && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {system.deskripsi}
                    </p>
                  )}
                </div>
                <svg
                  className="flex-shrink-0 h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Selected system view
  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1 px-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="font-medium">Kembali</span>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-ink truncate">
              Penyakit pada Sistem {selectedSystem.nama}
            </h2>
          </div>
          {selectedSystem.deskripsi && (
            <p className="text-sm text-muted-foreground mt-1">{selectedSystem.deskripsi}</p>
          )}
        </div>
      </div>

      {/* Diseases list */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-destructive text-sm">
              Gagal memuat penyakit: {error}
            </div>
          ) : diseases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-muted-foreground text-sm">
                Tidak ada penyakit pada sistem ini
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
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