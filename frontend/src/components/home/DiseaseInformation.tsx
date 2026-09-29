import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const DISEASES = [
  {
    name: "Pneumonia",
    system: "Sistem Pernapasan",
    summary:
      "Infeksi yang meradang kantung udara di satu atau kedua paru, yang bisa terisi cairan atau nanah.",
    urgency: "waspada" as const,
    badgeClass: "badge-warning",
    href: "/detail-pneumonia",
  },
  {
    name: "Tuberkulosis",
    system: "Sistem Pernapasan",
    summary:
      "Penyakit menular serius yang disebabkan bakteri dan terutama menyerang paru-paru.",
    urgency: "waspada" as const,
    badgeClass: "badge-warning",
    href: "/detail-tuberculosis",
  },
  {
    name: "COVID-19",
    system: "Sistem Pernapasan",
    summary:
      "Penyakit pernapasan yang disebabkan SARS-CoV-2 dengan gejala ringan hingga berat.",
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
        <h2
          id="disease-information-heading"
          className="text-h2 font-display text-ink text-balance"
        >
          Informasi Penyakit
        </h2>
        <p className="mt-3 text-body font-body leading-relaxed text-muted-foreground text-pretty">
          Pelajari kondisi umum yang memengaruhi sistem pernapasan.
        </p>
      </header>
      <div className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-10">
        {DISEASES.map((disease) => (
          <Link
            key={disease.name}
            to={disease.href}
            className="group relative flex h-full flex-col rounded-xl border border-border/70 bg-card p-6 shadow-sm transition-colors hover:border-pine/40 hover:bg-muted/30"
          >
            <ArrowUpRight
              className="absolute right-5 top-5 h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pine"
              aria-hidden="true"
            />
            <h3 className="text-h4 font-display text-ink">
              {disease.name}
            </h3>
            <p className="mt-2 min-h-0 line-clamp-2 text-body-sm font-body text-muted-foreground">
              {disease.summary}
            </p>
            <div className="mt-auto pt-5 flex items-center justify-between">
              <span className="text-body-sm font-body text-muted-foreground">
                {disease.system}
              </span>
              <span
                className={`${disease.badgeClass} inline-flex items-center rounded-full px-3 py-1 font-body text-xs font-semibold tracking-wider`}
              >
                {disease.urgency}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}