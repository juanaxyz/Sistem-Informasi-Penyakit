import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api, resolveAssetUrl } from "@/lib/api";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const riwayatId = id ? parseInt(id, 10) : Number.NaN;
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["riwayat-detail", riwayatId],
    queryFn: async () => {
      return await api.riwayat.detail(riwayatId);
    },
    enabled: !isNaN(riwayatId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["riwayat-detail", riwayatId] });
    queryClient.invalidateQueries({ queryKey: ["riwayat"] });
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.analysis.run(riwayatId);
      refresh();
    } catch (err) {
      console.error(err);
      alert("Gagal menjalankan analisis kembali");
    } finally {
      setAnalyzing(false);
    }
  };

  if (isLoading) return <FadeIn><div className="text-center py-8">Loading...</div></FadeIn>;
  if (error) return <FadeIn><div className="text-center py-8">Error: {error.message}</div></FadeIn>;

  const riwayat = data?.riwayat;
  if (!riwayat) return <FadeIn><div className="text-center py-8">Riwayat tidak ditemukan</div></FadeIn>;

  return (
    <div className="mx-auto max-w-4xl py-8">
      <FadeIn>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">Detail Analisis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat #{riwayat.id}
          </p>
        </div>

        <div className="space-y-6">
          {/* Gambar */}
          <div className="rounded-lg overflow-hidden border">
            <img
              src={resolveAssetUrl(riwayat.gambar)}
              alt="Gambar X-ray"
              className="w-full h-96 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/placeholder.png";
              }}
            />
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>Tanggal Analisis</div>
              <div>
                {new Date(riwayat.dibuat_pada).toLocaleDateString("id-ID")} {new Date(riwayat.dibuat_pada).toLocaleTimeString("id-ID")}
              </div>
              <div>Status</div>
              <div>
                <Badge variant={riwayat.status === "completed" ? "success" : riwayat.status === "failed" ? "destructive" : "warning"}>
                  {riwayat.status === "processing" ? "Sedang diproses" : riwayat.status === "completed" ? "Selesai" : "Gagal"}
                </Badge>
              </div>
              <div>File Gambar</div>
              <div>{riwayat.gambar.split("/").pop()}</div>
            </div>
          </div>

          {/* Hasil Prediksi */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-ink">Hasil Prediksi Model AI</h2>
            {riwayat.predictions && riwayat.predictions.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versi</th>
                        <th className="px-6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penyakit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {riwayat.predictions.map((p, idx) => (
                        <tr key={p.id} className={idx % 2 === 0 ? "bg-gray-50" : "white"}>
                          <td className="px-6 py-4 text-sm text-gray-900">{p.model}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{p.versi}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{p.penyakit}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{p.kode}</td>
                          <td className="px-6 py-4 text-sm text-font-mono">{p.confidence.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Confidence menunjukkan tingkat keyakinan model pada prediksi tersebut.
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Belum ada hasil prediksi. Jalankan analisis terlebih dahulu.
              </p>
            )}
          </div>

          {/* Tombol Uji Coba Kembali */}
          <div className="flex justify-end">
            <Button
              onClick={runAnalysis}
              disabled={analyzing || isFetching}
              className="bg-pine text-white hover:bg-pine/90"
            >
              {analyzing ? "Menganalisis..." : "Uji Coba Analisis Kembali"}
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}