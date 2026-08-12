import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { ResultsPanel } from "../components/ResultsPanel";
import { SearchTab } from "../components/SearchTab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useBodyParts } from "../hooks/useBodyParts";
import { SystemSelectorCard } from "../components/SystemSelectorCard";
import { useSystemsByBodyPart } from "@/hooks/useSystemsByBodyPart";

const TAB_IDS = ["peta", "cari"] as const;
type TabId = (typeof TAB_IDS)[number];

function BodyMapTab() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [showSystemSelector, setShowSystemSelector] = useState(false);

  const { data: bodyParts = [] } = useBodyParts();

  const {
    data: systemsData,
    isLoading: isLoadingSystems,
    error: systemsError,
  } = useSystemsByBodyPart(selectedPartId);

  const selectedPartName =
    selectedPartId != null
      ? (bodyParts.find((p) => p.id === selectedPartId)?.nama ?? null)
      : null;

  const handlePartClick = (id: number) => {
    setSelectedPartId(id);
    setSelectedSystemId(null);
    setShowSystemSelector(true);
  };

  const handleSystemSelect = (systemId: number) => {
    setSelectedSystemId(systemId);
    setShowSystemSelector(false);
  };

  const handleCloseSelector = () => {
    setShowSystemSelector(false);

    if (selectedSystemId === null) {
      setSelectedPartId(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start relative">
      <BodyMap selectedPartId={selectedPartId} onSelectPart={handlePartClick} />

      <ResultsPanel
        selectedPartId={selectedPartId}
        selectedSystemId={selectedSystemId}
        selectedPartName={selectedPartName}
      />

      {showSystemSelector && (
        <SystemSelectorCard
          bodyPartId={selectedPartId}
          bodyPartName={selectedPartName}
          systems={systemsData ?? []}
          isLoading={isLoadingSystems}
          error={systemsError}
          onSelectSystem={handleSystemSelect}
          onClose={handleCloseSelector}
        />
      )}
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

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="peta">Peta Tubuh</TabsTrigger>
          <TabsTrigger value="cari">Cari</TabsTrigger>
        </TabsList>

        <TabsContent value="peta">
          <BodyMapTab />
        </TabsContent>

        <TabsContent value="cari">
          <SearchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
