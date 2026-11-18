import { lazy, Suspense } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { ChatWidget } from "./components/ChatWidget";
import HomePage from "./pages/HomePage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dock from "./react-bits/components/Dock";
import { House, ScanSearch, ScanLine } from "lucide-react";

// Code-split rute berat agar bundle awal ringan
const BodyMapPage = lazy(() =>
  import("./pages/BodyMapPage").then((m) => ({ default: m.BodyMapPage })),
);
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const RiwayatPage = lazy(() => import("./pages/RiwayatPage"));
const AnalysisDetailPage = lazy(() => import("./pages/AnalysisDetailPage"));
const DiseaseDetailPage = lazy(() =>
  import("./pages/DiseaseDetailPage").then((m) => ({
    default: m.DiseaseDetailPage,
  })),
);
const PatogenDetailPage = lazy(() =>
  import("./pages/PatogenDetailPage").then((m) => ({
    default: m.PatogenDetailPage,
  })),
);
const AdminPage = lazy(() => import("./pages/Admin"));
const ChecksPage = lazy(() =>
  import("./pages/ChecksPage").then((m) => ({ default: m.ChecksPage })),
);

function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-label="Memuat konten..."
    >
      <div className="h-8 w-8 rounded-full border-3 border-pine/30 border-t-pine animate-spin" />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      icon: <House size={18} />,
      label: "Beranda",
      active: location.pathname === "/",
      onClick: () => navigate("/"),
    },
    {
      icon: <ScanSearch size={18} />,
      label: "Peta Tubuh",
      active: location.pathname.startsWith("/body-map"),
      onClick: () => navigate("/body-map"),
    },
    {
      icon: <ScanLine size={18} />,
      label: "Analisis",
      active: location.pathname.startsWith("/analisis"),
      onClick: () => navigate("/analisis"),
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-background font-sans">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-28">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/body-map" element={<BodyMapPage />} />
            <Route
              path="/analisis"
              element={
                <ProtectedRoute>
                  <AnalysisPage />
                </ProtectedRoute>
              }
            />
            {/* Riwayat */}
            <Route
              path="/riwayat"
              element={
                <ProtectedRoute>
                  <RiwayatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/riwayat/:id"
              element={
                <ProtectedRoute>
                  <AnalysisDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* Detail penyakit */}
            <Route path="/penyakit/:slug" element={<DiseaseDetailPage />} />
            <Route path="/patogen/:id" element={<PatogenDetailPage />} />
            {/* Admin route - protected for admin role only */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            {/* Dev-only: pengecekan editor Quill & sanitizer. */}
            <Route path="/checks" element={<ChecksPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!location.pathname.startsWith("/admin") && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center">
          <Dock
            className="bg-background"
            items={items}
            panelHeight={60}
            baseItemSize={48}
            magnification={60}
          />
        </div>
      )}

      <footer className="border-t border-border bg-muted/30 pt-4 pb-[max(5rem,env(safe-area-inset-bottom))] sm:py-4">
        <p className="max-w-7xl mx-auto px-4 text-center text-body-sm font-body text-muted-foreground">
          Informasi ini bersifat edukasi, bukan diagnosis medis. Konsultasikan
          dengan tenaga kesehatan untuk penanganan yang tepat.
        </p>
      </footer>

      <ChatWidget />
    </div>
  );
}
