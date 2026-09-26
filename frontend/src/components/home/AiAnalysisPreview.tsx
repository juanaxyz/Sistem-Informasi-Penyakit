import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";

import frontFigure from "/images/front.png";

const CLASSIFICATION = [
  { label: "Pneumonia", value: 82 },
  { label: "Normal", value: 9 },
  { label: "Opacity", value: 6 },
  { label: "Other", value: 3 },
];

export default function AiAnalysisPreview() {
  return (
    <section
      aria-labelledby="ai-analysis-heading"
      className="mt-12 rounded-lg border border-border/70 bg-card p-6 shadow-sm md:mt-16"
    >
      <div className="mb-4 flex items-center gap-3">
        <h2
          id="ai-analysis-heading"
          className="font-display text-lg font-medium text-ink"
        >
          AI Analysis Preview
        </h2>
        <span className="badge-success inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider">
          Preview
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg bg-secondary/40">
          <img
            src={frontFigure}
            alt="Ilustrasi peta tubuh untuk analisis AI"
            className="h-64 w-full object-contain mix-blend-multiply"
          />
          <p className="border-t border-border/70 px-4 py-2 text-center font-mono text-xs text-muted-foreground">
            Demo classification — not a real analysis
          </p>
        </div>
        <div className="flex flex-col justify-center gap-4">
          {CLASSIFICATION.map((item, index) => (
            <FadeIn key={item.label} delay={index * 0.08}>
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-ink">
                    {item.label}
                  </span>
                  <span className="font-mono text-xs text-pine">
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
            </FadeIn>
          ))}
        </div>
      </div>
      <Button asChild size="lg" className="mt-6">
        <Link to="/analisis">
          Try AI Analysis
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}