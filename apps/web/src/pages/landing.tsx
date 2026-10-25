import "@/components/landing/landing.css";
import { AnnouncementSection } from "@/components/landing/announcement-section";
import { CtaFooterSection } from "@/components/landing/cta-footer-section";
import { FeatureTabsSection } from "@/components/landing/feature-tabs-section";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { HeroVisualSection } from "@/components/landing/hero-visual-section";
import { QuickStartSection } from "@/components/landing/quick-start-section";
import { DarkModeSection } from "@/components/landing/darkmode-section";
import { TeamSection } from "@/components/landing/team-section";
import { TemplatesSection } from "@/components/landing/templates-section";

export function Landing() {
  return (
    <div className="landing-root">
      <Header />
      <main>
        <HeroSection />
        <HeroVisualSection />
        <AnnouncementSection />
        <FeatureTabsSection />
        <DarkModeSection />
        <TeamSection />
        <QuickStartSection />
        <TemplatesSection />
      </main>
      {/* Outside <main> so the footer keeps its contentinfo landmark role. */}
      <CtaFooterSection />
    </div>
  );
}

export default Landing;
