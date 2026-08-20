import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

const DISEASES = [
  {
    name: "Pneumonia",
    system: "Respiratory System",
    summary:
      "Infection that inflames air sacs in one or both lungs, which may fill with fluid or pus.",
    urgency: "waspada" as const,
    badgeClass: "badge-warning",
    href: "/detail-pneumonia",
  },
  {
    name: "Tuberculosis",
    system: "Respiratory System",
    summary:
      "Serious infectious disease caused by bacteria that mainly affects the lungs.",
    urgency: "waspada" as const,
    badgeClass: "badge-warning",
    href: "/detail-tuberculosis",
  },
  {
    name: "COVID-19",
    system: "Respiratory System",
    summary:
      "Respiratory illness caused by SARS-CoV-2 ranging from mild to severe symptoms.",
    urgency: "darurat" as const,
    badgeClass: "badge-danger",
    href: "/detail-covid19",
  },
];

export default function DiseaseInformation() {
  return (
    <section
      aria-labelledby="disease-information-heading"
      className="mt-12 md:mt-16"
    >
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-pine">
          Respiratory System
        </p>
        <h2
          id="disease-information-heading"
          className="mt-3 font-display text-2xl font-medium tracking-tight text-ink text-balance md:text-3xl"
        >
          Disease Information
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Learn about common conditions affecting the respiratory system.
        </p>
      </header>
      <div className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-10">
        {DISEASES.map((disease, index) => (
          <FadeIn key={disease.name} delay={index * 0.1} className="h-full">
            <Link
              to={disease.href}
              className="group relative flex h-full flex-col rounded-lg border border-border/70 bg-card p-6 shadow-sm transition-colors hover:border-pine/40 hover:bg-secondary/40"
            >
              <ArrowUpRight
                className="absolute right-5 top-5 h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pine"
                aria-hidden="true"
              />
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {disease.system}
              </p>
              <h3 className="mt-3 font-display text-xl font-medium tracking-tight text-ink">
                {disease.name}
              </h3>
              <p className="mt-2 min-h-0 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {disease.summary}
              </p>
              <div className="mt-auto pt-5">
                <span
                  className={`${disease.badgeClass} inline-flex items-center rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider`}
                >
                  {disease.urgency}
                </span>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}