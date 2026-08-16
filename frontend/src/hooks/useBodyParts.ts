import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BodyPartRecord } from "@/lib/types";

export function useBodyParts(tampilan?: "depan" | "belakang") {
  return useQuery({
    queryKey: ["bagian-tubuh", tampilan],
    queryFn: async () => {
      const { bagian_tubuh } = await api.getBodyParts();
      return tampilan
        ? bagian_tubuh.filter((p) => p.tampilan === tampilan)
        : bagian_tubuh;
    },
  });
}

export type { BodyPartRecord };
