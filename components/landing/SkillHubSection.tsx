import { Wand2, Download, Sliders, Lock } from 'lucide-react'
import SectionLabel from './ui/SectionLabel'

const features = [
  {
    icon: <Wand2 size={16} color="#FF4D00" />,
    title: 'Auto-Generated Skills',
    desc: 'Every new agent arrives with a curated skill set for its domain. A Legal agent ships with case search, contract review, and memo drafting. No setup needed.',
  },
  {
    icon: <Download size={16} color="#FF4D00" />,
    title: 'Import Pre-Built Skills',
    desc: 'Browse the Skill Hub library and import ready-made capabilities into any agent instantly. Web search, PDF generation, data analysis, external API calls, and more.',
  },
  {
    icon: <Sliders size={16} color="#FF4D00" />,
    title: 'Custom Skill Builder',
    desc: 'Define any skill in plain language. Your agent learns exactly how to handle that task: legal research, HR queries, logistics planning, financial analysis, anything.',
  },
  {
    icon: <Lock size={16} color="#FF4D00" />,
    title: 'Domain-Locked Execution',
    desc: "Skills stay scoped to their agent's domain. Every execution is boundary-checked so responses stay accurate and never drift outside the agent's designated field.",
  },
]

export default function SkillHubSection() {
  return (
    <section id="skills" style={{ padding: '6rem 1.75rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <SectionLabel text="Skill Hub" />
        <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'flex-end', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h2 className="oc-section-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600, letterSpacing: '-0.04em', margin: '0 0 1.25rem', lineHeight: 1.1 }}>
              The more skills they have, the more <em>they automate.</em>
            </h2>
            <p style={{ color: '#8a7060', fontSize: '1rem', lineHeight: 1.9, margin: 0 }}>
              Every agent ships with auto-generated skills for its domain. Import ready-made skills from the library, or build custom ones with plain-language instructions. There is no ceiling on what they can execute.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <img
              src="/images/skills.png"
              alt="Skill Hub"
              style={{ width: 'clamp(220px, 28vw, 380px)', height: 'auto', display: 'block' }}
            />
          </div>
        </div>
        <div className="oc-grid-skills">
          {features.map(f => (
            <div key={f.title} style={{
              background: '#f0e8de',
              border: '0.5px solid rgba(42,31,25,0.12)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,77,0,0.08)', border: '0.5px solid rgba(255,77,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#2a1f19' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#8a7060', lineHeight: 1.75 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
