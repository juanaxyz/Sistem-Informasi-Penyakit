import { useRef, useState } from "react";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { ResultsPanel } from "../components/ResultsPanel";
import { useBodyParts } from "../hooks/useBodyParts";
import { useSystemsByBodyPart } from "../hooks/useSystemsByBodyPart";

export function BodyMapPage() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: bodyParts = [] } = useBodyParts();
  const { data: systems = [] } = useSystemsByBodyPart(selectedPartId);

  const selectedPartName =
    selectedPartId != null
      ? (bodyParts.find((p) => p.id === selectedPartId)?.nama ?? null)
      : null;

  const selectedPartMeta =
    selectedPartId != null && systems.length > 0
      ? `${systems.length} sistem`
      : undefined;

  const handlePartClick = (id: number) => {
    setSelectedPartId(id);
    const results = resultsRef.current;
    if (!results) return;
    if (window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        results.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      results.scrollTop = 0;
    }
  };

  return (
    <div>
      <section className="mb-6 text-center">
        <h1 className="text-h1 font-display text-ink tracking-tight text-balance">
          Tubuh Anda, <span className="text-pine">peta kesehatannya</span>.
        </h1>
      </section>

      <div className="grid lg:grid-cols-11 gap-8 items-start mx-auto max-w-6xl">
        <div className="lg:col-span-6 lg:sticky lg:top-24 self-start">
          <BodyMap
            selectedPartId={selectedPartId}
            onSelectPart={handlePartClick}
            selectedPartMeta={selectedPartMeta}
          />
        </div>
        <div
          ref={resultsRef}
          className="scroll-mt-24 lg:scroll-mt-0 lg:col-span-5 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2 lg:-mr-2"
        >
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
