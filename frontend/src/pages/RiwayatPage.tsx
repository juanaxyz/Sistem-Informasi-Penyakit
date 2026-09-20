import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RiwayatPage() {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["riwayat", limit, offset],
    queryFn: async () => {
      const res = await api.riwayat.list(limit, offset);
      // We don't have total count from API; we can approximate or add another endpoint.
      // For simplicity, we'll set total to data length (not accurate for pagination).
      // We'll skip pagination for now and just load all.
      return res;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["riwayat"] });
  };

  if (isLoading) return <FadeIn><div className="text-center py-8">Loading...</div></FadeIn>;
  if (error) return <FadeIn><div className="text-center py-8">Error: {(error as any).message}</div></FadeIn>;

  const riwayatList = data?.riwayat ?? [];

  return (
    <div className="mx-auto max-w-4xl py-8">
      <FadeIn>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">Riwayat Analisis Saya</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {riwayatList.length} riwayat analisis
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Button
              onClick={() => {
                setLimit(limit + 20);
                refresh();
              }}
              variant="outline"
            >
              Muat Lebih Banyak
            </Button>
            <Button onClick={refresh} variant="outline">
              Segarkan
            </Button>
          </div>
        </div>

        {riwayatList.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Belum ada riwayat analisis. Mulai dengan mengunggah gambar X-ray.
          </p>
        ) : (
          <div className="space-y-4">
            {riwayatList.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-ink">{r.gambar.split("/").pop() ?? "Gambar X-ray"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tanggal: {new Date(r.dibuat_pada).toLocaleDateString("id-ID")} {new Date(r.dibuat_pada).toLocaleTimeString("id-ID")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Status: <Badge variant={r.status === "completed" ? "success" : r.status === "failed" ? "destructive" : "warning"}>
                        {r.status === "processing" ? "Sedang diproses" : r.status === "completed" ? "Selesai" : "Gagal"}
                      </Badge>
                    </p>
                  </div>
                  <div className="text-right">
                    <Link to={`/riwayat/${r.id}`}>
                      <Button variant="outline" size="sm">
                        Lihat Detail
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </FadeIn>
    </div>
  );
}