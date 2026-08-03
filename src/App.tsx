import { useState } from "react";
import { BodyMap } from "./components/bodyMap/BodyMap";
import { ResultsPanel } from "./components/ResultsPanel";
import { SearchTab } from "./components/SearchTab";
import { SystemTab } from "./components/SystemTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useBodyParts } from "./hooks/useBodyParts";

function BodyMapTab() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const { data: bodyParts } = useBodyParts();

  const selectedPartName = selectedPartId
    ? bodyParts.find((p) => p.id === selectedPartId)?.nama ?? null
    : null;

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
      <BodyMap selectedPartId={selectedPartId} onSelectPart={setSelectedPartId} />
      <ResultsPanel selectedPartId={selectedPartId} selectedPartName={selectedPartName} />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"peta" | "sistem" | "cari">("peta");
  type TabId = "peta" | "sistem" | "cari";

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold text-ink">
            Sistem Informasi Penyakit
          </h1>
          <span className="font-mono text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            ATLAS ANATOMI
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="mb-6 text-center">
          <p className="font-display text-3xl md:text-4xl font-medium text-ink">
            Tubuh Anda, <span className="text-pine">peta kesehatannya</span>.
          </p>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-1">
            PETA INTERAKTIF — SISTEM TUBUH — PENCARIAN
          </p>
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabId)}
          className="w-full"
        >
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
      </main>

      <footer className="border-t border-border bg-muted/30 py-4 mt-10">
        <p className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground font-mono">
          Informasi ini bersifat edukasi, bukan diagnosis medis. Konsultasikan dengan tenaga kesehatan untuk
          penanganan yang tepat.
        </p>
      </footer>
    </div>
  );
}