import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Disease } from "@/lib/types";

/** Jeda sebelum query pencarian dikirim (menunggu user berhenti mengetik). */
const SEARCH_DEBOUNCE_MS = 300;

export function useSearchDiseases(query: string) {
  const q = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(q);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["penyakit", "cari", debouncedQuery],
    queryFn: async () => {
      const { penyakit } = await api.searchDiseases(debouncedQuery);
      return penyakit;
    },
    enabled: debouncedQuery.length > 0,
  });

  // Tampil loading selama menunggu debounce, bukan cuma saat fetch.
  const pending = q.length > 0 && q !== debouncedQuery;

  return { data, isLoading: isLoading || pending, error, activeQuery: q };
}

export type { Disease };
