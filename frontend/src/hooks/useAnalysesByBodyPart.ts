import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalysisTypeRecord } from "@/lib/types";

export function useAnalysesByBodyPart(bodyPartId: number | null) {
  return useQuery({
    queryKey: ["jenis-analisis", "byBody", bodyPartId],
    queryFn: async () => {
      const { jenis_analisis } = await api.getAnalysesByBodyPart(bodyPartId!);
      return jenis_analisis;
    },
    enabled: bodyPartId !== null,
  });
}

export type { AnalysisTypeRecord };