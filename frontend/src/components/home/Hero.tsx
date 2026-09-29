import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------- Data (urutan array = urutan animasi) ---------- */

type Step =
  | {
      type: "card";
      id: string;
      src: string;
      alt: string;
      aspect: string;
      position: string;
    }
  | {
      type: "arrow";
      id: string;
      position: string;
      rotate: string;
    };

const STEPS: readonly Step[] = [
  {
    type: "card",
    id: "initial",
    src: "/images/body-map-first.png",
    alt: "Peta tubuh dalam keadaan awal",
    aspect: "aspect-[16/10]",
    position: "left-0 top-[3%] z-10 w-[64%] shadow-lg",
  },
  {
    type: "arrow",
    id: "arrow-down",
    position: "left-[30%] top-[41%]",
    rotate: "rotate-80",
  },
  {
    type: "card",
    id: "selected",
    src: "/images/list-sistem.png",
    alt: "Peta tubuh setelah memilih bagian tubuh",
    aspect: "aspect-[16/10]",
    position: "bottom-12 left-[5%] z-20 w-[72%] shadow-xl",
  },
  {
    type: "arrow",
    id: "arrow-up-right",
    position: "left-[57%] top-[54%] z-20",
    rotate: "-rotate-30",
  },
  {
    type: "card",
    id: "result",
    src: "/images/list-penyakit.png",
    alt: "Hasil informasi penyakit",
    aspect: "aspect-[4/5]",
    position: "-right-[10%] top-[16%] z-30 w-[45%] shadow-xl",
  },
];

/* ---------- Animation ---------- */

const createVariants = (reduceMotion: boolean) => ({
  // Parent halaman
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  } satisfies Variants,

  item: {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
    show: { opacity: 1, y: 0 },
  } satisfies Variants,

  // Parent showcase: mengatur jeda antar langkah
  showcase: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { delayChildren: 0.5, staggerChildren: 0.45 },
    },
  } satisfies Variants,

  card: {
    hidden: {
      opacity: 0,
      y: reduceMotion ? 0 : 24,
      scale: reduceMotion ? 1 : 0.96,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  } satisfies Variants,

  arrow: {
    hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.4 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
  } satisfies Variants,
});

/* ---------- Sub components ---------- */

function ShowcaseCard({
  step,
  variants,
  priority,
}: {
  step: Extract<Step, { type: "card" }>;
  variants: Variants;
  priority: boolean;
}) {
  return (
    <motion.div
      variants={variants}
      className={cn(
        "absolute overflow-hidden rounded-2xl border border-border bg-card",
        step.position,
      )}
    >
      <div className={cn("bg-muted", step.aspect)}>
        <img
          src={step.src}
          alt={step.alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    </motion.div>
  );
}

function FlowArrow({
  step,
  variants,
}: {
  step: Extract<Step, { type: "arrow" }>;
  variants: Variants;
}) {
  return (
    <motion.div
      aria-hidden="true"
      variants={variants}
      className={cn(
        "absolute z-40 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-md",
        step.position,
      )}
    >
      <ArrowRight className={cn("h-4 w-4", step.rotate)} />
    </motion.div>
  );
}

/* ---------- Main ---------- */

export default function Hero() {
  const reduceMotion = useReducedMotion() ?? false;
  const { container, item, showcase, card, arrow } =
    createVariants(reduceMotion);

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="grid items-center gap-10 py-10 md:py-16 lg:grid-cols-12 lg:gap-6"
    >
      {/* LEFT — Hero content */}
      <motion.div
        variants={item}
        className="text-center lg:col-span-6 lg:text-left"
      >
        <h1 className="text-display font-display text-ink leading-tight tracking-tight text-balance">
          Pahami Tubuh Anda. Jelajahi Penyakit.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-body font-body leading-relaxed text-muted-foreground text-pretty lg:mx-0">
          Jelajahi penyakit lewat peta tubuh interaktif dan analisis gambar
          rontgen dada dengan teknologi AI.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/body-map">
              Jelajahi Peta Tubuh
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link to="/analisis">Coba Analisis AI</Link>
          </Button>
        </div>

        <p className="mt-6 text-body-sm font-body text-muted-foreground">
          Tanpa login · Gratis · Untuk edukasi
        </p>
      </motion.div>

      {/* RIGHT — Product showcase */}
      <motion.figure
        variants={showcase}
        className="hidden lg:col-span-6 lg:block"
      >
        <div className="relative mx-auto h-136 w-full max-w-160">
          {STEPS.map((step, index) =>
            step.type === "card" ? (
              <ShowcaseCard
                key={step.id}
                step={step}
                variants={card}
                priority={index === 0}
              />
            ) : (
              <FlowArrow key={step.id} step={step} variants={arrow} />
            ),
          )}
        </div>

        <figcaption className="mt-2 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Pilih · Jelajahi · Pahami
        </figcaption>
      </motion.figure>
    </motion.section>
  );
}