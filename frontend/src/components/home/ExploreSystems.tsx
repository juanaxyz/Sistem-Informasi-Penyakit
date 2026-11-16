import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bone,
  Brain,
  Droplets,
  Fingerprint,
  FlaskConical,
  HeartPulse,
  ShieldCheck,
  Users,
  Utensils,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSistemTubuh } from "@/hooks/useSistemTubuh";

type SystemMeta = {
  icon: LucideIcon;
  desc: string;
};

/**
 * Meta tampilan per nama sistem. Server hanya menyimpan id dan nama, jadi
 * ikon serta deskripsi dipetakan di sisi klien. Sistem yang belum punya
 * pemetaan tetap tampil dengan ikon dan deskripsi umum.
 */
const SYSTEM_META: Record<string, SystemMeta> = {
  "Sistem Pernapasan": {
    icon: Wind,
    desc: "Paru-paru, saluran napas, dan pertukaran oksigen",
  },
  "Sistem Kardiovaskular": {
    icon: HeartPulse,
    desc: "Jantung, pembuluh darah, dan aliran darah",
  },
  "Sistem Pencernaan": {
    icon: Utensils,
    desc: "Mulut, lambung, usus, dan penyerapan nutrisi",
  },
  "Sistem Saraf": {
    icon: Brain,
    desc: "Otak, saraf, dan sumsum tulang belakang",
  },
  "Sistem Muskuloskeletal": {
    icon: Bone,
    desc: "Tulang, otot, sendi, dan pergerakan",
  },
  "Sistem Endokrin": {
    icon: FlaskConical,
    desc: "Hormon dan kelenjar pengatur tubuh",
  },
  "Sistem Urinaria": {
    icon: Droplets,
    desc: "Ginjal, kandung kemih, dan pembuangan cairan",
  },
  "Sistem Reproduksi": {
    icon: Users,
    desc: "Organ dan proses reproduksi",
  },
  "Sistem Integumen": {
    icon: Fingerprint,
    desc: "Kulit, rambut, dan kuku",
  },
  "Sistem Imun dan Limfatik": {
    icon: ShieldCheck,
    desc: "Pertahanan tubuh dan kelenjar limfa",
  },
};

const FALLBACK_META: SystemMeta = {
  icon: Activity,
  desc: "Informasi penyakit pada sistem tubuh ini",
};

export default function ExploreSystems() {
  const { data, isLoading } = useSistemTubuh();
  const systems = [...(data ?? [])].sort((a, b) => a.id - b.id);

  return (
    <section
      aria-labelledby="explore-systems-heading"
      className="mt-12 md:mt-16"
    >
      <h2 id="explore-systems-heading" className="text-h2 font-display text-ink">
        Jelajahi Penyakit Berdasarkan Sistem Tubuh
      </h2>
      <p className="mt-3 max-w-xl text-body font-body leading-relaxed text-muted-foreground">
        Mulai dari sistem tubuh, lalu telusuri bagian tubuh dan penyakit yang
        berkaitan dengannya.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[74px] w-full rounded-xl" />
            ))
          : systems.map((sys) => {
              const meta = SYSTEM_META[sys.nama] ?? FALLBACK_META;
              const Icon = meta.icon;
              return (
                <Link
                  key={sys.id}
                  to="/body-map"
                  className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-pine">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-h4 font-display text-ink">{sys.nama}</p>
                    <p className="mt-0.5 text-body-sm font-body text-muted-foreground">
                      {meta.desc}
                    </p>
                  </div>
                  <ArrowRight
                    className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
      </div>

      <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
        <Link to="/body-map">
          Jelajahi Peta Tubuh
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
