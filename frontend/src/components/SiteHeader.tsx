import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LogOut,
  Search,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { HeaderSearch } from "./HeaderSearch";
import { useAuth } from "@/hooks/useAuth";
import { UserMenuOverlay } from "./UserMenuOverlay";

export function SiteHeader() {
  const { user, logout, updateProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-99">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-3">
        <Link
          to="/"
          className="order-0 font-display text-lg sm:text-xl font-semibold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded shrink-0"
        >
          Peta Kesehatan
        </Link>

        <div className="hidden sm:block sm:flex-1 sm:max-w-md sm:ml-auto sm:order-1">
          <HeaderSearch />
        </div>

        <div className="order-1 sm:order-2 flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Tutup pencarian" : "Cari penyakit atau gejala"}
            aria-expanded={searchOpen}
            className="sm:hidden flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search size={16} />
          </button>
          {user ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                title="Menu pengguna"
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-ui font-body font-medium text-ink transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserIcon size={14} className="text-pine" />
                <span className="max-w-16 sm:max-w-24 truncate">{user.nama}</span>
                {user.role === "admin" && (
                  <span className="rounded bg-pine/10 px-1.5 py-0.2 text-xs font-body text-pine">
                    Admin
                  </span>
                )}
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={logout}
                title="Keluar"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut size={14} />
              </button>
              {user && (
                <UserMenuOverlay
                  open={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  user={user}
                  onLogout={logout}
                  onUpdateProfile={updateProfile}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-ui font-body font-medium text-ink transition hover:bg-muted"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-pine px-3 py-1.5 text-ui font-body font-medium text-white transition hover:bg-pine/90"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              key="mobile-search"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="order-2 w-full overflow-hidden sm:hidden"
            >
              <div className="pt-1">
                <HeaderSearch autoFocus />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}