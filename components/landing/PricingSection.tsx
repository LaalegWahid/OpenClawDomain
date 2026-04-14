'use client'

import { useEffect, useRef } from 'react'
import SectionLabel from './ui/SectionLabel'
import Check from './ui/Check'

interface PricingTier {
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  cta: string
  highlighted: boolean
}

const sharedFeatures = [
  'Bring Your Own Key (BYOK)',
  'Telegram, Discord & WhatsApp',
  'Unlimited commands',
  'PDF report delivery',
  'MCP integrations',
  'Skill Hub access',
  'No conversation logging',
  '99.9% uptime SLA',
]

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$30',
    period: 'agent / mo',
    desc: 'Up to 5 agents.',
    features: sharedFeatures,
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$29',
    period: 'agent / mo',
    desc: 'Up to 10 agents.',
    features: sharedFeatures,
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Scale',
    price: '$28',
    period: 'agent / mo',
    desc: 'Up to 20 agents.',
    features: sharedFeatures,
    cta: 'Start free trial',
    highlighted: false,
  },
]

export default function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sec = sectionRef.current
    if (!sec) return
    const cards = sec.querySelectorAll('.oc-pricing-card')
    cards.forEach(el => {
      (el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'scale(0.9) translateY(20px)'
    })
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        cards.forEach((el, i) => {
          setTimeout(() => {
            (el as HTMLElement).style.transition = 'opacity 0.6s ease, transform 0.6s ease'
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'scale(1) translateY(0)'
          }, i * 180)
        })
        obs.disconnect()
      }
    }, { threshold: 0.15 })
    obs.observe(sec)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="pricing" style={{ padding: '6rem 1.75rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <SectionLabel text="Pricing" />
          <h2 className="oc-section-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600, letterSpacing: '-0.04em' }}>
            Simple, <em>transparent</em> pricing.
          </h2>
          <p style={{ color: '#8a7060', fontSize: '1rem', marginTop: '0.5rem' }}>
            Per agent. No flat fees. Scale up or down anytime.
          </p>
        </div>

        <div style={{
          marginBottom: '2rem', padding: '1rem 1.5rem', borderRadius: '12px',
          background: 'rgba(255,77,0,0.05)', border: '0.5px solid rgba(255,77,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <span style={{ color: '#FF4D00', fontSize: '14px' }}>◆</span>
          <span style={{ fontSize: '13px', color: '#5a4a40' }}>
            Every plan includes a <strong style={{ color: '#2a1f19' }}>15-day free trial</strong> on your first agent. No credit card required.
          </span>
        </div>

        <div className="oc-grid-pricing">
          {tiers.map(tier => (
            <div key={tier.name} className="oc-pricing-card" style={{
              background: tier.highlighted ? '#eae0d4' : '#f0e8de',
              border: tier.highlighted ? '1px solid rgba(255,77,0,0.3)' : '0.5px solid rgba(42,31,25,0.12)',
              borderRadius: '16px', padding: '2rem',
              position: 'relative', display: 'flex', flexDirection: 'column',
              boxShadow: tier.highlighted ? '0 0 50px rgba(255,77,0,0.07)' : 'none',
            }}>
              {tier.highlighted && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: '#FF4D00', color: '#fff', fontSize: '10px', fontWeight: 600,
                  padding: '4px 12px', borderRadius: '100px', letterSpacing: '0.08em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  Best Value
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '13px', color: tier.highlighted ? '#FF4D00' : '#8a7060', fontWeight: 500, marginBottom: '0.5rem' }}>
                  {tier.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 500, letterSpacing: '-0.04em', color: '#2a1f19', fontFamily: 'var(--serif)' }}>
                    {tier.price}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9a8272', lineHeight: 1.4 }}>/ {tier.period}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#8a7060', marginTop: '0.5rem', lineHeight: 1.5 }}>{tier.desc}</p>
              </div>
              <div style={{ flex: 1, marginBottom: '1.75rem' }}>
                {tier.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <Check />
                    <span style={{ fontSize: '13px', color: '#8a7060', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  border: tier.highlighted ? 'none' : '0.5px solid rgba(42,31,25,0.15)',
                  background: tier.highlighted ? '#FF4D00' : 'transparent',
                  color: tier.highlighted ? '#fff' : '#2a1f19',
                  transition: 'opacity 0.2s',
                }}
                onClick={() => window.location.href = '/register'}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
