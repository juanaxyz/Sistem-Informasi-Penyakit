import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FadeIn } from "@/components/FadeIn";

interface DashboardData {
  counts: {
    penyakit: number;
    sistem_tubuh: number;
    bagian_tubuh: number;
    artikel: number;
    artikel_bagian: number;
    users: number;
    riwayat: number;
    prediksi: number;
  };
  urgensi: { tingkat_urgensi: string; jumlah: number }[];
  per_sistem: { id: number; nama: string; jumlah_penyakit: number }[];
  artikel_coverage: { total: number; punya_artikel: number };
  users_role: { role: string; jumlah: number }[];
  riwayat_status: { status: string; jumlah: number }[];
  prediksi_penyakit: { nama: string; jumlah: number }[];
}

const URGENSI_COLOR: Record<string, string> = {
  normal: "bg-[var(--urgency-normal)]",
  waspada: "bg-[var(--urgency-waspada)]",
  darurat: "bg-[var(--urgency-darurat)]",
};

const URGENSI_LABEL: Record<string, string> = {
  normal: "Normal",
  waspada: "Waspada",
  darurat: "Darurat",
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-display text-3xl font-semibold text-ink">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h4 className="font-display text-base font-semibold text-ink">{title}</h4>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="truncate pr-2 font-medium text-ink">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.getDashboard();
        if (active) setData(res.dashboard);
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Gagal memuat dashboard");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pine border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const totalUrgensi = data.urgensi.reduce((acc, u) => acc + u.jumlah, 0);
  const totalPenyakit = data.counts.penyakit;
  const belumArtikel = data.artikel_coverage.total - data.artikel_coverage.punya_artikel;
  const artikelPersen =
    data.artikel_coverage.total > 0
      ? Math.round((data.artikel_coverage.punya_artikel / data.artikel_coverage.total) * 100)
      : 0;
  const maxSistem = Math.max(
    1,
    ...data.per_sistem.map((s) => s.jumlah_penyakit),
  );

  return (
    <FadeIn>
      <div className="space-y-6">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">
            Ringkasan Platform
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Gambaran menyeluruh isi konten, cakupan artikel, dan aktivitas analisis
          </p>
        </div>

        {/* Kartu statistik utama */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Penyakit" value={data.counts.penyakit} />
          <StatCard
            label="Sistem Tubuh"
            value={data.counts.sistem_tubuh}
            sub={`${data.per_sistem.filter((s) => s.jumlah_penyakit > 0).length} aktif`}
          />
          <StatCard label="Bagian Tubuh" value={data.counts.bagian_tubuh} />
          <StatCard
            label="Artikel"
            value={data.counts.artikel}
            sub={`${data.counts.artikel_bagian} bagian konten`}
          />
          <StatCard label="Pengguna" value={data.counts.users} />
          <StatCard label="Analisis (Riwayat)" value={data.counts.riwayat} />
          <StatCard label="Prediksi Tersimpan" value={data.counts.prediksi} />
          <StatCard
            label="Cakupan Artikel"
            value={artikelPersen}
            sub={`${data.artikel_coverage.punya_artikel} dari ${data.artikel_coverage.total} penyakit`}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Penyakit per sistem */}
          <Card title="Penyakit per Sistem Tubuh">
            <div className="space-y-3">
              {data.per_sistem.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Belum ada data sistem tubuh
                </p>
              )}
              {data.per_sistem
                .filter((s) => s.jumlah_penyakit > 0)
                .map((s) => (
                  <BarRow
                    key={s.id}
                    label={s.nama}
                    value={s.jumlah_penyakit}
                    max={maxSistem}
                    color="bg-pine"
                  />
                ))}
              {data.per_sistem.length > 0 &&
                data.per_sistem.filter((s) => s.jumlah_penyakit === 0).length >
                  0 && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    {data.per_sistem.filter((s) => s.jumlah_penyakit === 0).length}{" "}
                    sistem lainnya belum memiliki penyakit
                  </p>
                )}
            </div>
          </Card>

          {/* Distribusi urgensi */}
          <Card title="Distribusi Tingkat Urgensi">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full border-[10px] border-[var(--urgency-normal)]">
                <div className="text-center">
                  <p className="font-display text-3xl font-semibold text-ink">
                    {totalPenyakit}
                  </p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                {data.urgensi.map((u) => {
                  const pct =
                    totalUrgensi > 0 ? Math.round((u.jumlah / totalUrgensi) * 100) : 0;
                  return (
                    <div key={u.tingkat_urgensi} className="flex items-center gap-3">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full ${URGENSI_COLOR[u.tingkat_urgensi] ?? "bg-muted"}`}
                      />
                      <span className="w-24 text-sm text-ink">
                        {URGENSI_LABEL[u.tingkat_urgensi] ?? u.tingkat_urgensi}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${URGENSI_COLOR[u.tingkat_urgensi] ?? "bg-muted"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                        {u.jumlah}
                      </span>
                    </div>
                  );
                })}
                {data.urgensi.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Belum ada data
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Cakupan artikel */}
          <Card title="Cakupan Artikel Edukasi">
            <div className="flex items-center gap-6">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-pine">
                <div className="text-center">
                  <p className="font-display text-2xl font-semibold text-ink">
                    {artikelPersen}%
                  </p>
                  <p className="text-xs text-muted-foreground">terisi</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-ink">
                  <span className="font-semibold">
                    {data.artikel_coverage.punya_artikel}
                  </span>{" "}
                  penyakit memiliki artikel
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-ink">{belumArtikel}</span>{" "}
                  belum memiliki artikel
                </p>
              </div>
            </div>
          </Card>

          {/* Aktivitas analisis */}
          <Card title="Aktivitas Analisis">
            {data.riwayat_status.length === 0 &&
            data.prediksi_penyakit.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Belum ada aktivitas analisis
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <h5 className="text-xs uppercase tracking-wider text-muted-foreground">
                    Status Riwayat
                  </h5>
                  {data.riwayat_status.map((r) => (
                    <div
                      key={r.status}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
                    >
                      <span className="capitalize text-ink">{r.status}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.jumlah}
                      </span>
                    </div>
                  ))}
                </div>
                {data.prediksi_penyakit.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Penyakit Terbanyak
                    </h5>
                    <div className="space-y-1.5">
                      {data.prediksi_penyakit.slice(0, 5).map((p, i) => (
                        <div
                          key={p.nama}
                          className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-xs text-pine">
                            #{i + 1}
                          </span>
                          <span className="truncate text-ink">{p.nama}</span>
                          <span className="ml-auto font-mono text-xs text-muted-foreground">
                            {p.jumlah}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Komposisi pengguna */}
          <Card title="Komposisi Pengguna">
            <div className="space-y-3">
              {data.users_role.map((u) => (
                <BarRow
                  key={u.role}
                  label={u.role === "admin" ? "Admin" : "Pengguna"}
                  value={u.jumlah}
                  max={Math.max(1, ...data.users_role.map((x) => x.jumlah))}
                  color="bg-pine"
                />
              ))}
              {data.users_role.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Belum ada pengguna
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </FadeIn>
  );
}