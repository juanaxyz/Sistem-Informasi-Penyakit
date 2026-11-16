import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DiseaseListItem } from "@/lib/types";

export function usePenyakitTerbaru(limit = 6) {
  return useQuery({
    queryKey: ["penyakit", "terbaru", limit],
    queryFn: async () => {
      const { penyakit } = await api.getPenyakitTerbaru(limit);
      return penyakit;
    },
  });
}

export type { DiseaseListItem };
