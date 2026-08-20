import { Stethoscope } from "lucide-react";

const SOURCES = ["WHO", "CDC", "Kemenkes RI"];

export default function TrustedSources() {
  return (
    <section
      aria-labelledby="trusted-sources-heading"
      className="mt-12 md:mt-16"
    >
      <div className="flex items-center justify-center gap-2">
        <Stethoscope className="h-4 w-4 text-pine" aria-hidden="true" />
        <p
          id="trusted-sources-heading"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          Trusted Sources
        </p>
      </div>
      <div className="mt-4 flex items-center justify-center divide-x divide-border">
        {SOURCES.map((source) => (
          <span
            key={source}
            className="px-4 text-sm font-medium text-muted-foreground"
          >
            {source}
          </span>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        Disease information provided by this platform is intended for
        educational and informational purposes and should not be considered
        a substitute for professional medical advice, diagnosis, or
        treatment.
      </p>
    </section>
  );
}