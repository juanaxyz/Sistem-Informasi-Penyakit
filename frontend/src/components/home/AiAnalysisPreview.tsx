import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

const EXAMPLE_SCANNED = "/images/example-pneumonia.png";

const PREVIEW_RESULT = [
  { label: "Pneumonia", value: 82 },
  { label: "Tuberculosis", value: 12 },
  { label: "Normal", value: 6 },
];

export default function AiAnalysisPreview() {
  return (
    <section
      aria-labelledby="ai-analysis-heading"
      className="mt-12 rounded-xl border border-border/70 bg-card p-6 shadow-sm md:mt-16"
    >
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 id="ai-analysis-heading" className="text-h3 font-display text-ink">
          Analisis Gambar Berbasis AI
        </h2>
        <span className="badge-success inline-flex items-center rounded-full px-2.5 py-0.5 font-body text-xs font-semibold tracking-wider">
          Contoh tampilan
        </span>
      </div>
      <p className="mb-6 max-w-2xl text-body-sm font-body leading-relaxed text-muted-foreground text-pretty">
        Unggah gambar pemeriksaan pada bagian tubuh yang dipilih. Model
        menampilkan beberapa kemungkinan kelas beserta tingkat keyakinannya.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,color-mix(in_oklab,var(--color-pine)_10%,transparent)_0%,transparent_60%)]"
          />
          <div className="relative text-center">
            <img src={EXAMPLE_SCANNED} alt="Gambar Contoh Scan x-ray Paru Paru" />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          <p className="text-ui font-body font-semibold text-muted-foreground">
            Hasil analisis
          </p>
          {PREVIEW_RESULT.map((item) => (
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
                <motion.div
                  className="h-full rounded-full bg-pine"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.value}%` }}
                  viewport={{ once: false }}
                  transition={{
                    duration: 1.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs font-body leading-relaxed text-muted-foreground">
            Angka di atas adalah ilustrasi. Jenis analisis yang tersedia
            bergantung pada bagian tubuh yang dipilih.
          </p>
        </div>
      </div>

      <Button asChild size="lg" className="mt-6">
        <Link to="/analisis">
          Coba Analisis
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
