import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { usePenyakitTerbaru } from "@/hooks/usePenyakitTerbaru";

export default function DiseaseInformation() {
  const { data, isLoading } = usePenyakitTerbaru(6);
  const diseases = data ?? [];

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
          Pelajari berbagai kondisi dari sistem tubuh yang berbeda, mulai dari
          yang paling baru ditambahkan.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-10">
        {isLoading
          ? [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))
          : diseases.map((disease) => (
              <Link
                key={disease.id}
                to={`/penyakit/${disease.slug}`}
                className="group relative flex h-full flex-col rounded-xl border border-border/70 bg-card p-6 shadow-sm transition-colors hover:border-pine/40 hover:bg-muted/30"
              >
                <ArrowUpRight
                  className="absolute right-5 top-5 h-4 w-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pine"
                  aria-hidden="true"
                />
                <h3 className="pr-8 text-h4 font-display text-ink">
                  {disease.nama}
                </h3>
                {disease.ringkasan && (
                  <p className="mt-2 min-h-0 line-clamp-3 text-body-sm font-body text-muted-foreground">
                    {disease.ringkasan}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="truncate text-body-sm font-body text-muted-foreground">
                    {disease.sistem_tubuh_nama ?? "Sistem tubuh"}
                  </span>
                  <UrgencyBadge disease={disease} />
                </div>
              </Link>
            ))}
      </div>

      {!isLoading && diseases.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-card p-6 text-center text-body-sm font-body text-muted-foreground">
          Belum ada data penyakit untuk ditampilkan. Mulai jelajahi lewat peta
          tubuh.
        </p>
      )}
    </section>
  );
}
