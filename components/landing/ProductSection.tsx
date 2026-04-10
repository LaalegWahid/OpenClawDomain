import SectionLabel from './ui/SectionLabel'

const steps = [
  { num: '01', title: 'Any Domain', desc: 'Legal, HR, Real Estate, Healthcare, Logistics. Any field you operate in. Define its domain and it works within it, precisely.' },
  { num: '02', title: 'Any Platform', desc: 'Telegram, Discord, or WhatsApp. Your agent shows up where your team already lives. No new interface to learn.' },
  { num: '03', title: 'Live in 2 Minutes', desc: 'Sign up, connect your platform, define the domain. Your first agent is running before your coffee gets cold.' },
]

export default function ProductSection() {
  return (
    <section id="product" style={{ padding: '6rem 1.75rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <SectionLabel text="The Product" />
        <div style={{ marginBottom: '3rem' }}>
          <h2 className="oc-section-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600, letterSpacing: '-0.04em', margin: '0 0 1.25rem', lineHeight: 1.1 }}>
            AI agents that work<br />in the tools your team<br /><em>already uses.</em>
          </h2>
          <p style={{ color: '#8a7060', fontSize: '1rem', lineHeight: 1.9, margin: 0 }}>
            OpenClaw lets any business deploy AI agents that operate inside Telegram, Discord, and WhatsApp.
            No new apps. No engineers. No servers to manage. Each agent knows its domain, executes tasks on demand,
            and proactively reports to you around the clock.
          </p>
        </div>
        <div className="oc-grid-3">
          {steps.map(step => (
            <div key={step.num} style={{
              background: '#f0e8de', border: '0.5px solid rgba(42,31,25,0.12)',
              borderRadius: '16px', padding: '2rem 1.5rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,77,0,0.25) 50%, transparent)' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '160px', height: '160px', background: 'radial-gradient(circle at bottom right, rgba(255,77,0,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ fontSize: '4rem', fontWeight: 500, lineHeight: 1, color: 'rgba(255,77,0,0.22)', marginBottom: '1.25rem', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
                {step.num}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px', color: '#2a1f19' }}>{step.title}</div>
              <div style={{ fontSize: '13px', color: '#8a7060', lineHeight: 1.7 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
