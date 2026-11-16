import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SystemRecord } from "@/lib/types";

export function useSistemTubuh() {
  return useQuery({
    queryKey: ["sistem-tubuh"],
    queryFn: async () => {
      const { sistem_tubuh } = await api.getSistemTubuh();
      return sistem_tubuh;
    },
  });
}

export type { SystemRecord };
