import { useState, type ReactNode } from "react";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { useBodyParts } from "../hooks/useBodyParts";
import { useSystemsByBodyPart } from "../hooks/useSystemsByBodyPart";
import { useAnalysesByBodyPart } from "../hooks/useAnalysesByBodyPart";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import type { AnalysisTypeRecord } from "@/lib/types";
import {
  ArrowRight,
  Check,
  ScanLine,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type AnalysisOption = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
};

// Ikon dipetakan dari kolom `icon` tabel jenis_analisis (fallback ke ScanLine).
const ANALYSIS_ICONS: Record<string, ReactNode> = {
  "scan-line": <ScanLine className="h-5 w-5" />,
};

const analysisToOption = (a: AnalysisTypeRecord): AnalysisOption => ({
  id: String(a.id),
  name: a.nama,
  description: a.deskripsi ?? "Analisis untuk bagian tubuh yang dipilih.",
  icon: ANALYSIS_ICONS[a.icon ?? ""] ?? <ScanLine className="h-5 w-5" />,
});

function AnalysisSelectionModal({
  open,
  bodyPartName,
  analyses,
  loading,
  onClose,
  onSelect,
}: {
  open: boolean;
  bodyPartName: string;
  analyses: AnalysisOption[];
  loading?: boolean;
  onClose: () => void;
  onSelect: (analysis: AnalysisOption) => void;
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-pine/60">
                Bagian tubuh
              </p>

              <h2 className="mt-1 text-xl font-semibold text-ink">
                {bodyPartName}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Pilih analisis yang ingin dilakukan.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-mint hover:text-pine"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-5">
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-pine border-t-transparent" />
              </div>
            ) : analyses.length > 0 ? (
              analyses.map((analysis) => (
                <button
                  key={analysis.id}
                  type="button"
                  onClick={() => onSelect(analysis)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:border-pine/30 hover:bg-mint/40 hover:shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint text-pine transition-colors duration-200 group-hover:bg-pine group-hover:text-white">
                    {analysis.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-ink">{analysis.name}</h3>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {analysis.description}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-pine" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                <p className="text-sm font-medium text-ink">
                  Belum ada analisis tersedia
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Bagian tubuh ini belum memiliki jenis analisis. Saat ini baru
                  dada kiri dan dada kanan yang dapat dianalisis.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-mint/20 px-6 py-4">
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Informasi ini bersifat edukasi dan bukan diagnosis medis.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const STEPS = ["Unggah", "Pratinjau", "Hasil"];

function AnalyzePage({
  analysis,
  bodyPartName,
  onBack,
}: {
  analysis: AnalysisOption;
  bodyPartName: string | null;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [riwayatId, setRiwayatId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStep = file == null ? 0 : analyzed ? 2 : 1;

  const resetPreview = () => {
    setFile(null);
    setPreviewUrl(null);
    setAnalyzed(false);
    setRiwayatId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    // Validate file type
    if (!selectedFile.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPG, PNG, WEBP, dll.)");
      resetPreview();
      return;
    }
    // Validate size (max 10 MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB");
      resetPreview();
      return;
    }
    setFile(selectedFile);
    setError(null);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setAnalyzed(false);
    setRiwayatId(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await api.riwayat.create(file);
      setRiwayatId(res.id);
      await api.analysis.run(res.id);
      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah atau memulai analisis");
    } finally {
      setUploading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!riwayatId) return;
    setAnalyzing(true);
    setError(null);
    try {
      await api.analysis.run(riwayatId);
      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menjalankan analisis kembali");
    } finally {
      setAnalyzing(false);
    }
  };

  if (uploading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pine border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowRight className="mr-1.5 h-4 w-4 rotate-180" aria-hidden="true" />
          Kembali
        </Button>

        <span className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-pine">
          {bodyPartName ?? "Bagian tubuh"}
          <span aria-hidden="true">·</span>
          {analysis.name}
        </span>
      </div>

      <header className="mt-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-pine">
          {analysis.name}
        </p>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-medium text-ink tracking-tight text-balance">
          Unggah, lihat pratinjau, analisis.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
          {analysis.description} Hasil pada halaman ini bersifat edukasi dan
          tidak boleh dipakai untuk keputusan medis.
        </p>
      </header>

      <FadeIn delay={0.1}>
        <ol className="mt-8 flex items-center justify-center">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <li key={step} className="flex items-center">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={`mx-2 h-px w-8 sm:w-12 ${
                      isDone ? "bg-pine" : "bg-border"
                    }`}
                  />
                )}
                <span className="flex items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition-colors ${
                      isDone
                        ? "border-pine bg-pine text-white"
                        : isActive
                          ? "border-pine bg-mint/50 text-pine"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`font-mono text-xs ${
                      isDone || isActive
                        ? "font-medium text-pine"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </FadeIn>

      <motion.section
        layout
        className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative overflow-hidden rounded-lg bg-background">
                <img
                  src={previewUrl}
                  alt="Pratinjau gambar yang diunggah"
                  className="mx-auto max-h-80 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={resetPreview}
                  aria-label="Hapus gambar"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground shadow-sm transition-colors hover:text-red-600 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate font-mono">{file?.name}</span>
                <span className="shrink-0 font-mono">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                </span>
              </div>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={analyzed}
                className="mt-4 w-full bg-pine text-white hover:bg-pine/90"
              >
                Mulai Analisis
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </motion.div>
          ) : (
            <motion.button
              key="upload"
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                const input = document.getElementById(
                  "file-input",
                ) as HTMLInputElement;
                input.value = "";
                input?.click();
              }}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-background py-14 text-center transition-colors hover:border-pine/40 hover:bg-mint/30 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint text-pine">
                <Upload className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-ink">
                Klik untuk memilih gambar
              </span>
              <span className="text-xs text-muted-foreground">
                Format JPG, PNG, atau WEBP
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.section>

      <input
        id="file-input"
        onSubmit={handleUpload}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {analyzed && riwayatId !== null && (
        <FadeIn delay={0.2}>
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-pine">
              Hasil Analisis
            </p>
            <h2 className="mt-2 font-display text-xl font-medium text-ink">
              Analisis Selesai
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Analisis telah selesai. Lihat detail hasil di bawah.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => {
                  navigate(`/riwayat/${riwayatId}`);
                }}
                className="w-full bg-pine text-white hover:bg-pine/90"
              >
                Lihat Detail Riwayat
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Atau jalankan uji coba ulang dengan hasil yang mungkin berbeda.
            </p>
            <Button
              onClick={handleReanalyze}
              disabled={analyzing}
              className="mt-2 w-full bg-pine/20 text-pine hover:bg-pine/30"
            >
              {analyzing ? "Menganalisis..." : "Uji Coba Analisis Kembali"}
            </Button>
          </motion.section>
        </FadeIn>
      )}

      {error && (
        <FadeIn>
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            {error}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisOption | null>(
    null,
  );

  const { data: bodyParts = [] } = useBodyParts();
  const { data: systems = [] } = useSystemsByBodyPart(selectedPartId);
  const {
    data: analyses = [],
    isFetching: analysesLoading,
  } = useAnalysesByBodyPart(selectedPartId);

  const selectedPartName =
    selectedPartId != null
      ? (bodyParts.find((p) => p.id === selectedPartId)?.nama ?? null)
      : null;

  const selectedPartMeta =
    selectedPartId != null && systems.length > 0
      ? `${systems.length} sistem`
      : undefined;

  const handlePartClick = (id: number) => {
    setSelectedPartId(id);
    setShowAnalysisModal(true);
  };

  const handleSelectAnalysis = (analysis: AnalysisOption) => {
    setShowAnalysisModal(false);
    setActiveAnalysis(analysis);
  };

  return (
    <div>
      {activeAnalysis ? (
        <AnalyzePage
          analysis={activeAnalysis}
          bodyPartName={selectedPartName}
          onBack={() => setActiveAnalysis(null)}
        />
      ) : (
        <>
          <FadeIn>
            <section className="mb-6 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-pine">
                Analisis Gambar
              </p>
              <h1 className="mt-2 font-display text-3xl md:text-4xl font-medium text-ink tracking-tight text-balance">
                Pilih bagian tubuh untuk dianalisis.
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
                Ketuk area pada peta tubuh, lalu pilih jenis analisis yang
                tersedia untuk bagian tersebut.
              </p>
            </section>
          </FadeIn>

          <BodyMap
            selectedPartId={selectedPartId}
            onSelectPart={handlePartClick}
            selectedPartMeta={selectedPartMeta}
          />

          <AnalysisSelectionModal
            open={showAnalysisModal}
            bodyPartName={selectedPartName ?? "Bagian tubuh"}
            analyses={analyses.map(analysisToOption)}
            loading={analysesLoading}
            onClose={() => setShowAnalysisModal(false)}
            onSelect={handleSelectAnalysis}
          />
        </>
      )}
    </div>
  );
}