import { useRef, useState } from "react";
import { ImagePlus, ScanLine, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";

const SAMPLE_RESULTS = [
  { label: "Tanpa temuan signifikan", persen: 62 },
  { label: "Konsolidasi paru (indikasi)", persen: 28 },
  { label: "Nodul kecil", persen: 10 },
];

export default function XRayAnalysisPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [resultDone, setResultDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResultDone(false);
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImageUrl(null);
    setResultDone(false);
    setAnalyzing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = () => {
    setAnalyzing(true);
    setResultDone(false);
    window.setTimeout(() => {
      setAnalyzing(false);
      setResultDone(true);
    }, 1600);
  };

  return (
    <div className="mx-auto max-w-3xl">
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

      <ol className="mt-8 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
        {["Unggah", "Pratinjau", "Hasil"].map((s, i) => {
          const done = (imageUrl != null && i <= 1) || (resultDone && i <= 2);
          return (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span className="opacity-40">/</span>}
              <span className={done ? "text-pine" : ""}>{s}</span>
            </li>
          );
        })}
      </ol>

      <motion.section
        layout
        className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <AnimatePresence mode="wait">
          {imageUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative overflow-hidden rounded-lg bg-background">
                <img
                  src={imageUrl}
                  alt="Pratinjau gambar X-ray yang diunggah"
                  className="mx-auto max-h-80 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Hapus gambar"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/90 text-muted-foreground shadow-sm transition-colors hover:text-ink hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <Button
                onClick={analyze}
                disabled={analyzing}
                className="mt-4 w-full gap-2 hover:cursor-pointer"
              >
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                {analyzing ? "Menganalisis…" : "Analisis Gambar"}
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
              onClick={() => inputRef.current?.click()}
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
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <AnimatePresence>
        {resultDone && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-pine">
              Hasil contoh
            </p>
            <h2 className="mt-2 font-display text-xl font-medium text-ink">
              Kemungkinan temuan
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {SAMPLE_RESULTS.map((r) => (
                <li key={r.label}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink">{r.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.persen}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-pine"
                      style={{ width: `${r.persen}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-background p-3 text-xs text-muted-foreground leading-relaxed">
              <ImagePlus
                className="mt-0.5 h-4 w-4 shrink-0 text-pine"
                aria-hidden="true"
              />
              Ini hasil contoh untuk keperluan demo. Konsultasikan gambar Anda
              dengan tenaga kesehatan profesional.
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}