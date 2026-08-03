import { Card, CardContent } from "@/components/ui/card";
import { UrgencyBadge } from "./UrgencyBadge";
import type { Disease } from "@/lib/types";

interface DiseaseCardProps {
  disease: Disease;
}

export function DiseaseCard({ disease }: DiseaseCardProps) {
  return (
    <Card className="transition-colors hover:bg-mint/50 cursor-default focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-base text-ink flex-1 min-w-0">
            {disease.nama}
          </h3>
          <UrgencyBadge disease={disease} />
        </div>
        {disease.ringkasan && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {disease.ringkasan}
          </p>
        )}
      </CardContent>
    </Card>
  );
}