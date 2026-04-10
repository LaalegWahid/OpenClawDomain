import Navbar from '../../components/Navbar'
import ClawScrollSection from '../../components/ClawScrollSection'
import HeroSection from '../../components/landing/HeroSection'
import ProductSection from '../../components/landing/ProductSection'
import InfraSection from '../../components/landing/InfraSection'
import ConnectivitySection from '../../components/landing/ConnectivitySection'
import SkillHubSection from '../../components/landing/SkillHubSection'
import PricingSection from '../../components/landing/PricingSection'
import FAQSection from '../../components/landing/FAQSection'
import CTASection from '../../components/landing/CTASection'
import LandingFooter from '../../components/landing/LandingFooter'
import Divider from '../../components/landing/ui/Divider'
import { landingStyles } from '../../components/landing/landingStyles'

export default function LandingPage() {
  return (
    <>
      <style>{landingStyles}</style>

      <div style={{ background: '#f8f2ed', color: '#2a1f19', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>

        <Navbar links={[
          { label: 'Product',        scrollId: 'product' },
          { label: 'Infrastructure', scrollId: 'infra' },
          { label: 'Connectivity',   scrollId: 'connectivity' },
          { label: 'Skill Hub',      scrollId: 'skills' },
          { label: 'Pricing',        scrollId: 'pricing' },
          { label: 'Docs',           href: '/docs' },
        ]} />

        <HeroSection />

        <ClawScrollSection />

        <Divider />
        <ProductSection />

        <Divider />
        <InfraSection />

        <Divider />
        <ConnectivitySection />

        <Divider />
        <SkillHubSection />

        <Divider />
        <PricingSection />

        <Divider />
        <FAQSection />

        <Divider />
        <CTASection />

        <LandingFooter />

      </div>
    </>
  )
}
