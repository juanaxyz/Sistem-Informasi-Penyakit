import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DiseaseDetail } from "@/lib/types";

export function useDiseaseDetail(diseaseSlug: string | null) {
  return useQuery({
    queryKey: ["penyakit", "slug", diseaseSlug],
    queryFn: async () => {
      if (!diseaseSlug) return null;
      const { penyakit } = await api.getDiseaseDetailBySlug(diseaseSlug);
      return penyakit;
    },
    enabled: diseaseSlug !== null,
  });
}

export type { DiseaseDetail };
