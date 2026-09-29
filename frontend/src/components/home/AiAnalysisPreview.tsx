import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CLASSIFICATION = [
  { label: "Pneumonia", value: 82 },
  { label: "Normal", value: 9 },
  { label: "Opasitas", value: 6 },
  { label: "Lainnya", value: 3 },
];

export default function AiAnalysisPreview() {
  return (
    <section
      aria-labelledby="ai-analysis-heading"
      className="mt-12 rounded-xl border border-border/70 bg-card p-6 shadow-sm md:mt-16"
    >
      <div className="mb-4 flex items-center gap-3">
        <h2 id="ai-analysis-heading" className="text-h3 font-display text-ink">
          Pratinjau Analisis AI
        </h2>
        <span className="badge-success inline-flex items-center rounded-full px-2.5 py-0.5 font-body text-xs font-semibold tracking-wider">
          Pratinjau
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg bg-muted/50">
          <img
            src="/images/example-pneumonia.png"
            alt="Ilustrasi peta tubuh untuk analisis AI"
            className="h-64 w-full object-contain mix-blend-multiply"
          />
         
        </div>
        <div className="flex flex-col justify-center gap-4">
          {CLASSIFICATION.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-body font-body font-medium text-ink">
                  {item.label}
                </span>
                <span className="font-mono text-body-sm text-pine">
                  {item.value}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-pine transition-all"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button asChild size="lg" className="mt-6">
        <Link to="/analisis">
          Coba Analisis AI
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}