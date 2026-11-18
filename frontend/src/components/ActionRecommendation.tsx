import { Activity, Home, Stethoscope, type LucideIcon } from "lucide-react";
import type { Prediction } from "@/lib/types";

type Tier = "konsultasi" | "pantau" | "ringan";

const TIER_CONFIG: Record<
  Tier,
  {
    label: string;
    title: string;
    body: string;
    Icon: LucideIcon;
    badge: string;
    card: string;
    iconWrap: string;
  }
> = {
  konsultasi: {
    label: "Segera ke Tenaga Kesehatan",
    title: "Segera konsultasikan ke tenaga kesehatan",
    body: "Tingkat keyakinan model cukup tinggi. Jangan menunda—buat janji dengan dokter umum atau kunjungi fasilitas kesehatan terdekat, bawa gambar yang diunggah dan daftar gejala yang dirasakan.",
    Icon: Stethoscope,
    badge:
      "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    card: "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20",
    iconWrap: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  pantau: {
    label: "Pantau di Rumah",
    title: "Pantau kondisi, waspadai perubahan",
    body: "Hasil menunjukkan kemungkinan ringan-sedang. Istirahat cukup, jaga hidrasi, dan catat perkembangan gejala. Segera ke dokter bila gejala memburuk atau tidak membaik dalam 2–3 hari.",
    Icon: Activity,
    badge:
      "border-pine/30 bg-pine/10 text-pine dark:text-pine-foreground",
    card: "border-pine/30 bg-pine/5 dark:bg-pine/10",
    iconWrap: "bg-pine/15 text-pine",
  },
  ringan: {
    label: "Perawatan Mandiri",
    title: "Belum ada indikasi yang signifikan",
    body: "Tingkat keyakinan model masih rendah. Lanjutkan pola hidup sehat dan cukup istirahat. Ulangi analisis bila gejala baru muncul atau memburuk.",
    Icon: Home,
    badge:
      "border-border bg-muted text-muted-foreground",
    card: "border-border bg-muted/30",
    iconWrap: "bg-muted text-muted-foreground",
  },
};

/**
 * Kartu rekomendasi tindakan berdasarkan confidence tertinggi.
 * ponytail: tier diturunkan dari confidence karena hasil model belum membawa
 * tingkat_urgensi; saat backend menambah kolom urgensi pada prediksi, ganti
 * threshold ini dengan nilai tersebut.
 */
export function ActionRecommendation({
  predictions,
}: {
  predictions: Prediction[];
}) {
  if (predictions.length === 0) return null;

  const top = [...predictions].sort((a, b) => b.confidence - a.confidence)[0];
  const tier: Tier =
    top.confidence >= 0.8 ? "konsultasi" : top.confidence >= 0.5 ? "pantau" : "ringan";
  const cfg = TIER_CONFIG[tier];
  const { Icon } = cfg;

  return (
    <div
      role="status"
      className={`rounded-xl border p-4 sm:p-5 ${cfg.card}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink sm:text-base">
              {cfg.title}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.badge}`}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {cfg.body}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Prediksi utama: <span className="font-medium text-ink">{top.penyakit}</span>{" "}
            (keyakinan {top.confidence.toFixed(2)})
          </p>
        </div>
      </div>
    </div>
  );
}
