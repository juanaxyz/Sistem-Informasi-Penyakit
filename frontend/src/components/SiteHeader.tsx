import { Link } from "react-router-dom";
import { HeaderSearch } from "./HeaderSearch";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link
          to="/"
          className="font-display text-xl font-semibold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded shrink-0"
        >
          Peta Kesehatan
        </Link>
        <div className="w-full sm:flex-1 sm:max-w-md sm:ml-auto">
          <HeaderSearch />
        </div>
      </div>
    </header>
  );
}
