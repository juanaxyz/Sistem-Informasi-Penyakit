import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  ScanLine,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { useBodyParts } from "@/hooks/useBodyParts";

import frontFigure from "/images/front.png";

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

const LEARN = [
  {
    icon: Activity,
    title: "Tingkat urgensi",
    desc: "Setiap penyakit diberi label Normal, Waspada, atau Darurat agar Anda tahu kapan perlu ke tenaga medis.",
  },
  {
    icon: BookOpen,
    title: "Bahasa sederhana",
    desc: "Penjelasan menghindari jargon medis yang berat, sehingga mudah dipahami semua kalangan.",
  },
  {
    icon: ShieldCheck,
    title: "Sumber terpercaya",
    desc: "Konten dirancang dari acuan institusi resmi seperti WHO, Kemenkes RI, dan CDC.",
  },
  {
    icon: Stethoscope,
    title: "Edukasi, bukan diagnosis",
    desc: "Informasi untuk membantu Anda memahami kondisi sebelum berkonsultasi dengan tenaga kesehatan.",
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

  const { data: bodyParts } = useBodyParts();

  const stats = [
    {
      value: bodyParts != null ? String(bodyParts.length) : "–",
      label: "Bagian tubuh",
    },
    { value: "3", label: "Tingkat urgensi" },
    { value: "2", label: "Tampilan peta" },
    { value: "3", label: "Sumber acuan" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <motion.section
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.08 }}
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
            Kenali tubuh Anda,
            <br />
            <span className="text-pine">pahami gejalanya</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground text-pretty lg:mx-0">
            Pelajari bagian tubuh, sistem yang berkaitan, dan informasi penyakit
            dengan bahasa sederhana. Bersifat edukasi — bukan pengganti diagnosis
            medis.
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
              <Link to="/analisis-xray">
                <ScanLine className="mr-2 h-4 w-4" aria-hidden="true" />
                Coba Analisis X-Ray
              </Link>
            </Button>
          </div>

          <p className="mt-6 font-mono text-xs text-muted-foreground">
            Tanpa login · Gratis · Untuk edukasi
          </p>
        </motion.div>

        <motion.figure variants={fade} className="hidden lg:col-span-5 lg:block">
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
              Peta tubuh interaktif · Depan &amp; Belakang
            </figcaption>
          </div>
        </motion.figure>
      </motion.section>

      <section
        aria-label="Statistik Peta Kesehatan"
        className="mt-2 border-y border-border py-6 md:mt-6"
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1.5 font-display text-3xl font-medium text-ink">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 md:mt-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Yang bisa dipelajari
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-medium text-ink tracking-tight text-balance">
            Informasi yang jelas, <span className="text-pine">bukan menakutkan</span>.
          </h2>
          <p className="mt-4 text-sm md:text-base leading-relaxed text-muted-foreground text-pretty">
            Setiap penyakit dikemas supaya mudah dipahami — dari tingkat urgensi
            hingga kapan saatnya mencari bantuan medis.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {LEARN.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-border/70 bg-paper p-5"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mint text-pine">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-base font-medium text-ink">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed text-pretty">
                    {desc}
                  </p>
                </div>
              </div>
              {title === "Tingkat urgensi" && (
                <div className="mt-4 flex flex-wrap items-center gap-2 pl-14">
                  <UrgencyBadge level="normal" />
                  <UrgencyBadge level="waspada" />
                  <UrgencyBadge level="darurat" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 md:mt-16">
        <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Cara kerja
        </p>
        <div className="relative mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
          <div
            aria-hidden="true"
            className="absolute left-8 right-8 top-7 hidden h-px border-t border-dashed border-border md:block"
          />
          {STEPS.map((step) => (
            <div
              key={step.nomor}
              className="relative text-center md:px-2"
            >
              <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card font-mono text-sm text-pine shadow-sm">
                {step.nomor}
              </span>
              <h3 className="mt-4 font-display text-lg font-medium text-ink">
                {step.judul}
              </h3>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm text-muted-foreground leading-relaxed text-pretty">
                {step.deskripsi}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 md:mt-16">
        <div className="relative overflow-hidden rounded-2xl bg-pine px-6 py-12 text-center shadow-sm md:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.16)_0%,transparent_60%)]"
          />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-widest text-white/70">
              Siap menjelajah?
            </p>
            <h2 className="mx-auto mt-3 max-w-xl font-display text-3xl md:text-4xl font-medium text-white leading-tight tracking-tight text-balance">
              Mulai dari peta tubuh Anda.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80 leading-relaxed text-pretty">
              Pilih bagian tubuh dan sistem yang berkaitan untuk memahami gejala
              dan tingkat urgensinya.
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
                <Link to="/analisis-xray">
                  <ScanLine className="mr-2 h-4 w-4" aria-hidden="true" />
                  Coba Analisis X-Ray
                </Link>
              </Button>
            </div>
          </div>
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