import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Search,
  User as UserIcon,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { HeaderSearch } from "./HeaderSearch";
import { useAuth } from "@/hooks/useAuth";
import { UserMenuOverlay } from "./UserMenuOverlay";

export function SiteHeader() {
  const { user, logout, updateProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200",
        scrolled
          ? "border-border bg-background/95 shadow-sm supports-[backdrop-filter]:bg-background/80"
          : "border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/60",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-3">
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              aria-hidden="true"
              className="h-7 w-1.5 rounded-full bg-pine transition-transform duration-200 group-hover:scale-y-110"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Peta Kesehatan
            </span>
          </Link>

          <div className="mx-auto hidden min-w-0 flex-1 sm:block sm:max-w-md sm:pl-2">
            <HeaderSearch />
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={searchOpen ? "Tutup pencarian" : "Cari penyakit atau gejala"}
              aria-expanded={searchOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  title="Menu pengguna"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-ui font-body font-medium text-ink transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
                >
                  <UserIcon size={14} className="text-pine" />
                  <span className="max-w-16 truncate sm:max-w-24">{user.nama}</span>
                  {user.role === "admin" && (
                    <span className="hidden rounded bg-pine/10 px-1.5 py-0.5 text-xs font-body text-pine sm:inline">
                      Admin
                    </span>
                  )}
                  <ChevronDown size={13} className="text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  title="Keluar"
                  aria-label="Keluar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogOut size={14} />
                </button>
                <UserMenuOverlay
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  user={user}
                  onLogout={logout}
                  onUpdateProfile={updateProfile}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/login"
                  className="inline-flex h-9 items-center rounded-lg px-2.5 text-ui font-body font-medium text-ink transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-pine px-3 text-ui font-body font-medium text-white shadow-sm transition-colors hover:bg-pine/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3.5"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              key="mobile-search"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden sm:hidden"
            >
              <div className="pb-3">
                <HeaderSearch autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
