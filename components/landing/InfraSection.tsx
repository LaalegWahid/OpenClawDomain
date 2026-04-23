import { Shield, TrendingUp, Clock, Zap } from 'lucide-react'
import Image from 'next/image'
import SectionLabel from './ui/SectionLabel'

const features = [
  { icon: <Shield size={18} color="#FF4D00" />, title: 'Container Isolation', desc: "Every agent runs in a dedicated AWS ECS container. Your data never touches another customer's workspace." },
  { icon: <TrendingUp size={18} color="#FF4D00" />, title: 'Instant Scale', desc: 'Spin up 1 agent or 500. Infrastructure provisions automatically. No planning, no provisioning calls.' },
  { icon: <Clock size={18} color="#FF4D00" />, title: '99.9% Uptime SLA', desc: 'Automatic container restart on failure. OpenClaw monitors every agent continuously, 24/7.' },
  { icon: <Zap size={18} color="#FF4D00" />, title: 'Zero Ops', desc: 'No SSH. No Dockerfile. No pager. You build the agent and we keep it running, always.' },
]

export default function InfraSection() {
  return (
    <section id="infra" style={{ padding: '6rem 1.75rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <SectionLabel text="Infrastructure" />
        <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'flex-end', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 className="oc-section-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600, letterSpacing: '-0.04em', margin: '0 0 1.25rem', lineHeight: 1.1 }}>
              Not a room full<br />of <em><span style={{ color: '#FF4D00' }}>Mac Minis.</span></em>
            </h2>
            <p style={{ color: '#8a7060', fontSize: '1rem', lineHeight: 1.9, margin: 0 }}>
              Self-hosting AI agents means servers to provision, Docker configs to maintain, uptime to monitor,
              and a DevOps hire to babysit it all. OpenClaw runs every agent in its own isolated AWS ECS container.
              Enterprise-grade infrastructure with none of the overhead.
            </p>
          </div>
          <div className="oc-infra-image" style={{ flexShrink: 0 }}>
            <Image
              src="/images/macmini.png"
              alt="Lobster destroying a Mac Mini"
              width={380}
              height={380}
              loading="lazy"
              sizes="(max-width: 640px) 280px, (max-width: 900px) 28vw, 380px"
              style={{ width: 'clamp(220px, 28vw, 380px)', height: 'auto', display: 'block' }}
            />
          </div>
        </div>
        <div className="oc-grid-4">
          {features.map(item => (
            <div key={item.title} style={{
              background: '#f0e8de', border: '0.5px solid rgba(42,31,25,0.12)',
              borderRadius: '16px', padding: '1.75rem',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,77,0,0.08)', border: '0.5px solid rgba(255,77,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#2a1f19' }}>{item.title}</div>
              <div style={{ fontSize: '13px', color: '#8a7060', lineHeight: 1.75 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
