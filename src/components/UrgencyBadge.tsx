import { Badge } from "@/components/ui/badge";
import type { Disease } from "@/lib/types";

type UrgencyLevel = "normal" | "waspada" | "darurat";

interface UrgencyBadgeProps {
  level?: UrgencyLevel;
  /** Optional explicit disease object to derive level from */
  disease?: Pick<Disease, "tingkat_urgensi">;
}

const URGENCY_VARIANTS: Record<UrgencyLevel, "success" | "warning" | "danger"> = {
  normal: "success",
  waspada: "warning",
  darurat: "danger",
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  normal: "Normal",
  waspada: "Waspada",
  darurat: "Darurat",
};

export function UrgencyBadge({ level, disease }: UrgencyBadgeProps) {
  const urgencyLevel = level ?? (disease?.tingkat_urgensi as UrgencyLevel | undefined) ?? "normal";
  const variant = URGENCY_VARIANTS[urgencyLevel] ?? "success";
  const label = URGENCY_LABELS[urgencyLevel] ?? "Normal";

  return <Badge variant={variant}>{label}</Badge>;
}