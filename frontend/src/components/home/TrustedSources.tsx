import { Stethoscope } from "lucide-react";

const SOURCES = ["WHO", "CDC", "Kemenkes RI"];

export default function TrustedSources() {
  return (
    <section
      aria-labelledby="trusted-sources-heading"
      className="mt-12 md:mt-16"
    >
      <h2 id="trusted-sources-heading" className="sr-only">
        Sumber Terpercaya
      </h2>
      <div className="flex items-center justify-center gap-2">
        <Stethoscope className="h-4 w-4 text-pine" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-0.5 font-body text-xs text-muted-foreground">
          Sumber Terpercaya
        </span>
      </div>
      <div className="mt-4 flex items-center justify-center divide-x divide-border">
        {SOURCES.map((source) => (
          <span
            key={source}
            className="px-4 text-body-sm font-body font-medium text-muted-foreground"
          >
            {source}
          </span>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-body font-body leading-relaxed text-muted-foreground">
        Informasi penyakit di platform ini bersifat edukasi dan berasal dari sumber medis terpercaya seperti WHO, Kementerian Kesehatan RI, dan jurnal peer-reviewed. Konsultasikan dengan tenaga kesehatan untuk diagnosis dan penanganan.
      </p>
    </section>
  );
}