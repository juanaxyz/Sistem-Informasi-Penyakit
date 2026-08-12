import { useState } from "react";
import { useSearchDiseases } from "@/hooks/useSearchDiseases";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiseaseCard } from "./DiseaseCard";

export function SearchTab() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, activeQuery } = useSearchDiseases(query);
  const diseases = data ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">
          Cari penyakit atau gejala
        </label>
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Ketik nama penyakit atau gejala..."
          className="w-full px-4 py-3 pl-12 text-base border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          autoComplete="off"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors"
            aria-label="Hapus pencarian"
          >
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Active query indicator */}
      {activeQuery && (
        <p className="font-mono text-xs text-muted-foreground">
          Menampilkan hasil untuk: <span className="font-medium text-foreground">"{activeQuery}"</span>
        </p>
      )}

      {/* Results */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {!query && !activeQuery ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-muted-foreground text-sm max-w-xs">
                Ketik nama penyakit atau gejala untuk mencari
              </p>
            </div>
          ) : isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-destructive text-sm">
              Gagal mencari: {error.message}
            </div>
          ) : diseases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-muted-foreground text-sm">
                Tidak ditemukan hasil untuk{" "}
                <span className="font-medium text-foreground">"{activeQuery}"</span>
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