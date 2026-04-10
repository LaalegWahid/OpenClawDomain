'use client'

import { useState, useEffect } from 'react'

interface NavLink {
  label: string
  href?: string
  scrollId?: string
}

interface NavbarProps {
  links?: NavLink[]
}

const Logo = ({ onClick }: { onClick?: () => void }) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', textDecoration: 'none' }}
    onClick={onClick ?? (() => window.location.href = '/')}
  >
    <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
      <rect width="56" height="56" rx="13" fill="#FF4D00" />
      <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
      <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
      <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
    </svg>
    <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.025em', color: '#2a1f19' }}>
      <span style={{ color: '#FF4D00' }}>01.</span>OpenClaw
    </div>
  </div>
)

export default function Navbar({ links = [] }: NavbarProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [navOpen])

  const handleLink = (link: NavLink) => {
    setNavOpen(false)
    if (link.scrollId) {
      const el = document.getElementById(link.scrollId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (link.href) {
      window.location.href = link.href
    }
  }

  const linkStyle: React.CSSProperties = {
    fontSize: '13px', color: '#8a7060', background: 'none',
    border: 'none', cursor: 'pointer', padding: 0,
    textDecoration: 'none', transition: 'color 0.2s',
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(248,242,237,0.92)', backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)', borderBottom: '0.5px solid rgba(42,31,25,0.1)',
      }}>
        <div style={{
          height: '60px', padding: '0 1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Logo onClick={() => window.location.href = '/'} />

          {/* Desktop links */}
          {!isMobile && links.length > 0 && (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              {links.map(link => (
                <button
                  key={link.label}
                  onClick={() => handleLink(link)}
                  style={linkStyle}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2a1f19' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8a7060' }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isMobile && (
              <button
                style={{
                  background: '#FF4D00', color: '#FFFFFF', border: 'none',
                  padding: '8px 18px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: 500, cursor: 'pointer',
                }}
                onClick={() => window.location.href = '/register'}
              >
                Get Started
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => setNavOpen(o => !o)}
                aria-label="Toggle menu"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2a1f19', width: '36px', height: '36px',
                }}
              >
                {navOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <line x1="4" y1="4" x2="16" y2="16" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="4" x2="4" y2="16" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <line x1="2" y1="5" x2="18" y2="5" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="10" x2="18" y2="10" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="15" x2="18" y2="15" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isMobile && navOpen && (
        <div style={{
          position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
          zIndex: 99, background: 'rgba(248,242,237,0.98)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '1.5rem',
          overflowY: 'auto',
        }}
          onClick={e => { if (e.target === e.currentTarget) setNavOpen(false) }}
        >
          {links.map(link => (
            <button
              key={link.label}
              onClick={() => handleLink(link)}
              style={{
                fontSize: '1.4rem', color: '#2a1f19', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 400, letterSpacing: '-0.02em',
                padding: '8px 0', transition: 'color 0.2s',
              }}
            >
              {link.label}
            </button>
          ))}
          <button
            style={{
              marginTop: '1rem', background: '#FF4D00', color: '#FFFFFF',
              border: 'none', padding: '14px 32px', borderRadius: '10px',
              fontSize: '15px', fontWeight: 500, cursor: 'pointer',
            }}
            onClick={() => { setNavOpen(false); window.location.href = '/register' }}
          >
            Get Started
          </button>
        </div>
      )}
    </>
  )
}