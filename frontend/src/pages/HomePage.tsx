import { useEffect } from "react";
import { FadeIn } from "@/components/FadeIn";
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
      <FadeIn>
        <HowItWorks />
      </FadeIn>

      {/* ==================== STATISTICS ==================== */}
      <FadeIn>
        <Statistics />
      </FadeIn>

      {/* ==================== EXPLORE YOUR BODY ==================== */}
      <FadeIn>
        <ExploreSystems />
      </FadeIn>

      {/* ==================== AI ANALYSIS PREVIEW ==================== */}
      <FadeIn>
        <AiAnalysisPreview />
      </FadeIn>

      {/* ==================== DISEASE INFORMATION ==================== */}
      <FadeIn>
        <DiseaseInformation />
      </FadeIn>

      {/* ==================== TRUSTED SOURCES ==================== */}
      <FadeIn>
        <TrustedSources />
      </FadeIn>

      {/* ==================== FINAL CALL TO ACTION ==================== */}
      <FadeIn>
        <FinalCta />
      </FadeIn>

      {/* FAQ */}
      <FadeIn>
        <Faq />
      </FadeIn>

      {/* ==================== DISCLAIMER FOOTER ==================== */}
      <FadeIn>
        <DisclaimerPill />
      </FadeIn>
    </div>
  );
}