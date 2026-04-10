import SectionLabel from './ui/SectionLabel'

const platforms = [
  {
    name: 'Telegram',
    subtitle: 'Token-based bot',
    desc: 'Webhook delivery. Commands, alerts, and PDF reports arrive directly in any Telegram chat or group. Live in under a minute.',
    icon: '/images/telegram.png',
  },
  {
    name: 'WhatsApp',
    subtitle: 'QR-link connect',
    desc: 'QR-link your number and your agent runs as a WhatsApp contact. Reachable from personal or business accounts instantly.',
    icon: '/images/whatsapp.png',
  },
  {
    name: 'Discord',
    subtitle: 'Bot gateway',
    desc: 'Bot gateway integration. Your agent joins any server, responds in channels or DMs, and works across your entire workspace.',
    icon: '/images/discord.png',
  },
  {
    name: 'MCP',
    subtitle: 'Model Context Protocol',
    desc: 'Connect any external tool, database, or API directly into your agent\'s context. CRMs, spreadsheets, internal APIs. Your agent reaches them all through MCP.',
    icon: '/images/mcp.png',
  },
]

export default function ConnectivitySection() {
  return (
    <section id="connectivity" style={{ padding: '6rem 1.75rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <SectionLabel text="Connectivity" />
        <div style={{ marginBottom: '3rem' }}>
          <h2 className="oc-section-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600, letterSpacing: '-0.04em', margin: '0 0 1.25rem', lineHeight: 1.1 }}>
            Four ways to reach<br /><em>your agents.</em>
          </h2>
          <p style={{ color: '#8a7060', fontSize: '1rem', lineHeight: 1.9, margin: 0 }}>
            Connect your agents to the tools your team already uses. Telegram, WhatsApp, and Discord.
            Or go deeper with MCP: plug any external tool, API, or data source directly into your agent&apos;s skill set.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
          {platforms.map(p => (
            <div key={p.name} style={{
              background: '#f0e8de', border: '0.5px solid rgba(42,31,25,0.12)',
              borderRadius: '16px', padding: '2rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,77,0,0.35) 50%, transparent)' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '160px', height: '160px', background: 'radial-gradient(circle at bottom right, rgba(255,77,0,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.25rem', position: 'relative' }}>
                <img src={p.icon} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#2a1f19', fontFamily: 'var(--serif)', letterSpacing: '-0.02em' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#8a7060', fontFamily: 'var(--mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.subtitle}</div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#8a7060', lineHeight: 1.7, margin: 0, position: 'relative' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
