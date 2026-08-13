import { useState } from "react";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { ResultsPanel } from "../components/ResultsPanel";
import { useBodyParts } from "../hooks/useBodyParts";

export function BodyMapPage() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

  const { data: bodyParts = [] } = useBodyParts();

  const selectedPartName =
    selectedPartId != null
      ? (bodyParts.find((p) => p.id === selectedPartId)?.nama ?? null)
      : null;

  const handlePartClick = (id: number) => {
    setSelectedPartId(id);
  };

  return (
    <div>
      <section className="mb-6 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-medium text-ink">
          Tubuh Anda, <span className="text-pine">peta kesehatannya</span>.
        </h1>
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
          PETA INTERAKTIF — SISTEM TUBUH — PENCARIAN
        </p>
      </section>

      <div className="grid lg:grid-cols-5 gap-8 items-start mx-auto max-w-6xl">
        <div className="lg:col-span-2 lg:sticky lg:top-24 self-start">
          <BodyMap
            selectedPartId={selectedPartId}
            onSelectPart={handlePartClick}
          />
        </div>
        <div className="lg:col-span-3 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2 lg:-mr-2">
          <ResultsPanel
            key={selectedPartId ?? "none"}
            selectedPartId={selectedPartId}
            selectedPartName={selectedPartName}
          />
        </div>
      </div>
    </div>
  );
}
