import { useState } from "react";
import { BodyMap } from "../components/bodyMap/BodyMap";
import { useBodyParts } from "../hooks/useBodyParts";
import { useSystemsByBodyPart } from "../hooks/useSystemsByBodyPart";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/react-bits/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { Upload } from "lucide-react";

function ShowAlert({ category }: { category: string }) {
  return (
    <Alert className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
      <AlertTitle>Analisis Bagian {category}</AlertTitle>
      <AlertDescription>
        disini pilih analisis apa yang akan di lakukan pada bagian tubuh yang di
        pilih, misal analisis tulang, analisis otot, analisis organ, dll.
      </AlertDescription>
    </Alert>
  );
}

function AnalyzePage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [riwayatId, setRiwayatId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    // Validate size (max 10 MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10 MB");
      setFile(null);
      setPreviewUrl(null);
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
      const res = await api.riwayat.create({ gambar: file.name }); // We only send filename; actual storage handling would be on backend
      // In a real app, we would upload the file to a storage service and store the URL.
      // For simplicity, we assume the backend accepts the filename and stores it somewhere.
      // We'll just use the filename as the gambar field.
      setRiwayatId(res.id);
      // After creating riwayat, trigger analysis
      await api.analysis.run(res.id);
      setAnalyzed(true);
    } catch (err: any) {
      setError(err.message ?? "Gagal mengunggah atau memulai analisis");
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
    } catch (err: any) {
      setError(err.message ?? "Gagal menjalankan analisis kembali");
    } finally {
      setAnalyzing(false);
    }
  };

  if (uploading) {
    return (
      <span>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pine border-t-transparent" />
        </div>
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button type="button" variant="outline" onClick={onBack}>
        ← Kembali
      </Button>
      <span>
        <header className="text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-pine">
            Analisis X-Ray
          </p>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-medium text-ink tracking-tight text-balance">
            Unggah, lihat pratinjau, analisis.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed text-pretty">
            Demo alur kerja analisis gambar dada. Hasil di halaman ini adalah
            contoh dan tidak boleh dipakai untuk keputusan medis.
          </p>
        </header>
      </span>

      <FadeIn delay={0.1}>
        <ol className="mt-8 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          {["Unggah", "Pratinjau", "Hasil"].map((s, i) => {
            const done = (file != null && i <= 1) || (analyzed && i <= 2);
            return (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && <span className="opacity-40">/</span>}
                <span className={done ? "text-pine" : ""}>{s}</span>
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
                  alt="Pratinjau gambar X-ray yang diunggah"
                  className="mx-auto max-h-80 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setAnalyzed(false);
                    setRiwayatId(null);
                  }}
                  aria-label="Hapus gambar"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground shadow-sm transition-colors hover:text-ink hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
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
        ref={(el) => {
          // Not needed
        }}
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
              Atau uji coba analisis lagi dengan hasil yang mungkin berbeda
              (karena stub acak deterministik).
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

export default function XRayAnalysisPage() {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [showAlertMessage, setShowAlertMessage] = useState(false);
  const { data: bodyParts = [] } = useBodyParts();
  const { data: systems = [] } = useSystemsByBodyPart(selectedPartId);
  const [showAnalyzePage, setShowAnalyzePage] = useState(false);

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
    setShowAlertMessage(true);
    console.log("Selected part ID:", id);
    console.log("part Name :", selectedPartName);

    setTimeout(() => {
      setShowAlertMessage(false);
      setShowAnalyzePage(true);
    }, 2500);
  };

  return (
    <div>
      {showAlertMessage && <ShowAlert category="tes" />}

      {showAnalyzePage ? (
        <AnalyzePage onBack={() => setShowAnalyzePage(false)} />
      ) : (
        <BodyMap
          selectedPartId={selectedPartId}
          onSelectPart={handlePartClick}
          selectedPartMeta={selectedPartMeta}
        />
      )}
    </div>
  );
}
