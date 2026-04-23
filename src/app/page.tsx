import dynamic from 'next/dynamic'
import Navbar from '../../components/Navbar'
import ClawScrollSection from '../../components/ClawScrollSection'
import HeroSection from '../../components/landing/HeroSection'
import ProductSection from '../../components/landing/ProductSection'
import Divider from '../../components/landing/ui/Divider'
import { landingStyles } from '../../components/landing/landingStyles'

// Below-fold sections — split into separate JS chunks, still SSR-rendered
const InfraSection       = dynamic(() => import('../../components/landing/InfraSection'))
const ConnectivitySection = dynamic(() => import('../../components/landing/ConnectivitySection'))
const SkillHubSection    = dynamic(() => import('../../components/landing/SkillHubSection'))
const PricingSection     = dynamic(() => import('../../components/landing/PricingSection'))
const FAQSection         = dynamic(() => import('../../components/landing/FAQSection'))
const CTASection         = dynamic(() => import('../../components/landing/CTASection'))
const LandingFooter      = dynamic(() => import('../../components/landing/LandingFooter'))

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
