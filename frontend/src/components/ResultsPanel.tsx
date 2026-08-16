import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bone,
  Brain,
  ChevronRight,
  MousePointerClick,
  Stethoscope,
  Utensils,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useDiseasesByBodyPartAndSystem } from "@/hooks/useDiseasesByBodyPartAndSystem";
import { useSystemsByBodyPart } from "@/hooks/useSystemsByBodyPart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DiseaseCard } from "./DiseaseCard";
import type { SystemRecord } from "@/lib/types";

interface ResultsPanelProps {
  selectedPartId: number | null;
  selectedPartName: string | null;
}

const SYSTEM_ICONS: Record<string, LucideIcon> = {
  "sistem-pernapasan": Wind,
  "sistem-pencernaan": Utensils,
  "sistem-saraf": Brain,
  "sistem-muskuloskeletal": Bone,
};

function systemIcon(system: SystemRecord): ReactNode {
  const Icon = SYSTEM_ICONS[system.slug] ?? Stethoscope;
  return <Icon className="h-5 w-5" aria-hidden="true" />;
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <p className="text-sm text-destructive">Gagal memuat data</p>
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Coba Lagi
      </Button>
    </div>
  );
}

function SystemCard({
  system,
  onClick,
}: {
  system: SystemRecord;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-pine/40 hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:cursor-pointer"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mint text-pine">
        {systemIcon(system)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{system.nama}</span>
        {system.jumlah_penyakit != null ? (
          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
            {system.jumlah_penyakit} penyakit
          </span>
        ) : system.deskripsi ? (
          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
            {system.deskripsi}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-pine"
        aria-hidden="true"
      />
    </button>
  );
}

export function ResultsPanel({
  selectedPartId,
  selectedPartName,
}: ResultsPanelProps) {
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);

  const {
    data: systems = [],
    isLoading: systemsLoading,
    error: systemsError,
    refetch: refetchSystems,
  } = useSystemsByBodyPart(selectedPartId);

  const {
    data: diseaseData,
    isLoading: diseasesLoading,
    error: diseasesError,
    refetch: refetchDiseases,
  } = useDiseasesByBodyPartAndSystem(selectedPartId, selectedSystemId);

  const diseases = diseaseData ?? [];
  const selectedSystem =
    selectedSystemId != null
      ? (systems.find((s) => s.id === selectedSystemId) ?? null)
      : null;

  /* STATE 1 — belum memilih bagian tubuh. */
  if (selectedPartId === null || selectedPartName === null) {
    return (
      <div className="flex flex-col items-start py-6 md:py-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-pine">
          <MousePointerClick className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-2xl md:text-3xl font-medium text-ink">
          Pilih bagian tubuh
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
          Klik area pada peta tubuh untuk melihat sistem tubuh dan penyakit yang
          berkaitan.
        </p>
      </div>
    );
  }

  /* STATE 2 — memilih sistem tubuh. */
  if (selectedSystemId === null) {
    return (
      <div className="flex flex-col gap-6">
        <header className="border-b border-border pb-4">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Bagian tubuh
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium text-ink md:text-3xl">
            {selectedPartName}
          </h2>
        </header>

        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Pilih sistem tubuh
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistem yang berkaitan dengan bagian tubuh ini:
          </p>
        </div>

        {systemsLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : systemsError ? (
          <ErrorState message={systemsError.message} onRetry={refetchSystems} />
        ) : systems.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Belum ada sistem tubuh yang terkait dengan{" "}
            {selectedPartName.toLowerCase()}.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {systems.map((system) => (
              <SystemCard
                key={system.id}
                system={system}
                onClick={() => setSelectedSystemId(system.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* STATE 3 — daftar penyakit pada sistem terpilih. */
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <button
            type="button"
            onClick={() => setSelectedSystemId(null)}
            className="rounded underline underline-offset-2 hover:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {selectedPartName}
          </button>
          <span className="mx-2 opacity-60" aria-hidden="true">
            /
          </span>
          {selectedSystem?.nama ?? "Sistem"}
        </p>
        <h2 className="mt-1 font-display text-2xl font-medium text-ink md:text-3xl">
          {selectedSystem?.nama ?? "Penyakit"}
        </h2>

        <div className="mt-3 flex items-center justify-between gap-4 border-b border-border pb-4">
          <p className="font-mono text-xs text-muted-foreground">
            {diseasesLoading
              ? "Memuat…"
              : `${diseases.length} penyakit ditemukan`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSystemId(null)}
            className="shrink-0 gap-1 px-2 text-muted-foreground hover:text-ink hover:cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            Pilih sistem lain
          </Button>
        </div>
      </header>

      {diseasesLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : diseasesError ? (
        <ErrorState message={diseasesError.message} onRetry={refetchDiseases} />
      ) : diseases.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="text-sm text-muted-foreground">
            Belum ada penyakit terkait pada sistem ini.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSystemId(null)}
          >
            Pilih sistem tubuh lain
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {diseases.map((disease) => (
            <DiseaseCard key={disease.id} disease={disease} />
          ))}
        </div>
      )}
    </div>
  );
}
