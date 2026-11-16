import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useSearchDiseases } from "@/hooks/useSearchDiseases";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyBadge } from "./UrgencyBadge";

export function HeaderSearch({ autoFocus }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, activeQuery } = useSearchDiseases(query);
  const diseases = data ?? [];
  const open = query.trim().length > 0;

  const handleClear = () => {
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="header-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
          placeholder="Cari penyakit atau gejala..."
          aria-label="Cari penyakit atau gejala"
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-9 w-full rounded-lg border border-border bg-card/70 pl-9 pr-10 text-base text-ink transition-colors placeholder:text-muted-foreground focus:border-transparent focus:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-xl shadow-pine/5">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <p className="p-3 text-sm text-destructive">
              Gagal mencari: {error.message}
            </p>
          ) : diseases.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">
              Tidak ditemukan hasil untuk{" "}
              <span className="font-medium text-foreground">
                "{activeQuery}"
              </span>
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1" role="list">
              {diseases.map((disease) => (
                <li key={disease.id}>
                  <Link
                    to={`/penyakit/${disease.slug}`}
                    onClick={handleClear}
                    className="block px-3 py-2 rounded-md hover:bg-mint/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {disease.nama}
                      </span>
                      <UrgencyBadge disease={disease} />
                    </div>
                    {disease.ringkasan && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {disease.ringkasan}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
