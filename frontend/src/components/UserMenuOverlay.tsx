import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  FileText,
  LogOut,
  Pencil,
  ScanLine,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import type { User } from "@/lib/types";
import type { UpdateProfilePayload } from "@/context/auth-context-base";

interface UserMenuOverlayProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onUpdateProfile: (payload: UpdateProfilePayload) => Promise<User>;
}

function OverlayContent({
  onClose,
  user,
  onLogout,
  onUpdateProfile,
}: Omit<UserMenuOverlayProps, "open">) {
  const location = useLocation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nama: user.nama,
    email: user.email,
    username: user.username,
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const menuItems = [
    {
      icon: <FileText size={18} />,
      label: "Riwayat",
      to: "/riwayat",
      active: location.pathname.startsWith("/riwayat"),
    },
    {
      icon: <ScanLine size={18} />,
      label: "Analisis",
      to: "/analisis",
      active: location.pathname.startsWith("/analisis"),
    },
    ...(user.role === "admin"
      ? [
          {
            icon: <ShieldCheck size={18} />,
            label: "Panel Admin",
            to: "/admin",
            active: location.pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await onUpdateProfile({
        nama: form.nama.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password || undefined,
      });
      setSuccess("Profil berhasil diperbarui");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <motion.aside
      className="fixed inset-y-0 right-0 z-99 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-2xl"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      role="dialog"
      aria-modal="true"
      aria-label="Menu pengguna"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-white">
            <UserIcon size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {user.nama}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} />
        </button>
      </div>

      <div className="border-b border-border px-5 py-4 bg-background ">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Detail Profil
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setError(null);
              setSuccess(null);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil size={12} />
            {editing ? "Batal" : "Edit"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="ov-name"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Nama
              </label>
              <input
                id="ov-name"
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="ov-email"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Email
              </label>
              <input
                id="ov-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="ov-username"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Username
              </label>
              <input
                id="ov-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="ov-password"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Password baru (opsional)
              </label>
              <input
                id="ov-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Kosongkan jika tidak diganti"
                className={inputClass}
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-green-700" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-pine px-3 py-2.5 text-xs font-medium text-white transition hover:bg-pine/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        ) : (
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-muted-foreground">Nama</dt>
              <dd className="text-sm font-medium text-ink">{user.nama}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Username</dt>
              <dd className="text-sm font-medium text-ink">@{user.username}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="text-sm font-medium text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Peran</dt>
              <dd className="text-sm font-medium text-ink">
                {user.role === "admin" ? (
                  <span className="rounded bg-pine/10 px-1.5 py-0.5 text-[10px] font-mono text-pine">
                    Admin
                  </span>
                ) : (
                  "Pengguna"
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 bg-background">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  item.active ? "bg-pine text-white" : "text-ink hover:bg-muted"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border p-3 bg-background">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </motion.aside>
  );
}

export function UserMenuOverlay({
  open,
  onClose,
  user,
  onLogout,
  onUpdateProfile,
}: UserMenuOverlayProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <OverlayContent
            onClose={onClose}
            user={user}
            onLogout={onLogout}
            onUpdateProfile={onUpdateProfile}
          />
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}