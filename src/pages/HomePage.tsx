import { AnalyticsSection } from '@/components/home/AnalyticsSection'
import { CTASection } from '@/components/home/CTASection'
import { EducationAiSection } from '@/components/home/EducationAiSection'
import { FeaturesSection } from '@/components/home/FeaturesSection'
import { Footer } from '@/components/home/Footer'
import { GallerySection } from '@/components/home/GallerySection'
import { HeroSection } from '@/components/home/HeroSection'
import { Navbar } from '@/components/home/Navbar'
import { ToolsSection } from '@/components/home/ToolsSection'

/**
 * Public landing page (route "/").
 * A clean, white, image-rich EdTech marketing homepage — photographic hero,
 * image cards, platform features, education + AI split, analytics band,
 * photo gallery and a final CTA. Designed in the style of a modern library
 * management website: white background, spacious sections, minimal shadows,
 * purple used only as a small accent. All numbers shown are static demo
 * values (labelled as such); nothing is wired to backend data.
 */
export function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-slate-900 antialiased">
      <Navbar />
      <main>
        <HeroSection />
        <ToolsSection />
        <FeaturesSection />
        <EducationAiSection />
        <AnalyticsSection />
        <GallerySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
