import { useState, type ReactNode } from "react";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { useBodyParts } from "../hooks/useBodyParts";
import { useSystemsByBodyPart } from "../hooks/useSystemsByBodyPart";
import { useAnalysesByBodyPart } from "../hooks/useAnalysesByBodyPart";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnalysisTypeRecord, Prediction } from "@/lib/types";
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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/20 px-4 py-6 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className="my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-h3 font-display text-ink">
                {bodyPartName}
              </h2>

              <p className="mt-1 text-body-sm font-body text-muted-foreground">
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

          <div className="space-y-3 overflow-y-auto p-5 ">
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-pine border-t-transparent" />
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
                    <h3 className="text-h4 font-display text-ink">{analysis.name}</h3>

                    <p className="mt-1 text-body-sm font-body leading-relaxed text-muted-foreground">
                      {analysis.description}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-pine" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
                <p className="text-h4 font-display text-ink">
                  Belum ada analisis tersedia
                </p>
                <p className="mt-1 text-body-sm font-body leading-relaxed text-muted-foreground">
                  Bagian tubuh ini belum memiliki jenis analisis. Saat ini baru
                  dada kiri dan dada kanan yang dapat dianalisis.
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-mint/20 px-6 py-4">
            <p className="text-center text-body-sm font-body leading-relaxed text-muted-foreground">
              Informasi ini bersifat edukasi dan bukan diagnosis medis.
            </p>
          </div>
        </div>
      </div>
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
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const currentStep = file == null ? 0 : analyzed ? 2 : 1;

  const resetPreview = () => {
    setFile(null);
    setPreviewUrl(null);
    setAnalyzed(false);
    setRiwayatId(null);
    setPredictions([]);
  };

  const fetchPredictions = async (id: number) => {
    try {
      const res = await api.riwayat.detail(id);
      if (res.riwayat?.predictions) {
        setPredictions(res.riwayat.predictions);
      }
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    }
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
      await fetchPredictions(res.id);
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
      await fetchPredictions(riwayatId);
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
        <div className="h-8 w-8 rounded-full border-4 border-pine border-t-transparent" />
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

        <span className="inline-flex items-center gap-2 rounded-full border border-pine/20 bg-pine/5 px-3 py-1 font-body text-ui font-medium text-pine">
          {bodyPartName ?? "Bagian tubuh"}
          <span aria-hidden="true">·</span>
          {analysis.name}
        </span>
      </div>

      <header className="mt-6 text-center">
        <h1 className="text-h1 font-display text-ink tracking-tight text-balance">
          Unggah, lihat pratinjau, analisis.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-body font-body text-muted-foreground leading-relaxed text-pretty">
          {analysis.description} Hasil pada halaman ini bersifat edukasi dan
          tidak boleh dipakai untuk keputusan medis.
        </p>
      </header>

        <ol className="mt-8 flex flex-wrap items-center justify-center gap-y-2" aria-label="Langkah analisis">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <li key={step} className="flex items-center">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={`mx-1 h-px w-6 shrink-0 sm:w-12 ${
                      isDone ? "bg-pine" : "bg-border"
                    }`}
                  />
                )}
                <span className="flex items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
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
                    className={`whitespace-nowrap font-body text-ui ${
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

        {(() => {
          if (previewUrl) {
            return (
              <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div key="preview">
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

                  <div className="mt-3 flex items-center justify-between gap-3 text-body-sm font-body text-muted-foreground">
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
                </div>
              </section>
            );
          }
          return (
            <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
              <button
                key="upload"
                type="button"
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
              </button>
            </section>
          );
        })()}

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
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-h4 font-display text-ink">
            Analisis Selesai
          </h2>
          <p className="mt-4 text-body-sm font-body text-muted-foreground">
            Analisis telah selesai. Hasil prediksi di bawah.
          </p>
          
          {predictions.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-h4 font-display text-ink">Hasil Prediksi Model AI</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-ui font-body font-medium uppercase tracking-wider text-muted-foreground">Model</th>
                      <th className="px-4 py-3 text-left text-ui font-body font-medium uppercase tracking-wider text-muted-foreground">Versi</th>
                      <th className="px-4 py-3 text-left text-ui font-body font-medium uppercase tracking-wider text-muted-foreground">Penyakit</th>
                      <th className="px-4 py-3 text-left text-ui font-body font-medium uppercase tracking-wider text-muted-foreground">Kode</th>
                      <th className="px-4 py-3 text-left text-ui font-body font-medium uppercase tracking-wider text-muted-foreground">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {predictions.map((p, idx) => (
                      <tr key={p.id} className={idx % 2 === 0 ? "bg-muted/30" : "bg-transparent"}>
                        <td className="px-4 py-3 text-body font-body text-foreground">{p.model}</td>
                        <td className="px-4 py-3 text-body font-body text-foreground">{p.versi}</td>
                        <td className="px-4 py-3 text-body font-body text-foreground">{p.penyakit}</td>
                        <td className="px-4 py-3 text-body font-body text-foreground">{p.kode ?? "-"}</td>
                        <td className="px-4 py-3 text-body font-mono">
                          {p.confidence.toFixed(3)}
                          <Badge 
                            variant={
                              p.confidence >= 0.8 ? "success" : 
                              p.confidence >= 0.5 ? "warning" : "destructive"
                            } 
                            className="ml-2"
                          >
                            {p.confidence >= 0.8 ? "Tinggi" : p.confidence >= 0.5 ? "Sedang" : "Rendah"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-body-sm font-body text-muted-foreground">
                Confidence menunjukkan tingkat keyakinan model pada prediksi tersebut.
              </p>
            </div>
          )}

          {predictions.length === 0 && (
            <p className="mt-4 text-center text-muted-foreground py-8">
              Belum ada hasil prediksi. Jalankan analisis terlebih dahulu.
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                navigate(`/riwayat/${riwayatId}`);
              }}
              className="flex-1 bg-pine text-white hover:bg-pine/90"
            >
              Lihat Detail Riwayat
            </Button>
            <Button
              onClick={handleReanalyze}
              disabled={analyzing}
              className="flex-1 bg-pine/20 text-pine hover:bg-pine/30"
            >
              {analyzing ? "Menganalisis..." : "Uji Coba Analisis Kembali"}
            </Button>
          </div>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
        >
          {error}
        </div>
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
          <section className="mb-6 text-center">
            <h1 className="text-h1 font-display text-ink tracking-tight text-balance">
              Pilih bagian tubuh untuk dianalisis.
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-body font-body text-muted-foreground leading-relaxed text-pretty">
              Ketuk area pada peta tubuh, lalu pilih jenis analisis yang
              tersedia untuk bagian tersebut.
            </p>
          </section>

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