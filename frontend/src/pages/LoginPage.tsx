import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FadeIn } from "@/components/FadeIn";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Email/username dan password wajib diisi");
      return;
    }

try {
       setIsSubmitting(true);
       const user = await login({ identifier: identifier.trim(), password });
       if (user.role === "admin") {
         navigate("/admin", { replace: true });
       } else {
         navigate(from, { replace: true });
       }
     } catch (err) {
       if (err instanceof ApiError) {
         setError(err.message);
       } else {
         setError("Gagal masuk. Silakan coba lagi.");
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
              Akun Pengguna
            </p>
            <h1 className="mt-2 font-display text-2xl md:text-3xl font-medium text-ink tracking-tight">
              Masuk ke Akun
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Akses riwayat dan fitur analisis kesehatan Anda
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
                htmlFor="identifier"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Email atau Username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="nama@email.com atau username"
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
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-1 focus:ring-pine disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-pine text-white hover:bg-pine/90"
            >
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              to="/register"
              className="font-medium text-pine hover:underline"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
