'use client'

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const productLinks = [
  { label: 'How it works',  id: 'how-it-works' },
  { label: 'Agents',        id: 'agents' },
  { label: 'Skills',        id: 'skills' },
  { label: 'Integrations',  id: 'connectivity' },
  { label: 'Pricing',       id: 'pricing' },
]

const companyLinks = ['About', 'Blog', 'Careers', 'Press']
const legalLinks   = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security']

const socialLinks = [
  { label: 'Twitter / X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { label: 'GitHub',      path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
  { label: 'LinkedIn',    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
]

export default function LandingFooter() {
  return (
    <footer style={{ borderTop: '0.5px solid rgba(42,31,25,0.12)', padding: '4rem 1.75rem 2rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div className="oc-grid-footer" style={{ marginBottom: '3rem' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <svg width="24" height="24" viewBox="0 0 56 56" fill="none">
                <rect width="56" height="56" rx="13" fill="#FF4D00" />
                <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
                <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
                <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
              </svg>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.025em', color: '#2a1f19', fontFamily: 'var(--serif)' }}>
                  Open<span style={{ color: '#FF4D00' }}>Claw</span>
                </div>
                <div style={{ fontSize: '8px', letterSpacing: '0.08em', color: '#a08070', marginTop: '2px' }}>
                  <span style={{ color: '#FF4D00' }}>01</span>.openclaw
                </div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#8a7060', lineHeight: 1.8, maxWidth: '220px' }}>
              Build AI agents for any business field. Ready-made or fully custom, deployed where your team already is.
            </p>
          </div>

          {/* Product */}
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a7060', marginBottom: '1rem', fontWeight: 500, fontFamily: 'var(--mono)' }}>
              Product
            </div>
            {productLinks.map(link => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.id)}
                style={{ display: 'block', fontSize: '13px', color: '#8a7060', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left', transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#2a1f19' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8a7060' }}
              >
                {link.label}
              </button>
            ))}
            <a
              href="/docs"
              style={{ display: 'block', fontSize: '13px', color: '#8a7060', textDecoration: 'none', padding: '4px 0', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2a1f19' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#8a7060' }}
            >
              Documentation ↗
            </a>
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a7060', marginBottom: '1rem', fontWeight: 500, fontFamily: 'var(--mono)' }}>
              Company
            </div>
            {companyLinks.map(item => (
              <a key={item} href="#" style={{ display: 'block', fontSize: '13px', color: '#8a7060', textDecoration: 'none', padding: '4px 0', transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2a1f19' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#8a7060' }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a7060', marginBottom: '1rem', fontWeight: 500, fontFamily: 'var(--mono)' }}>
              Legal
            </div>
            {legalLinks.map(item => (
              <a key={item} href="#" style={{ display: 'block', fontSize: '13px', color: '#8a7060', textDecoration: 'none', padding: '4px 0', transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2a1f19' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#8a7060' }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid rgba(42,31,25,0.2)', paddingTop: '1.5rem' }}>
          <div className="oc-footer-bottom">
            <span style={{ fontSize: '12px', color: '#9a8272' }}>
              © {new Date().getFullYear()} OpenClaw · 01.credit . All rights reserved.
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {socialLinks.map(social => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  style={{ color: '#9a8272', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2a1f19' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#9a8272' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
