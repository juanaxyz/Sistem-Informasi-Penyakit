import { Navigate, Route, Routes } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { HomePage } from "./pages/HomePage";
import { DiseaseDetailPage } from "./pages/DiseaseDetailPage";

export default function App() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/penyakit/:id" element={<DiseaseDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-border bg-muted/30 py-4 mt-10">
        <p className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground font-mono">
          Informasi ini bersifat edukasi, bukan diagnosis medis. Konsultasikan dengan tenaga kesehatan untuk
          penanganan yang tepat.
        </p>
      </footer>
    </div>
  );
}
