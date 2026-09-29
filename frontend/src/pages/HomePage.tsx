import { useEffect } from "react";
import Faq from "../components/Faq";
import Hero from "../components/home/Hero";
import HowItWorks from "../components/home/HowItWorks";
import Statistics from "../components/home/Statistics";
import ExploreSystems from "../components/home/ExploreSystems";
import AiAnalysisPreview from "../components/home/AiAnalysisPreview";
import DiseaseInformation from "../components/home/DiseaseInformation";
import TrustedSources from "../components/home/TrustedSources";
import FinalCta from "../components/home/FinalCta";
import DisclaimerPill from "../components/home/DisclaimerPill";

export default function HomePage() {
  useEffect(() => {
    document.title = "Peta Kesehatan";
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      {/* ==================== HERO ==================== */}
      <Hero />

      {/* ==================== HOW IT WORKS ==================== */}
      <HowItWorks />

      {/* ==================== STATISTICS ==================== */}
      <Statistics />

      {/* ==================== EXPLORE YOUR BODY ==================== */}
      <ExploreSystems />

      {/* ==================== AI ANALYSIS PREVIEW ==================== */}
      <AiAnalysisPreview />

      {/* ==================== DISEASE INFORMATION ==================== */}
      <DiseaseInformation />

      {/* ==================== TRUSTED SOURCES ==================== */}
      <TrustedSources />

      {/* ==================== FINAL CALL TO ACTION ==================== */}
      <FinalCta />

      {/* FAQ */}
      <Faq />

      {/* ==================== DISCLAIMER FOOTER ==================== */}
      <DisclaimerPill />
    </div>
  );
}