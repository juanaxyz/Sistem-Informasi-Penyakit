import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import type { Patogen } from "@/lib/types";

export function PatogenDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["patogen", id],
    queryFn: async () => {
      const { patogen } = await api.patogen.detail(Number(id));
      return patogen;
    },
    enabled: !!id,
  });

  useEffect(() => {
    document.title = data ? `${data.nama} — Peta Kesehatan` : "Peta Kesehatan";
    return () => {
      document.title = "Peta Kesehatan";
    };
  }, [data]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <p className="text-destructive text-sm">Gagal memuat detail patogen</p>
        <p className="text-muted-foreground text-xs max-w-sm mx-auto">
          {error.message}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <p className="text-muted-foreground text-sm">Patogen tidak ditemukan.</p>
        <Link
          to="/"
          className="inline-flex text-sm font-medium text-pine hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 px-2">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-medium">Kembali</span>
      </Button>

      <FadeIn>
        <header className="border-b border-border pb-6">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-pine/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-pine">
              {data.jenis}
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight text-ink text-balance">
            {data.nama}
          </h1>
          {data.deskripsi && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
              {data.deskripsi}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Patogen ini terkait dengan{" "}
            <span className="font-semibold text-ink">
              {data.jumlah_penyakit ?? data.penyakit?.length ?? 0}
            </span>{" "}
            penyakit.
          </p>
        </header>
      </FadeIn>

      <section className="mt-6">
        <h2 className="flex items-center gap-2.5 font-display text-xl md:text-2xl font-semibold tracking-tight text-ink">
          <span aria-hidden="true" className="h-5 md:h-6 w-1 shrink-0 rounded-full bg-pine" />
          Penyakit yang disebabkan
        </h2>
        {(!data.penyakit || data.penyakit.length === 0) ? (
          <p className="mt-6 text-sm text-muted-foreground italic">
            Belum ada penyakit yang terhubung dengan patogen ini.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.penyakit.map((d) => (
              <Link
                key={d.id}
                to={`/penyakit/${d.slug}`}
                className="rounded-xl border border-border bg-card p-4 transition hover:border-pine/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-ink">{d.nama}</h3>
                  <UrgencyBadge disease={d} />
                </div>
                {d.ringkasan && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {d.ringkasan}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10">
        <MedicalDisclaimer />
      </div>
    </div>
  );
}

export type { Patogen };