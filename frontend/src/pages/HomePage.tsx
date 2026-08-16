import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Bone,
  ScanLine,
  Stethoscope,
} from "lucide-react";

const STEPS = [
  {
    nomor: "01",
    judul: "Pilih bagian tubuh",
    deskripsi: "Klik area pada peta tubuh yang ingin Anda ketahui.",
  },
  {
    nomor: "02",
    judul: "Pilih sistem tubuh",
    deskripsi: "Tentukan sistem yang berkaitan, misal pernapasan atau saraf.",
  },
  {
    nomor: "03",
    judul: "Temukan informasi penyakit",
    deskripsi: "Baca ringkasan, gejala, dan tingkat urgensi. Edukasi, bukan diagnosis.",
  },
];

const ACTIONS = [
  {
    icon: Bone,
    title: "Body Map",
    desc: "Jelajahi bagian tubuh dan sistem yang berkaitan.",
    to: "/body-map",
  },
  {
    icon: ScanLine,
    title: "Analisis X-Ray",
    desc: "Unggah gambar untuk analisis contoh.",
    to: "/analisis-xray",
  },
];

const fade = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  useEffect(() => {
    document.title = "Peta Kesehatan";
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <motion.section
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.08 }}
        className="py-10 md:py-16 text-center"
      >
        <motion.p
          variants={fade}
          className="font-mono text-xs uppercase tracking-widest text-pine"
        >
          Peta Kesehatan
        </motion.p>
        <motion.h1
          variants={fade}
          className="mt-4 font-display text-4xl md:text-6xl font-medium text-ink leading-tight"
        >
          Kenali tubuh Anda,
          <br />
          <span className="text-pine">pahami gejalanya</span>.
        </motion.h1>
        <motion.p
          variants={fade}
          className="mx-auto mt-6 max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground"
        >
          Pelajari bagian tubuh, sistem yang berkaitan, dan informasi penyakit
          dengan bahasa sederhana. Bersifat edukasi — bukan pengganti diagnosis
          medis.
        </motion.p>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map(({ icon: Icon, title, desc, to }) => (
          <Link
            key={to}
            to={to}
            className="group block rounded-xl border border-border bg-card p-6 text-left shadow-sm hover:border-pine/40 hover:bg-mint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-mint text-pine">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-medium text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {desc}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs text-pine">
              Mulai
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-12 md:mt-16">
        <h2 className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Cara kerja
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.nomor}
              className="rounded-xl border border-border/70 bg-paper p-5"
            >
              <span className="font-mono text-sm text-pine">{step.nomor}</span>
              <h3 className="mt-2 font-display text-base font-medium text-ink">
                {step.judul}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {step.deskripsi}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 md:mt-16 pb-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-mono text-xs text-muted-foreground">
          <Stethoscope className="h-4 w-4 text-pine" aria-hidden="true" />
          Informasi untuk edukasi, bukan diagnosis medis.
        </div>
      </section>
    </div>
  );
}