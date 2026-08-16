import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { UrgencyBadge } from "./UrgencyBadge";
import type { Disease } from "@/lib/types";

interface DiseaseCardProps {
  disease: Disease;
}

export function DiseaseCard({ disease }: DiseaseCardProps) {
  return (
    <Link
      to={`/penyakit/${disease.id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Lihat detail ${disease.nama}`}
    >
      <Card className="border-border/70 bg-card transition-colors hover:bg-mint/40 cursor-pointer h-full">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-medium text-ink flex-1 min-w-0">
              {disease.nama}
            </h3>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-pine"
              aria-hidden="true"
            />
          </div>
          {disease.ringkasan && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {disease.ringkasan}
            </p>
          )}
          {disease.tingkat_urgensi !== "normal" && (
            <div className="mt-3">
              <UrgencyBadge disease={disease} />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
