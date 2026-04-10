'use client'

import { useEffect, useRef } from 'react'

export default function CTASection() {
  const textRef   = useRef<HTMLDivElement>(null)
  const lobsterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(25px)'
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        obs.disconnect()
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const el = lobsterRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.style.opacity = '0.55'
        obs.disconnect()
      }
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section style={{ textAlign: 'center', padding: '7rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(255,77,0,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div ref={lobsterRef} className="oc-cta-lobster" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'clamp(300px, 45vw, 550px)',
        opacity: 0, zIndex: 0, pointerEvents: 'none',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 85%)',
        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 85%)',
        transition: 'opacity 1s ease-out',
      }}>
        <img src="/images/lobster-full.png" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
      </div>

      <div ref={textRef}>
        <h2 style={{
          fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600,
          letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1rem', position: 'relative',
        }}>
          Whatever your business does,<br />there&apos;s an agent <em><span style={{ color: '#FF4D00' }}>for that.</span></em>
        </h2>
        <p style={{ color: '#5a4a40', fontSize: '1rem', lineHeight: 1.8, marginBottom: '2.5rem', position: 'relative' }}>
          Start with a ready-made agent or build one from scratch for any domain.<br />
          Your first agent is live in under 2 minutes. Working around the clock from day one.
        </p>
        <button
          className="oc-cta-btn"
          style={{
            background: '#FF4D00', color: '#FFFFFF', border: 'none',
            padding: '18px 40px', borderRadius: '12px', fontSize: '17px',
            fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em', position: 'relative',
          }}
          onClick={() => window.location.href = '/register'}
        >
          Deploy Your First Agent
        </button>
      </div>
    </section>
  )
}
