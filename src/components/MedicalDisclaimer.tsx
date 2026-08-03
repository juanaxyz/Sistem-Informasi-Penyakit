import { Info } from "lucide-react";

export function MedicalDisclaimer() {
  return (
    <div className="rounded-lg border border-border bg-mint/50 p-4 text-sm text-muted-foreground">
      <div className="flex items-start gap-2.5">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-pine" aria-hidden="true" />
        <p>
          Informasi ini bersifat edukasi, bukan diagnosis medis. Konsultasikan dengan
          tenaga kesehatan untuk penanganan yang tepat. Jika Anda mengalami gejala
          serius, segera hubungi tenaga kesehatan atau layanan darurat.
        </p>
      </div>
    </div>
  );
}
