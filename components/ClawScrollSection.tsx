'use client'

import { useEffect, useRef, useCallback } from 'react'

// UTILITIES
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1)
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function fadeWindow(
  progress: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number
): number {
  if (progress < inStart) return 0
  if (progress < inEnd) return (progress - inStart) / (inEnd - inStart)
  if (progress < outStart) return 1
  if (progress < outEnd) return 1 - (progress - outStart) / (outEnd - outStart)
  return 0
}

// PARTICLE TYPES
type ParticleLayer = 'inner' | 'mid' | 'outer'

interface TrailPoint {
  x: number
  y: number
}

interface Particle {
  angle: number
  orbitRadius: number
  orbitSpeed: number
  size: number
  opacity: number
  targetOpacity: number
  phase: number
  layer: ParticleLayer
  homeX: number
  homeY: number
  x: number
  y: number
  trail: TrailPoint[]
}

export default function ClawScrollSection() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const frame1Ref = useRef<HTMLImageElement>(null)
  const frame2Ref = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const text2Ref = useRef<HTMLDivElement>(null)
  const text3Ref = useRef<HTMLDivElement>(null)
  const text4Ref = useRef<HTMLDivElement>(null)

  const scrollProgressRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const isActiveRef = useRef(true)
  const centerRef = useRef({ x: 0, y: 0 })
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build initial particle pool
  const initParticles = useCallback((cx: number, cy: number) => {
    const particles: Particle[] = []

    const vw = window.innerWidth

    const innerRadius = Math.min(120, vw * 0.20)
    const midRadius = Math.min(200, vw * 0.32)
    const outerRadius = Math.min(290, vw * 0.45)

    const configs: { layer: ParticleLayer; count: number; baseRadius: number; variance: number }[] = [
      { layer: 'inner', count: 20, baseRadius: innerRadius, variance: 20 },
      { layer: 'mid',   count: 35, baseRadius: midRadius,   variance: 30 },
      { layer: 'outer', count: 25, baseRadius: outerRadius, variance: 40 },
    ]

    for (const cfg of configs) {
      for (let i = 0; i < cfg.count; i++) {
        const angle = Math.random() * Math.PI * 2
        const orbitRadius = cfg.baseRadius + (Math.random() - 0.5) * 2 * cfg.variance
        const x = cx + Math.cos(angle) * orbitRadius
        const y = cy + Math.sin(angle) * orbitRadius * 0.45

        particles.push({
          angle,
          orbitRadius,
          orbitSpeed: (0.003 + Math.random() * 0.007) * (Math.random() < 0.5 ? 1 : -1),
          size: 1.5 + Math.random() * 2,
          opacity: 0,
          targetOpacity: 0,
          phase: Math.random() * Math.PI * 2,
          layer: cfg.layer,
          homeX: cx + (Math.random() - 0.5) * 200,
          homeY: cy + (Math.random() - 0.5) * 60,
          x,
          y,
          trail: [],
        })
      }
    }

    particlesRef.current = particles
  }, [])

  // Animation loop
  const animate = useCallback(() => {
    if (!isActiveRef.current) return

    const canvas = canvasRef.current
    if (!canvas) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const p = scrollProgressRef.current
    const { x: cx, y: cy } = centerRef.current
    const particles = particlesRef.current

    // Determine activeCount based on scroll progress
    let activeCount = 0
    if (p < 0.15) {
      activeCount = 0
    } else if (p < 0.30) {
      activeCount = Math.round(lerp(0, 18, (p - 0.15) / 0.15))
    } else if (p < 0.45) {
      activeCount = Math.round(lerp(18, 55, (p - 0.30) / 0.15))
    } else {
      activeCount = Math.round(lerp(55, 80, clamp((p - 0.45) / 0.15, 0, 1)))
    }

    // Fade-out phase
    const isFading = p > 0.90
    const fadeOutFactor = isFading ? 1 - (p - 0.90) / 0.10 : 1

    // Clustering phase
    const isclustering = p >= 0.60 && p < 0.75
    const clusterFactor = isclustering ? (p - 0.60) / 0.15 : 0

    // Speed modulation in 0.75–0.90
    const isSlowOrbit = p >= 0.75 && p < 0.90
    const slowFactor = isSlowOrbit ? 1 - (p - 0.75) / 0.15 * 0.7 : 1

    // Draw connections first (behind particles)
    for (let i = 0; i < activeCount; i++) {
      const a = particles[i]
      if (a.layer === 'inner') continue
      let connections = 0
      for (let j = i + 1; j < activeCount && connections < 3; j++) {
        const b = particles[j]
        if (b.layer === 'inner') continue
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80) {
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(255, 77, 0, 0.08)`
          ctx.lineWidth = 0.5
          ctx.stroke()
          connections++
        }
      }
    }

    // Update and draw each particle
    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i]

      if (i < activeCount) {
        // Target opacity based on layer and scroll
        const baseOpacity = pt.layer === 'inner' ? 0.7 : pt.layer === 'mid' ? 0.55 : 0.45
        pt.targetOpacity = baseOpacity * fadeOutFactor * (0.7 + 0.3 * Math.sin(pt.phase + Date.now() * 0.001))
      } else {
        pt.targetOpacity = 0
      }

      // Lerp opacity
      pt.opacity = lerp(pt.opacity, pt.targetOpacity, 0.05)

      if (pt.opacity < 0.005) continue

      // Advance angle
      pt.angle += pt.orbitSpeed * slowFactor

      // Drift outward in fade-out phase
      const driftRadius = isFading ? pt.orbitRadius * (1 + (1 - fadeOutFactor) * 0.3) : pt.orbitRadius

      // Position
      const orbitX = cx + Math.cos(pt.angle) * driftRadius
      const orbitY = cy + Math.sin(pt.angle) * driftRadius * 0.45

      if (isclustering && clusterFactor > 0) {
        pt.x = lerp(pt.x, lerp(orbitX, pt.homeX, easeInOut(clusterFactor)), 0.02)
        pt.y = lerp(pt.y, lerp(orbitY, pt.homeY, easeInOut(clusterFactor)), 0.02)
      } else {
        pt.x = lerp(pt.x, orbitX, 0.08)
        pt.y = lerp(pt.y, orbitY, 0.08)
      }

      // Update trail
      pt.trail.push({ x: pt.x, y: pt.y })
      if (pt.trail.length > 4) pt.trail.shift()

      // Draw trail
      for (let t = 0; t < pt.trail.length; t++) {
        const tp = pt.trail[t]
        ctx.beginPath()
        ctx.arc(tp.x, tp.y, pt.size * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 77, 0, ${pt.opacity * 0.15})`
        ctx.fill()
      }

      // Draw glow for larger particles
      if (pt.size > 2.5) {
        ctx.shadowBlur = 8
        ctx.shadowColor = '#FF4D00'
      }

      // Draw particle
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 77, 0, ${pt.opacity})`
      ctx.fill()

      // Reset shadow
      if (pt.size > 2.5) {
        ctx.shadowBlur = 0
        ctx.shadowColor = 'transparent'
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const rect = wrapper.getBoundingClientRect()
      const rawProgress = (-rect.top) / (rect.height - window.innerHeight)
      const p = clamp(rawProgress, 0, 1)
      scrollProgressRef.current = p

      // Image container transform (entry / exit)
      const hand = handRef.current
      if (hand) {
        let translateY = 0
        let scale = 1

        if (p < 0.2) {
          const t = p / 0.2
          translateY = lerp(40, 0, easeInOut(t))
          scale = lerp(0.88, 1.0, easeInOut(t))
        }

        hand.style.transform = `translate(-50%, calc(-50% + ${translateY}px)) scale(${scale})`
      }

      // crossfade: frame-1 out, frame-2 in — both over scroll 0.2 → 0.65
      const crossfade = clamp((p - 0.2) / (0.65 - 0.2), 0, 1)
      if (frame1Ref.current) frame1Ref.current.style.opacity = String(1 - crossfade)
      if (frame2Ref.current) frame2Ref.current.style.opacity = String(crossfade)

      // Text overlays
      const applyText = (
        el: HTMLDivElement | null,
        opacity: number,
        inFrac: number
      ) => {
        if (!el) return
        const translateY = opacity < 1 && inFrac <= 0.5
          ? lerp(16, 0, opacity)
          : opacity < 1 && inFrac > 0.5
          ? lerp(0, -12, 1 - opacity)
          : 0
        el.style.opacity = String(opacity)
        el.style.transform = el.dataset.baseTransform
          ? `${el.dataset.baseTransform} translateY(${translateY}px)`
          : `translateY(${translateY}px)`
      }

      const t2 = fadeWindow(p, 0.15, 0.28, 0.45, 0.55)
      const t2InFrac = p < 0.35 ? 0 : 1
      applyText(text2Ref.current, t2, t2InFrac)

      const t3 = fadeWindow(p, 0.55, 0.65, 0.78, 0.87)
      const t3InFrac = p < 0.71 ? 0 : 1
      applyText(text3Ref.current, t3, t3InFrac)

      const t4 = fadeWindow(p, 0.87, 0.94, 1.1, 1.2)
      const t4InFrac = p < 0.905 ? 0 : 1
      applyText(text4Ref.current, t4, t4InFrac)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Canvas setup, resize, and RAF
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      centerRef.current = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
    }

    setSize()
    initParticles(centerRef.current.x, centerRef.current.y)

    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(() => {
        setSize()
        initParticles(centerRef.current.x, centerRef.current.y)
      }, 150)
    }

    window.addEventListener('resize', handleResize)

    isActiveRef.current = true
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      isActiveRef.current = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    }
  }, [animate, initParticles])

  // Store base transforms on text elements
  useEffect(() => {
    if (text2Ref.current) text2Ref.current.dataset.baseTransform = 'translateX(-50%)'
    if (text3Ref.current) text3Ref.current.dataset.baseTransform = 'translateX(-50%)'
    if (text4Ref.current) text4Ref.current.dataset.baseTransform = 'translate(-50%, -50%)'
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        height: '400vh',
      }}
    >
      {/* Sticky container */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
          background: '#0A0A0A',
        }}
      >
        {/* LAYER 1 — Hand images (crossfade) */}
        <div
          ref={handRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, calc(-50% + 40px)) scale(0.88)',
            width: 'min(520px, 80vw)',
            willChange: 'transform',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {/* frame-1 — closed fist, fades out */}
          <img
            ref={frame1Ref}
            src="/images/frame-1.png"
            alt="Closed fist"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              objectFit: 'contain',
              opacity: 1,
              willChange: 'opacity',
            }}
          />
          {/* frame-2 — open hand, crossfades in */}
          <img
            ref={frame2Ref}
            src="/images/frame-2.png"
            alt="Open hand"
            style={{
              position: 'relative',
              width: '100%',
              objectFit: 'contain',
              opacity: 0,
              willChange: 'opacity',
            }}
          />
        </div>

        {/* LAYER 2 — Canvas particle system */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            willChange: 'contents',
            pointerEvents: 'none',
          }}
        />

        {/* LAYER 3 — Text overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Text 2 — Main headline */}
          <div
            ref={text2Ref}
            style={{
              position: 'absolute',
              bottom: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              width: '100%',
              opacity: 0,
              transition: 'none',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
                lineHeight: 1.15,
                margin: 0,
                padding: '0 20px',
              }}
            >
              Your agents are on line 1, waiting to{' '}
              <span style={{ color: '#FF4D00' }}>deploy.</span>
            </h2>
          </div>

          {/* Text 3 — Agent names */}
          <div
            ref={text3Ref}
            style={{
              position: 'absolute',
              bottom: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              opacity: 0,
              transition: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
                color: '#C8C4BC',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Finance
              <span style={{ color: '#FF4D00', margin: '0 12px' }}>·</span>
              Marketing
              <span style={{ color: '#FF4D00', margin: '0 12px' }}>·</span>
              Operations
            </span>
          </div>

          {/* Text 4 — CTA */}
          <div
            ref={text4Ref}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0,
              transition: 'none',
              pointerEvents: 'auto',
            }}
          >
            <button
              style={{
                background: '#FF4D00',
                color: '#fff',
                border: 'none',
                padding: '16px 36px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
              onClick={() => {
                window.location.href = '/register'
              }}
            >
              Deploy OpenClaw →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// SETUP INSTRUCTIONS:
// 1. Place the closed fist image at /public/images/frame-1.png
// 2. Place the open hand image at /public/images/frame-2.png
// 3. Import this component in your landing page: import ClawScrollSection from '@/components/ClawScrollSection'
// 4. Drop it between the Hero and How It Works sections
// 5. The section handles its own scroll logic — no props needed
