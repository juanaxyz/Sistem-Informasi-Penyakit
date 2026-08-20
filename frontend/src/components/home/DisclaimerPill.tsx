import { Stethoscope } from "lucide-react";

export default function DisclaimerPill() {
  return (
    <section aria-label="Disclaimer edukasi" className="py-4 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-mono text-xs text-muted-foreground">
        <Stethoscope className="h-4 w-4 text-pine" aria-hidden="true" />
        Informasi untuk edukasi, bukan diagnosis medis.
      </div>
    </section>
  );
}