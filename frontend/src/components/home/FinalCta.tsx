import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="mt-12 py-6 md:mt-16"
    >
      <div className="relative overflow-hidden rounded-2xl bg-pine px-6 py-12 text-center shadow-sm md:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.16)_0%,transparent_60%)]"
        />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-widest text-white/70">
            Siap menjelajah?
          </p>
          <h2
            id="final-cta-heading"
            className="mx-auto mt-3 max-w-xl font-display text-3xl font-medium leading-tight tracking-tight text-balance text-white md:text-4xl"
          >
            Mulai dari peta tubuh Anda.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-white/80">
            Pilih bagian tubuh dan sistem yang berkaitan untuk memahami
            gejala dan tingkat urgensinya.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-white text-pine hover:bg-white/90 sm:w-auto"
            >
              <Link to="/body-map">
                Jelajahi Peta Tubuh
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Link to="/analisis">Coba Analisis</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}