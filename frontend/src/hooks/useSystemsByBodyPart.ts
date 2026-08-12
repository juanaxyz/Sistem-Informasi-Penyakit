import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SystemRecord } from "@/lib/types";

export function useSystemsByBodyPart(bodyPartId: number | null) {
  return useQuery({
    queryKey: ["sistem-tubuh", "byBody", bodyPartId],
    queryFn: async () => {
      const { sistem_tubuh } = await api.getSystemsByBodyPart(bodyPartId!);
      return sistem_tubuh;
    },
    enabled: bodyPartId !== null,
  });
}

export type { SystemRecord };
