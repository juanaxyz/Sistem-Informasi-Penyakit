import { Link } from "react-router-dom";
import { Activity, ArrowRight, Brain, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const SYSTEMS = [
  {
    icon: Activity,
    name: "Pernapasan",
    desc: "Paru-paru, saluran napas & pernapasan",
  },
  {
    icon: Heart,
    name: "Pencernaan",
    desc: "Lambung, usus & metabolisme",
  },
  {
    icon: Brain,
    name: "Saraf",
    desc: "Otak, saraf & sumsum tulang belakang",
  },
];

export default function ExploreSystems() {
  return (
    <section
      aria-labelledby="explore-systems-heading"
      className="mt-12 md:mt-16"
    >
      <h2 id="explore-systems-heading" className="text-h2 font-display text-ink">
        Jelajahi Penyakit Berdasarkan Sistem Tubuh
      </h2>
      <p className="mt-3 max-w-xl text-body font-body leading-relaxed text-muted-foreground">
        Mulai dari bagian tubuh dan temukan penyakit yang terkait dengannya.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SYSTEMS.map((sys) => (
          <Link
            key={sys.name}
            to="/body-map"
            className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-pine">
              <sys.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-h4 font-display text-ink">
                {sys.name}
              </p>
              <p className="mt-0.5 text-body-sm font-body text-muted-foreground">
                {sys.desc}
              </p>
            </div>
            <ArrowRight
              className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
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