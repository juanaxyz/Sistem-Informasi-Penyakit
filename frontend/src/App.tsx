import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import HomePage from "./pages/HomePage";
import { BodyMapPage } from "./pages/BodyMapPage";
import XRayAnalysisPage from "./pages/XRayAnalysisPage";
import Dock from "./react-bits/components/Dock";

import { House, ScanSearch, ScanLine } from "lucide-react";
import { DiseaseDetailPage } from "./pages/DiseaseDetailPage";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      icon: <House size={18} />,
      label: "Home",
      active: location.pathname === "/",
      onClick: () => navigate("/"),
    },
    {
      icon: <ScanSearch size={18} />,
      label: "Body Map",
      active: location.pathname.startsWith("/body-map"),
      onClick: () => navigate("/body-map"),
    },
    {
      icon: <ScanLine size={18} />,
      label: "Analisis X-Ray",
      active: location.pathname.startsWith("/analisis-xray"),
      onClick: () => navigate("/analisis-xray"),
    },
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-28">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/body-map" element={<BodyMapPage />} />
          <Route path="/analisis-xray" element={<XRayAnalysisPage />} />

          {/* Detail penyakit */}
          <Route path="/penyakit/:id" element={<DiseaseDetailPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <Dock
          className="bg-background"
          items={items}
          panelHeight={68}
          baseItemSize={50}
          magnification={70}
        />
      </div>

      <footer className="border-t border-border bg-muted/30 py-4">
        <p className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground font-mono">
          Informasi ini bersifat edukasi, bukan diagnosis medis. Konsultasikan
          dengan tenaga kesehatan untuk penanganan yang tepat.
        </p>
      </footer>
    </div>
  );
}
