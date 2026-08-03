import { Link } from "react-router-dom";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="font-display text-xl font-semibold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Sistem Informasi Penyakit
        </Link>
        <span className="font-mono text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
          ATLAS ANATOMI
        </span>
      </div>
    </header>
  );
}
