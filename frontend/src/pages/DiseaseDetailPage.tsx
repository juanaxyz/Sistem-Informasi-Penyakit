import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDiseaseDetail } from "@/hooks/useDiseaseDetail";
import { isEmptyKonten } from "@/lib/artikel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { BodyPartPreview } from "@/components/BodyPartPreview";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { ArticleProse, TableOfContents, type TocItem } from "@/components/ArticleProse";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  List as ListIcon,
  Printer,
  X,
} from "lucide-react";

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
      className="group/section flex items-center gap-2.5 scroll-mt-24 text-h2 font-display text-ink"
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

export function DiseaseDetailPage() {
  const { slug } = useParams();
  const validSlug = slug && slug.trim() ? slug.trim() : null;
  const navigate = useNavigate();
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  /** Daftar isi otomatis dari <h2>/<h3> di konten HTML artikel. */
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useDiseaseDetail(validSlug);

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readingTimeMinutes = (() => {
    if (!data) return 1;
    const artikelList = Array.isArray(data.artikel)
      ? data.artikel
      : data.artikel
        ? [data.artikel]
        : [];
    const textContent = artikelList
      .map((a) => a.konten?.replace(/<[^>]+>/g, " ") || "")
      .join(" ");
    const wordCount = (textContent + " " + (data.ringkasan || ""))
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  })();

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

      {/* Breadcrumb navigasi */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link to="/" className="hover:text-ink transition">
          Beranda
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to="/body-map" className="hover:text-ink transition">
          Peta Tubuh
        </Link>
        {data.sistem_tubuh && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">
              {data.sistem_tubuh.nama}
            </span>
          </>
        )}
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="font-medium text-ink truncate max-w-[150px] sm:max-w-none">
          {data.nama}
        </span>
      </nav>

      {/* Top action bar: Kembali + Share + Print + Mobile TOC */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1 px-2 h-8 text-xs font-medium"
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
          <span>Kembali</span>
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-ink"
            title="Salin tautan artikel"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-pine" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Tersalin!" : "Salin Link"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-ink hidden sm:inline-flex"
            title="Cetak ringkasan halaman"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak</span>
          </Button>

          {tocItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden h-8 gap-1 text-xs"
              onClick={() => setMobileTocOpen(true)}
            >
              <ListIcon className="h-3.5 w-3.5" />
              <span>Daftar Isi</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileTocOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setMobileTocOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-background shadow-xl border-l border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <h3 className="font-display font-semibold text-ink">Daftar Isi</h3>
                <button
                  type="button"
                  onClick={() => setMobileTocOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Tutup daftar isi"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <TableOfContents items={tocItems} onNavigate={() => setMobileTocOpen(false)} />
                <BodyPartPreview ids={data.bagian_tubuh.map((part) => part.id)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <article className="min-w-0 max-w-3xl">
            <header className="border-b border-border pb-6 md:pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <UrgencyBadge disease={data} />
                {data.sistem_tubuh && (
                  <Badge variant="secondary">{data.sistem_tubuh.nama}</Badge>
                )}
              </div>
              <h1 className="mt-4 text-h1 font-display text-ink tracking-tight text-balance">
                {data.nama}
              </h1>

              {/* Reading metadata */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-pine" />
                  <span>{readingTimeMinutes} menit baca</span>
                </span>
                <span aria-hidden="true" className="text-border">·</span>
                <span className="text-pine font-medium">Informasi Medis Terverifikasi</span>
              </div>

              {data.ringkasan && (
                <p className="mt-3 max-w-2xl text-body font-body leading-relaxed text-muted-foreground text-pretty">
                  {data.ringkasan}
                </p>
              )}
              {data.patogen && data.patogen.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.patogen.map((pg) => (
                    <Link
                      key={pg.id}
                      to={`/patogen/${pg.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-ui font-body font-medium text-ink transition hover:border-pine/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {(() => {
            const artikelList = Array.isArray(data.artikel)
              ? data.artikel
              : data.artikel
                ? [data.artikel]
                : [];
            const artikelAda = artikelList.filter(
              (a) => !isEmptyKonten(a.konten),
            );

            return artikelAda.length > 0 ? (
              <div className="mt-6 space-y-8">
                {artikelAda.map((article) => (
                  <ArticleProse key={article.id} onTocChange={setTocItems}>
                    {article.konten}
                  </ArticleProse>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pine/10 text-pine">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-ink">
                    Artikel Edukasi Sedang Dipersiapkan
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                    Konten mendalam untuk {data.nama} sedang dalam tahap peninjauan. Anda dapat menanyakan ringkasan awal langsung ke Asisten AI melalui tombol chat di bawah.
                  </p>
                </div>
                {data.bagian_tubuh.length > 0 && (
                  <div className="pt-2">
                    <Link
                      to="/body-map"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink hover:bg-muted transition"
                    >
                      Eksplorasi Bagian Tubuh Lainnya →
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}
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
          {data.patogen && data.patogen.length > 0 && (
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
                      <span className="rounded-md bg-pine/10 px-2 py-0.5 font-body text-xs uppercase tracking-wide text-pine">
                        {pg.jenis}
                      </span>
                      <h3 className="text-h4 font-display text-ink">{pg.nama}</h3>
                    </div>
                    {pg.deskripsi && (
                      <p className="mt-2 text-body-sm font-body leading-relaxed text-muted-foreground line-clamp-3">
                        {pg.deskripsi}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {data.referensi.length > 0 && (
            <section className="mt-10 border-t border-border pt-6">
              <ArticleHeading>Referensi</ArticleHeading>
              <ul className="mt-4 space-y-2">
                {data.referensi.map((ref) => (
                  <li key={ref.id} className="text-body-sm font-body">
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
          )}
          <div className="mt-8 md:mt-10">
            <MedicalDisclaimer />
          </div>
        </article>
        <aside className="hidden lg:block lg:sticky lg:top-20 space-y-8 lg:max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <TableOfContents items={tocItems} />
          <BodyPartPreview ids={data.bagian_tubuh.map((part) => part.id)} />
        </aside>
      </div>
    </div>
  );
}
