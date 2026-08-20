import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import frontFigure from "/images/front.png";

const fade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  transition: { staggerChildren: 0.08 },
};

export default function Hero() {
  return (
    <motion.section
      initial="hidden"
      animate="show"
      transition={fade}
      className="grid items-center gap-10 py-10 md:py-16 lg:grid-cols-12"
    >
      <motion.div
        variants={fade}
        className="text-center lg:col-span-7 lg:text-left"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-pine">
          Atlas tubuh interaktif
        </p>
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-medium text-ink leading-tight tracking-tight text-balance">
          Understand Your Body. Explore Diseases.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground text-pretty lg:mx-0">
          Explore diseases through an interactive body map and analyze chest
          X-ray images with AI-powered technology.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/body-map">
              Explore Body Map
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link to="/analisis-xray">Try AI Analysis</Link>
          </Button>
        </div>

        <p className="mt-6 font-mono text-xs text-muted-foreground">
          Tanpa login · Gratis · Untuk edukasi
        </p>
      </motion.div>

      <motion.figure
        variants={fade}
        className="hidden lg:col-span-5 lg:block"
      >
        <div className="relative mx-auto max-w-[16rem]">
          <div className="relative rounded-xl border border-border bg-card p-3 shadow-sm outline outline-1 outline-dashed outline-pine/25 outline-offset-4">
            <div className="overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_28%,var(--color-mint)_0%,var(--color-mint)/20_72%,transparent_100%)]">
              <img
                src={frontFigure}
                alt="Ilustrasi peta tubuh manusia tampak depan"
                className="mx-auto h-[22rem] w-auto object-contain mix-blend-multiply"
              />
            </div>
          </div>
          <figcaption className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Peta tubuh interaktif · Depan & Belakang
          </figcaption>
        </div>
      </motion.figure>
    </motion.section>
  );
}