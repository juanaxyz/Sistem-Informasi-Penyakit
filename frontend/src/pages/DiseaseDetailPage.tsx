import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDiseaseDetail } from "@/hooks/useDiseaseDetail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { BodyPartPreview } from "@/components/BodyPartPreview";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import type { DiseaseContent } from "@/lib/types";

type ContentImage = NonNullable<DiseaseContent["gambar_konten"]>[number];

/** Judul section artikel yang konsisten: display font + aksen bar pine di kiri. */
function ArticleHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-display text-xl md:text-2xl font-semibold tracking-tight text-ink">
      <span
        aria-hidden="true"
        className="h-5 md:h-6 w-1 shrink-0 rounded-full bg-pine"
      />
      {children}
    </h2>
  );
}

/**
 * Gambar artikel: lebar penuh kolom teks, `h-auto` (tanpa tinggi paksa agar
 * gambar medis tidak terpotong), laluan lembut saat selesai dimuat lewat
 * latar `bg-muted` agar tidak "muncul" mendadak.
 */
function ArticleImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg bg-muted">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`h-auto w-full transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

/**
 * Figure artikel untuk gambar milik satu blok konten:
 * - 1 gambar → figure lebar penuh;
 * - >1 gambar → satu figure berisi grid 2 kolom (tetap satu kesatuan gaya
 *   artikel, bukan kotak-kotak galeri terputus).
 */
function ArticleFigure({
  images,
  fallbackAlt,
}: {
  images: ContentImage[];
  fallbackAlt: string;
}) {
  const altFor = (img: ContentImage) => img.caption ?? fallbackAlt;

  if (images.length === 1) {
    const img = images[0];
    return (
      <figure className="mt-6">
        <ArticleImage src={img.url_gambar} alt={altFor(img)} />
        {img.caption && (
          <figcaption className="mt-2 text-xs md:text-sm text-muted-foreground">
            {img.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((img) => (
          <figure key={img.id}>
            <ArticleImage src={img.url_gambar} alt={altFor(img)} />
            {img.caption && (
              <figcaption className="mt-2 text-xs md:text-sm text-muted-foreground">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </figure>
  );
}

export function DiseaseDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const validId = Number.isInteger(numericId) && numericId > 0 ? numericId : null;
  const navigate = useNavigate();

  const { data, isLoading, error } = useDiseaseDetail(validId);

  useEffect(() => {
    document.title = data
      ? `${data.nama} — Peta Kesehatan`
      : "Peta Kesehatan";
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
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="min-w-0 max-w-3xl space-y-6">
            <div>
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="mt-4 h-10 w-2/3 rounded-lg" />
              <Skeleton className="mt-3 h-4 w-full max-w-xl rounded" />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-40 rounded" />
                <Skeleton className="mt-3 h-4 w-full rounded" />
                <Skeleton className="mt-2 h-4 w-5/6 rounded" />
                <Skeleton className="mt-4 h-56 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <aside className="hidden lg:block">
            <Skeleton className="h-96 w-full rounded-lg" />
          </aside>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <p className="text-destructive text-sm">Gagal memuat detail penyakit</p>
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
        <p className="text-muted-foreground text-sm">
          Penyakit tidak ditemukan.
        </p>
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

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <article className="min-w-0 max-w-3xl">
          {/* Header artikel */}
          <header className="border-b border-border pb-6 md:pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <UrgencyBadge disease={data} />
              {data.sistem_tubuh && (
                <Badge variant="secondary">{data.sistem_tubuh.nama}</Badge>
              )}
            </div>
            <h1 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight text-ink">
              {data.nama}
            </h1>
            {data.ringkasan && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {data.ringkasan}
              </p>
            )}
          </header>

          {/* Alur artikel kontinyu: section dipisahkan tipografi, bukan kotak */}
          {data.konten.length > 0 && (
            <div>
              {data.konten.map((block, index) => (
                <section
                  key={block.id}
                  className={index === 0 ? "mt-7 md:mt-9" : "mt-8 md:mt-10"}
                >
                  <ArticleHeading>{block.judul}</ArticleHeading>
                  {block.isi && (
                    <p className="mt-3 md:mt-4 text-[15px] md:text-base leading-relaxed text-foreground whitespace-pre-line">
                      {block.isi}
                    </p>
                  )}
                  {Array.isArray(block.gambar_konten) &&
                    block.gambar_konten.length > 0 && (
                      <ArticleFigure
                        images={block.gambar_konten}
                        fallbackAlt={block.judul}
                      />
                    )}
                </section>
              ))}
            </div>
          )}

          {data.bagian_tubuh.length > 0 && (
            <section className="mt-8 md:mt-10">
              <ArticleHeading>Bagian tubuh terkait</ArticleHeading>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.bagian_tubuh.map((part) => (
                  <Badge key={part.id} variant="outline">
                    {part.nama}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {data.referensi.length > 0 && (
            <section className="mt-10 border-t border-border pt-6">
              <ArticleHeading>Referensi</ArticleHeading>
              <ul className="mt-4 space-y-2">
                {data.referensi.map((ref) => (
                  <li key={ref.id} className="text-sm">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pine hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                      >
                        {ref.judul}
                      </a>
                    ) : (
                      <span>{ref.judul}</span>
                    )}
                    {(ref.sumber || ref.tahun) && (
                      <span className="text-muted-foreground">
                        {" — "}
                        {[ref.sumber, ref.tahun].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 md:mt-10">
            <MedicalDisclaimer />
          </div>
        </article>

        <aside className="lg:sticky lg:top-20">
          <BodyPartPreview ids={data.bagian_tubuh.map((part) => part.id)} />
        </aside>
      </div>
    </div>
  );
}
