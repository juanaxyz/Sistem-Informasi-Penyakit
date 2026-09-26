import { FadeIn } from "@/components/FadeIn";

const STEPS = [
  {
    nomor: "01",
    judul: "Explore",
    deskripsi: "Select a body part",
  },
  {
    nomor: "02",
    judul: "Discover",
    deskripsi: "Explore related diseases",
  },
  {
    nomor: "03",
    judul: "Analyze",
    deskripsi: "Use AI to analyze images",
  },
];

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mt-12 py-6 md:mt-16"
    >
      <h2 id="how-it-works-heading" className="mb-2 text-lg font-medium text-pine">
        How It Works
      </h2>
      <div className="relative mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
        <div
          aria-hidden="true"
          className="absolute left-8 right-8 top-7 hidden h-px border-t border-dashed border-border md:block"
        />
        {STEPS.map((step, index) => (
          <FadeIn key={step.nomor} delay={index * 0.1}>
            <div className="relative text-center md:px-2">
              <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card font-mono text-sm text-pine shadow-sm">
                {step.nomor}
              </span>
              <h3 className="mt-4 font-display text-lg font-medium text-ink">
                {step.judul}
              </h3>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.deskripsi}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}