import { Search, BookOpen, ScanLine } from "lucide-react";

const FEATURES = [
  {
    icon: <Search className="h-6 w-6" />,
    title: "Jelajahi",
    description: "Pilih bagian tubuh pada peta interaktif",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Temukan",
    description: "Pelajari penyakit dan kondisi terkait",
  },
  {
    icon: <ScanLine className="h-6 w-6" />,
    title: "Analisis",
    description: "Unggah gambar untuk analisis AI",
  },
];

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mt-12 md:mt-16"
    >
      <h2 id="how-it-works-heading" className="text-h2 font-display text-ink">
        Cara Kerja
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="group relative rounded-xl border border-border bg-card p-6 text-center transition-colors hover:border-pine/40 hover:bg-muted/30"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-mint text-pine transition-colors group-hover:bg-pine group-hover:text-white">
              {feature.icon}
            </div>
            <h3 className="mt-4 text-h4 font-display text-ink">
              {feature.title}
            </h3>
            <p className="mt-2 text-body-sm font-body text-muted-foreground leading-relaxed text-pretty">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}