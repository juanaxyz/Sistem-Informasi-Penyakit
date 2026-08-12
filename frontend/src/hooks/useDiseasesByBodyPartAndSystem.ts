import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Disease } from "@/lib/types";

export function useDiseasesByBodyPartAndSystem(
  bodyPartId: number | null,
  systemId: number | null,
) {
  return useQuery({
    queryKey: ["penyakit", "bySystemAndBody", bodyPartId, systemId],
    queryFn: async () => {
      const { penyakit } = await api.getDiseasesBySystemAndBody(
        bodyPartId!,
        systemId!,
      );
      return penyakit;
    },
    enabled: bodyPartId !== null && systemId !== null,
  });
}

export type { Disease };
