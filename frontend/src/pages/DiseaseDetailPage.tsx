import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDiseaseDetail } from "@/hooks/useDiseaseDetail";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { BodyPartPreview } from "@/components/BodyPartPreview";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { ArticleProse } from "@/components/ArticleProse";

/** Judul section artikel yang konsisten: display font + aksen bar pine di kiri. */
function ArticleHeading({
  children,
  id,
  anchorable = false,
}: {
  children: ReactNode;
  id?: string;
  anchorable?: boolean;
}) {
  return (
    <h2
      id={id}
      className="group/section flex items-center gap-2.5 scroll-mt-24 font-display text-xl md:text-2xl font-semibold tracking-tight text-ink"
    >
      <span
        aria-hidden="true"
        className="h-5 md:h-6 w-1 shrink-0 rounded-full bg-pine"
      />
      {children}
      {anchorable && id && (
        <a
          href={`#${id}`}
          aria-label={`Salin tautan ke bagian ${typeof children === "string" ? children : "ini"}`}
          title="Salin tautan ke bagian ini"
          onClick={(e) => {
            e.preventDefault();
            const url = `${window.location.origin}${window.location.pathname}#${id}`;
            void navigator.clipboard?.writeText(url);
          }}
          className="article-heading-anchor shrink-0 rounded focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LinkIcon />
        </a>
      )}
    </h2>
  );
}

/** Ikon rantai untuk anchor tautan seksi artikel. */
function LinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Progress bar baca di atas halaman. Artikel penyakit bisa sangat panjang
 * (ringkasan, gejala, penyebab, diagnosis, penanganan, pencegahan), jadi
 * penanda posisi baca membantu pengguna tahu tinggal berapa lagi.
 */
function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent"
    >
      <div
        className="h-full bg-pine transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

const CustomTableComponents = {
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-gray-300 shadow-sm">
      {/* Pastikan menggunakan border-collapse agar garis menyatu */}
      <table className="w-full text-left text-sm border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-primary text-xs uppercase font-semibold text-gray-700">
      {children}
    </thead>
  ),
  th: ({ children }: any) => (
    /* Menggunakan border-r-2 dan warna gray-300 agar terlihat tegas */
    <th className="px-6 py-3 border-r-2 bg-secondary border-gray-300 last:border-r-0 text-gray-700">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    /* Menggunakan border-r-2 dan warna gray-200 untuk baris data */
    <td className="px-6 py-4 border-r-2 border-gray-200 last:border-r-0 text-gray-600">
      {children}
    </td>
  ),
};

export function DiseaseDetailPage() {
  const { slug } = useParams();
  const validSlug = slug && slug.trim() ? slug.trim() : null;
  const navigate = useNavigate();

  const { data, isLoading, error } = useDiseaseDetail(validSlug);

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
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
      <ReadingProgress />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="gap-1 px-2"
      >
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
          <FadeIn>
            <header className="border-b border-border pb-6 md:pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <UrgencyBadge disease={data} />
                {data.sistem_tubuh && (
                  <Badge variant="secondary">{data.sistem_tubuh.nama}</Badge>
                )}
              </div>
              <h1 className="mt-4 font-display text-3xl md:text-4xl font-medium tracking-tight text-ink text-balance">
                {data.nama}
              </h1>
              {data.ringkasan && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
                  {data.ringkasan}
                </p>
              )}
              {data.patogen && data.patogen.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.patogen.map((pg) => (
                    <Link
                      key={pg.id}
                      to={`/patogen/${pg.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition hover:border-pine/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full bg-pine"
                      />
                      {pg.nama}
                    </Link>
                  ))}
                </div>
              )}
            </header>
          </FadeIn>
          {data.artikel.length > 0 && (
            <div className="mt-6 space-y-8">
              {data.artikel.map((article) =>
                article.bagian && article.bagian.length > 0 ? (
                  <div key={article.id} className="space-y-8">
                    {article.bagian.map((sec) => {
                      const anchorId = `bagian-${sec.id ?? sec.urutan}`;
                      return (
                        <section key={anchorId} id={anchorId} className="scroll-mt-24 space-y-3">
                          {sec.judul && (
                            <ArticleHeading id={anchorId} anchorable>
                              {sec.judul}
                            </ArticleHeading>
                          )}
                          {/*
                            `ArticleProse` memegang seluruh styling heading, list,
                            blockquote, tabel, dan kode. Jangan pakai kelas
                            `prose` di sini: plugin typography tidak terpasang,
                            jadi kelas itu tidak melakukan apa pun.
                          */}
                          <ArticleProse components={CustomTableComponents}>
                            {sec.konten}
                          </ArticleProse>
                        </section>
                      );
                    })}
                  </div>
                ) : null,
              )}
            </div>
          )}
          {data.bagian_tubuh.length > 0 && (
            <FadeIn>
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
            </FadeIn>
          )}
          {data.patogen && data.patogen.length > 0 && (
            <FadeIn>
              <section className="mt-8 md:mt-10">
                <ArticleHeading>Patogen penyebab</ArticleHeading>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.patogen.map((pg) => (
                    <Link
                      key={pg.id}
                      to={`/patogen/${pg.id}`}
                      className="rounded-xl border border-border bg-card p-4 transition hover:border-pine/40 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-pine/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-pine">
                          {pg.jenis}
                        </span>
                        <h3 className="font-medium text-ink">{pg.nama}</h3>
                      </div>
                      {pg.deskripsi && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {pg.deskripsi}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}
          {data.referensi.length > 0 && (
            <FadeIn>
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
                          {ref.url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </FadeIn>
          )}
          <div className="mt-8 md:mt-10">
            <MedicalDisclaimer />
          </div>
        </article>
        <FadeIn delay={0.15}>
          <aside className="lg:sticky lg:top-20">
            <BodyPartPreview ids={data.bagian_tubuh.map((part) => part.id)} />
          </aside>
        </FadeIn>
      </div>
    </div>
  );
}
