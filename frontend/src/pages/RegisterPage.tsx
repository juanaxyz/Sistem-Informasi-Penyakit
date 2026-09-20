import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nama.trim() || !email.trim() || !username.trim() || !password) {
      setError("Semua kolom wajib diisi");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username minimal 3 karakter");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        nama: nama.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal mendaftar. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <FadeIn>
        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-pine">
              Pendaftaran Akun
            </p>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-medium text-ink tracking-tight">
              Buat Akun Baru
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Daftar untuk menyimpan riwayat dan mengakses fitur sistem
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="nama"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Nama Lengkap
              </label>
              <input
                id="nama"
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                autoComplete="name"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="Nama Anda"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="username_anda"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="Ulangi password"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-pine text-white hover:bg-pine/90"
            >
              {isSubmitting ? "Memproses..." : "Daftar Akun"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              to="/login"
              className="font-medium text-pine hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
