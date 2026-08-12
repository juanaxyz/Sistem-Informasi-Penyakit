import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DiseaseDetail } from "@/lib/types";

export function useDiseaseDetail(diseaseId: number | null) {
  return useQuery({
    queryKey: ["penyakit", diseaseId],
    queryFn: async () => {
      const { penyakit } = await api.getDiseaseDetail(diseaseId!);
      return penyakit;
    },
    enabled: diseaseId !== null,
  });
}

export type { DiseaseDetail };
