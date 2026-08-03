import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { ResultsPanel } from "../components/ResultsPanel";
import { SearchTab } from "../components/SearchTab";
import { SystemTab } from "../components/SystemTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useBodyParts } from "../hooks/useBodyParts";

const TAB_IDS = ["peta", "sistem", "cari"] as const;
type TabId = (typeof TAB_IDS)[number];

function BodyMapTab() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const { data: bodyParts } = useBodyParts();

  const selectedPartName =
    selectedPartId != null
      ? bodyParts.find((p) => p.id === selectedPartId)?.nama ?? null
      : null;

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
      <BodyMap selectedPartId={selectedPartId} onSelectPart={setSelectedPartId} />
      <ResultsPanel selectedPartId={selectedPartId} selectedPartName={selectedPartName} />
    </div>
  );
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_IDS.includes(searchParams.get("tab") as TabId)
    ? (searchParams.get("tab") as TabId)
    : "peta";

  const handleTabChange = (value: string) => {
    if (TAB_IDS.includes(value as TabId)) {
      setSearchParams({ tab: value });
    }
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="peta">Peta Tubuh</TabsTrigger>
          <TabsTrigger value="sistem">Sistem Tubuh</TabsTrigger>
          <TabsTrigger value="cari">Cari</TabsTrigger>
        </TabsList>

        <TabsContent value="peta">
          <BodyMapTab />
        </TabsContent>

        <TabsContent value="sistem">
          <SystemTab />
        </TabsContent>

        <TabsContent value="cari">
          <SearchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
