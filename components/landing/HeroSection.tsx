'use client'

import { useEffect, useRef, useCallback } from 'react'

const clawPositions = [
  { t: '2%',  l: '-3%',  s: 260, r: -25,  o: 0.35 },
  { t: '5%',  l: '18%',  s: 180, r: 40,   o: 0.28 },
  { t: '-2%', l: '42%',  s: 220, r: -10,  o: 0.32 },
  { t: '8%',  l: '70%',  s: 190, r: 55,   o: 0.28 },
  { t: '3%',  l: '88%',  s: 240, r: -35,  o: 0.35 },
  { t: '22%', l: '5%',   s: 200, r: 70,   o: 0.30 },
  { t: '28%', l: '25%',  s: 160, r: -50,  o: 0.25 },
  { t: '18%', l: '55%',  s: 230, r: 15,   o: 0.32 },
  { t: '25%', l: '78%',  s: 180, r: -65,  o: 0.28 },
  { t: '35%', l: '-2%',  s: 250, r: 30,   o: 0.35 },
  { t: '42%', l: '15%',  s: 160, r: -40,  o: 0.25 },
  { t: '38%', l: '38%',  s: 280, r: 5,    o: 0.38 },
  { t: '45%', l: '62%',  s: 195, r: -75,  o: 0.28 },
  { t: '40%', l: '85%',  s: 220, r: 45,   o: 0.32 },
  { t: '55%', l: '8%',   s: 210, r: -20,  o: 0.30 },
  { t: '60%', l: '30%',  s: 170, r: 60,   o: 0.26 },
  { t: '52%', l: '50%',  s: 245, r: -45,  o: 0.35 },
  { t: '58%', l: '75%',  s: 185, r: 25,   o: 0.28 },
  { t: '62%', l: '92%',  s: 215, r: -55,  o: 0.32 },
  { t: '72%', l: '2%',   s: 230, r: 80,   o: 0.33 },
  { t: '75%', l: '22%',  s: 175, r: -30,  o: 0.26 },
  { t: '68%', l: '45%',  s: 200, r: 50,   o: 0.30 },
  { t: '78%', l: '68%',  s: 260, r: -15,  o: 0.35 },
  { t: '70%', l: '90%',  s: 165, r: 35,   o: 0.25 },
  { t: '85%', l: '10%',  s: 220, r: -60,  o: 0.32 },
  { t: '88%', l: '35%',  s: 180, r: 20,   o: 0.28 },
  { t: '82%', l: '58%',  s: 240, r: -70,  o: 0.35 },
  { t: '90%', l: '80%',  s: 195, r: 10,   o: 0.30 },
]

const FRAME_INTERVAL = 1000 / 20

export default function HeroSection() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const h1Ref       = useRef<HTMLHeadingElement>(null)
  const subRef      = useRef<HTMLParagraphElement>(null)
  const sub2Ref     = useRef<HTMLParagraphElement>(null)
  const btnsRef     = useRef<HTMLDivElement>(null)
  const revealedRef = useRef(false)

  // Reveal text — called once the canvas image is ready (or on fallback timeout)
  const triggerReveal = useCallback(() => {
    if (revealedRef.current) return
    revealedRef.current = true
    const els    = [h1Ref.current, subRef.current, sub2Ref.current, btnsRef.current]
    const delays = [0, 300, 450, 600]
    els.forEach((el, i) => {
      if (!el) return
      setTimeout(() => {
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease'
        el.style.opacity    = '1'
        el.style.transform  = 'translateY(0)'
      }, delays[i])
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId     = 0
    let startTime = 0
    let lastDraw  = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const draw = (timestamp: number) => {
      rafId = requestAnimationFrame(draw)
      if (timestamp - lastDraw < FRAME_INTERVAL) return
      lastDraw = timestamp
      if (!startTime) startTime = timestamp

      const t        = (timestamp - startTime) / 1000
      const cw       = canvas.width
      const ch       = canvas.height
      const iw       = img.naturalWidth
      const ih       = img.naturalHeight
      const aspectH  = iw > 0 ? ih / iw : 1

      ctx.clearRect(0, 0, cw, ch)

      const visibleCount = cw < 640 ? 13 : cw < 900 ? 19 : clawPositions.length
      const sizeMul      = cw < 640 ? 0.55 : cw < 900 ? 0.75 : 1
      const step         = clawPositions.length / visibleCount

      for (let i = 0; i < visibleCount; i++) {
        const m     = clawPositions[Math.floor(i * step)]
        const s     = m.s * sizeMul
        const phase = (t + i * 0.8) * (Math.PI * 2 / 12)
        const rot   = (m.r + Math.sin(phase) * 4) * (Math.PI / 180)
        const sc    = 1 + Math.sin(phase) * 0.02
        const cx    = (parseFloat(m.l) / 100) * cw + s / 2
        const cy    = (parseFloat(m.t) / 100) * ch + (s * aspectH) / 2

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        ctx.scale(sc, sc)
        ctx.globalAlpha = m.o
        ctx.drawImage(img, -s / 2, -(s * aspectH) / 2, s, s * aspectH)
        ctx.restore()
      }
    }

    const img = new window.Image()
    img.onload = () => {
      rafId = requestAnimationFrame(draw)
      triggerReveal()
    }

    // Safety valve: reveal text even if the image somehow stalls
    const fallback = setTimeout(triggerReveal, 900)

    img.src = '/images/claw-hero-1.webp'

    const handleResize = () => resize()
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(fallback)
      window.removeEventListener('resize', handleResize)
    }
  }, [triggerReveal])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '120px 2rem 6rem',
      position: 'relative', overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', userSelect: 'none',
          zIndex: 0,
        }}
      />

      {/* opacity:0 + translateY here so SSR also renders them hidden — no flash on hydration */}
      <h1 ref={h1Ref} style={{
        opacity: 0,
        transform: 'translateY(30px)',
        fontSize: 'clamp(3rem, 7vw, 5.5rem)',
        fontWeight: 500,
        lineHeight: 1.10,
        letterSpacing: '-0.04em',
        maxWidth: '780px',
        margin: '0 auto 2rem',
        position: 'relative', zIndex: 1,
      }}>
        Build AI agents for<br />
        <span className="oc-shimmer" style={{ color: '#FF4D00' }}>any business field</span><br />
        <em>you operate in.</em>
      </h1>

      <p ref={subRef} style={{
        opacity: 0,
        transform: 'translateY(30px)',
        fontSize: '1.1rem',
        color: '#8a7060',
        maxWidth: '520px',
        lineHeight: 2,
        margin: '0 auto 0.25rem',
        fontWeight: 400,
        position: 'relative', zIndex: 1,
      }}>
        Any domain. Any workflow. Your agent is live in under 2 minutes.
      </p>

      <p ref={sub2Ref} style={{
        opacity: 0,
        transform: 'translateY(30px)',
        fontSize: '1.1rem', color: '#8a7060', maxWidth: '520px',
        lineHeight: 2, margin: '0 auto 3.5rem', fontWeight: 400,
        position: 'relative', zIndex: 1,
      }}>
        Legal · HR · Real Estate · Healthcare · and any other field
      </p>

      <div ref={btnsRef} className="oc-hero-btns" style={{
        opacity: 0,
        transform: 'translateY(30px)',
        marginBottom: '4rem', position: 'relative', zIndex: 1,
      }}>
        <button
          style={{
            background: '#FF4D00', color: '#FFFFFF', border: 'none',
            padding: '16px 32px', borderRadius: '10px', fontSize: '15px',
            fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em',
          }}
          onClick={() => window.location.href = '/register'}
        >
          Deploy Your First Agent
        </button>
        <button
          style={{
            background: 'rgba(42,31,25,0.05)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#4a3a30',
            border: '0.5px solid rgba(42,31,25,0.15)',
            padding: '16px 32px',
            borderRadius: '10px', fontSize: '15px', cursor: 'pointer',
          }}
          onClick={() => scrollTo('product')}
        >
          See How It Works 🦞
        </button>
      </div>
    </section>
  )
}
