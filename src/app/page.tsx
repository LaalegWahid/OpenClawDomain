'use client'

import { useEffect, useRef, useCallback, RefObject, useState } from 'react'
import ClawScrollSection from '../../components/ClawScrollSection'

// ─── Types ────────────────────────────────────────────────────────────────────
interface StepCard { num: string; title: string; desc: string }
interface AgentDetail { tag: string; tagColor: string; name: string; desc: string; commands: string[] }
interface Stat { value: number; suffix: string; label: string; prefix?: string }
interface Testimonial { quote: string; name: string; role: string; company: string; initials: string }
interface PricingTier { name: string; price: string; period: string; desc: string; features: string[]; cta: string; highlighted: boolean }
interface FAQItem { q: string; a: string }

// ─── Data ─────────────────────────────────────────────────────────────────────
const steps: StepCard[] = [
  { num: '01', title: 'Sign Up Free', desc: 'Create your account in under a minute. No credit card required to get started.' },
  { num: '02', title: 'Launch an Agent', desc: 'Choose Finance, Marketing, or Ops. Connect Telegram, Discord, or WhatsApp and your agent is live instantly.' },
  { num: '03', title: 'Command Anywhere', desc: 'Send commands, receive reports, and get proactive alerts on the platform you already use every day.' },
]

const agents: AgentDetail[] = [
  {
    tag: 'Finance',
    tagColor: '#FF8C42',
    name: 'Finance Agent',
    desc: 'Tracks expenses, flags anomalies, generates cash flow summaries, and delivers invoice alerts on demand.',
    commands: ['/report', '/status', '/alert', '/summary'],
  },
  {
    tag: 'Marketing',
    tagColor: '#E8652B',
    name: 'Marketing Agent',
    desc: 'Drafts social posts, schedules content calendars, analyzes campaign metrics, and writes copy on demand.',
    commands: ['/draft', '/schedule', '/metrics', '/idea'],
  },
  {
    tag: 'Operations',
    tagColor: '#FF4D00',
    name: 'Ops Agent',
    desc: 'Manages tasks, assigns work to team members, delivers daily standup summaries, and tracks blockers.',
    commands: ['/tasks', '/assign', '/standup', '/blockers'],
  },
]

const telegramFeatures = [
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, title: 'Instant commands', desc: 'Type /report and get a full business summary in seconds. No loading, no waiting.' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, title: 'Proactive alerts', desc: 'Your agents message you when something needs attention — anomalies, overdue invoices, deadlines.' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: 'PDF delivery', desc: 'Request any report as a PDF and receive it directly in your chat, ready to share.' },
  { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, title: 'Dashboard sync', desc: 'Every command appears in your web activity log in real time, regardless of platform.' },
]

const activityRows = [
  { agent: 'Finance Agent', action: 'Generated monthly cash flow report', time: '2 min ago' },
  { agent: 'Ops Agent', action: 'Assigned 3 tasks to Team Member', time: '8 min ago' },
  { agent: 'Finance Agent', action: 'Flagged anomaly — utilities +340%', time: '15 min ago' },
  { agent: 'Marketing Agent', action: 'Drafted 3 social posts for review', time: '1 hr ago' },
  { agent: 'Ops Agent', action: 'Sent daily standup summary', time: '2 hr ago' },
]

const stats: Stat[] = [
  { value: 3, suffix: '', label: 'Specialized agent types', prefix: '' },
  { value: 2, suffix: ' min', label: 'Average setup time', prefix: '<' },
  { value: 24, suffix: '/7', label: 'Always on, always watching', prefix: '' },
  { value: 99, suffix: '.9%', label: 'Platform uptime SLA', prefix: '' },
]

const testimonials: Testimonial[] = [
  {
    quote: 'We replaced three separate tools with OpenClaw. Our Finance agent catches billing anomalies before we even notice them. It paid for itself in the first week.',
    name: 'Sara Benali',
    role: 'Co-Founder & CEO',
    company: 'Flux Startup',
    initials: 'SB',
  },
  {
    quote: 'The Marketing agent writes our weekly content briefs and schedules posts. I get the /metrics report every Monday in Telegram. It has become part of our ritual.',
    name: 'Mehdi Ouhali',
    role: 'Head of Growth',
    company: 'Velia Commerce',
    initials: 'MO',
  },
  {
    quote: 'The Ops agent sends our team standup every morning without me lifting a finger. Docker isolation means I never worry about data leaking between clients.',
    name: 'Imane Charkaoui',
    role: 'Operations Director',
    company: 'Atlas Logistics',
    initials: 'IC',
  },
]

const pricing: PricingTier[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    desc: 'Perfect for exploring OpenClaw with one agent.',
    features: [
      '1 active agent',
      '200 commands / month',
      'Telegram, Discord & WhatsApp',
      'Activity log (7 days)',
      'Community support',
    ],
    cta: 'Start for free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    desc: 'For teams ready to run their business on autopilot.',
    features: [
      '3 active agents',
      'Unlimited commands',
      'PDF report delivery',
      'Activity log (90 days)',
      'Priority email support',
      'Custom system prompts',
    ],
    cta: 'Start Pro trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$79',
    period: 'per month',
    desc: 'For growing companies that need full coverage.',
    features: [
      'Unlimited agents',
      'Unlimited commands',
      'All Pro features',
      'Dedicated Slack support',
      'API access',
      '99.9% uptime SLA',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
]

const faqItems: FAQItem[] = [
  {
    q: 'Which messaging platforms are supported?',
    a: 'OpenClaw supports Telegram, Discord, and WhatsApp. Connect whichever platform your team already uses — each agent runs as a dedicated bot on that service and is live within minutes.',
  },
  {
    q: 'How is my data kept secure?',
    a: 'Every agent runs in its own isolated Docker container. Your data never touches another user workspace. Conversations are stored in your dedicated database slot, and all traffic uses HTTPS. You can delete your data at any time from Settings.',
  },
  {
    q: 'What AI model powers the agents?',
    a: 'Agents are powered by Google Gemini 2.5 Flash — optimized for fast, real-time responses. Each agent is strictly domain-locked, so your Finance agent will only ever answer finance questions.',
  },
  {
    q: 'Can I customize what my agent does?',
    a: 'Absolutely. You provide a custom system prompt when creating an agent. The domain boundary preamble is added automatically to keep the agent focused, but you control personality, tone, and specific behaviors.',
  },
  {
    q: 'How long does it take to set up?',
    a: 'Most users have their first agent running within 2 minutes. Sign up, connect your preferred platform (Telegram, Discord, or WhatsApp), and your agent is live. No infrastructure to manage.',
  },
  {
    q: 'Can my agent send PDF reports?',
    a: 'Yes. Any agent can generate a formatted PDF on demand. Ask your Finance agent for a "monthly summary as PDF" and it delivers a professionally formatted document directly in your chat — Telegram, Discord, or WhatsApp.',
  },
  {
    q: 'What happens if my agent goes offline?',
    a: 'OpenClaw monitors all containers continuously. If a container stops unexpectedly, it is automatically restarted. You can also manually restart or delete any agent from your dashboard.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes, always. Cancel from your Settings page with one click — no calls required. Your agents continue running until the end of your billing period, then move to Starter limits.',
  },
]

// ─── Utility components ───────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{
      height: '0.5px',
      background: 'linear-gradient(90deg, transparent, #1E1E1E 20%, #1E1E1E 80%, transparent)',
      margin: '0 1.75rem',
    }} />
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: '11px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#555555',
      marginBottom: '1rem',
      fontWeight: 500,
    }}>
      {text}
    </p>
  )
}

function Check() {
  return <span style={{ color: '#555555', marginRight: '8px', fontSize: '12px', flexShrink: 0 }}>✓</span>
}

// ─── StatCard — animated counter ─────────────────────────────────────────────
function StatCard({ value, suffix, label, prefix = '' }: Stat) {
  const [count, setCount] = useState(0)
  const [triggered, setTriggered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); obs.disconnect() } },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered) return
    const duration = 1200
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress
      setCount(Math.round(ease * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [triggered, value])

  return (
    <div ref={ref} className="oc-stat-card" style={{
      background: '#111111',
      border: '0.5px solid #1E1E1E',
      borderRadius: '16px',
      padding: '2rem 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 'clamp(2rem, 4vw, 3rem)',
        fontWeight: 500,
        letterSpacing: '-0.04em',
        color: '#F0EEE8',
        lineHeight: 1,
      }}>
        {prefix}{count}{suffix}
      </div>
      <div style={{ fontSize: '13px', color: '#555555', marginTop: '0.6rem', lineHeight: 1.5 }}>
        {label}
      </div>
    </div>
  )
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((item, i) => (
        <div key={i} className="oc-faq-item" style={{
          background: open === i ? '#111111' : 'transparent',
          border: `0.5px solid ${open === i ? '#2A2A2A' : '#1A1A1A'}`,
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              gap: '1rem',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#F0EEE8', lineHeight: 1.5 }}>
              {item.q}
            </span>
            <span style={{
              fontSize: '16px',
              color: '#FF4D00',
              transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
              flexShrink: 0,
              lineHeight: 1,
              display: 'inline-block',
            }}>
              ▾
            </span>
          </button>
          {open === i && (
            <div style={{ padding: '0 1.25rem 1.1rem', fontSize: '13px', color: '#666666', lineHeight: 1.8 }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [navOpen])

  // Step cards
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Animation refs
  const step0Ref = useRef<HTMLDivElement>(null)
  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const agent0Ref = useRef<HTMLDivElement>(null)
  const agent1Ref = useRef<HTMLDivElement>(null)
  const agent2Ref = useRef<HTMLDivElement>(null)
  const telegramSectionRef = useRef<HTMLDivElement>(null)
  const msg0Ref = useRef<HTMLDivElement>(null)
  const msg1Ref = useRef<HTMLDivElement>(null)
  const msg2Ref = useRef<HTMLDivElement>(null)
  const msg3Ref = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const dashWrapRef = useRef<HTMLDivElement>(null)
  const heroH1Ref = useRef<HTMLHeadingElement>(null)
  const heroSubRef = useRef<HTMLParagraphElement>(null)
  const heroBtnsRef = useRef<HTMLDivElement>(null)
  const heroPoweredRef = useRef<HTMLParagraphElement>(null)
  const statsSecRef = useRef<HTMLDivElement>(null)
  const testimonialsSecRef = useRef<HTMLDivElement>(null)
  const pricingSecRef = useRef<HTMLDivElement>(null)
  const faqSecRef = useRef<HTMLDivElement>(null)
  const ctaTextRef = useRef<HTMLDivElement>(null)

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Hero entrance animation
  useEffect(() => {
    const els = [heroH1Ref.current, heroSubRef.current, heroBtnsRef.current, heroPoweredRef.current]
    const delays = [200, 500, 800, 1100]
    els.forEach((el, i) => {
      if (!el) return
      el.style.opacity = '0'
      el.style.transform = 'translateY(30px)'
      setTimeout(() => {
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }, delays[i])
    })
  }, [])

  // Section headings scroll animation
  useEffect(() => {
    const headings = document.querySelectorAll('.oc-section-heading')
    const observers: IntersectionObserver[] = []
    headings.forEach(el => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('oc-visible')
          obs.disconnect()
        }
      }, { threshold: 0.3 })
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  // Stats cards — staggered scale-in
  useEffect(() => {
    const sec = statsSecRef.current
    if (!sec) return
    const cards = sec.querySelectorAll('.oc-stat-card')
    cards.forEach(el => { (el as HTMLElement).style.opacity = '0'; (el as HTMLElement).style.transform = 'scale(0.85)' })
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        cards.forEach((el, i) => {
          setTimeout(() => {
            (el as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease'
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'scale(1)'
          }, i * 150)
        })
        obs.disconnect()
      }
    }, { threshold: 0.2 })
    obs.observe(sec)
    return () => obs.disconnect()
  }, [])

  // Testimonial cards — staggered slide-up
  useEffect(() => {
    const sec = testimonialsSecRef.current
    if (!sec) return
    const cards = sec.querySelectorAll('.oc-testimonial-card')
    cards.forEach(el => { (el as HTMLElement).style.opacity = '0'; (el as HTMLElement).style.transform = 'translateY(35px)' })
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        cards.forEach((el, i) => {
          setTimeout(() => {
            (el as HTMLElement).style.transition = 'opacity 0.6s ease, transform 0.6s ease'
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'translateY(0)'
          }, i * 200)
        })
        obs.disconnect()
      }
    }, { threshold: 0.15 })
    obs.observe(sec)
    return () => obs.disconnect()
  }, [])

  // Pricing cards — staggered scale-in
  useEffect(() => {
    const sec = pricingSecRef.current
    if (!sec) return
    const cards = sec.querySelectorAll('.oc-pricing-card')
    cards.forEach(el => { (el as HTMLElement).style.opacity = '0'; (el as HTMLElement).style.transform = 'scale(0.9) translateY(20px)' })
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

  // FAQ items — staggered slide-in
  useEffect(() => {
    const sec = faqSecRef.current
    if (!sec) return
    const items = sec.querySelectorAll('.oc-faq-item')
    items.forEach(el => { (el as HTMLElement).style.opacity = '0'; (el as HTMLElement).style.transform = 'translateX(-25px)' })
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        items.forEach((el, i) => {
          setTimeout(() => {
            (el as HTMLElement).style.transition = 'opacity 0.5s ease, transform 0.5s ease'
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'translateX(0)'
          }, i * 100)
        })
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    obs.observe(sec)
    return () => obs.disconnect()
  }, [])

  // CTA text fade-up
  useEffect(() => {
    const el = ctaTextRef.current
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

  // Step cards
  useEffect(() => {
    const cardRefs = [step0Ref, step1Ref, step2Ref]
    const delays = [0, 120, 240]
    const observers: IntersectionObserver[] = []
    cardRefs.forEach((ref, i) => {
      const el = ref.current
      if (!el) return
      el.style.opacity = '0'
      el.style.transform = 'translateY(28px)'
      el.style.transition = 'none'
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, delays[i])
          obs.disconnect()
        }
      }, { threshold: 0.15 })
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  // Agent cards
  useEffect(() => {
    const cardRefs = [agent0Ref, agent1Ref, agent2Ref]
    const delays = [0, 120, 240]
    const observers: IntersectionObserver[] = []
    cardRefs.forEach((ref, i) => {
      const el = ref.current
      if (!el) return
      el.style.opacity = '0'
      el.style.transform = 'translateY(28px)'
      el.style.transition = 'none'
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, delays[i])
          obs.disconnect()
        }
      }, { threshold: 0.15 })
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  // Telegram messages
  useEffect(() => {
    const msgRefs = [msg0Ref, msg1Ref, msg2Ref, msg3Ref]
    const msgDelays = [0, 400, 900, 1300]
    msgRefs.forEach(ref => { if (ref.current) ref.current.style.opacity = '0' })
    const sectionEl = telegramSectionRef.current
    if (!sectionEl) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        msgRefs.forEach((ref, i) => {
          const el = ref.current
          if (!el) return
          setTimeout(() => { el.style.transition = 'opacity 0.3s ease'; el.style.opacity = '1' }, msgDelays[i])
        })
        obs.disconnect()
      }
    }, { threshold: 0.2 })
    obs.observe(sectionEl)
    return () => obs.disconnect()
  }, [])

  // CTA Lobster fade-in
  const ctaLobsterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ctaLobsterRef.current
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

  // Dashboard parallax
  useEffect(() => {
    const handleScroll = () => {
      const wrap = dashWrapRef.current
      const dash = dashboardRef.current
      if (!wrap || !dash) return
      const rect = wrap.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = 1 - (rect.top + rect.height) / (vh + rect.height)
      const ty = 30 - Math.min(Math.max(progress, 0), 1) * 50
      dash.style.transform = `translateY(${ty}px)`
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'How it works', id: 'how-it-works' },
    { label: 'Agents', id: 'agents' },
    { label: 'Integrations', id: 'telegram' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ]

  return (
    <>
      <style>{`
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes heroFadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes heroFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(255,77,0,0.08)} 50%{box-shadow:0 0 40px rgba(255,77,0,0.2)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes driftRotate { 0%{transform:rotate(var(--r)) scale(1)} 50%{transform:rotate(calc(var(--r) + 8deg)) scale(1.04)} 100%{transform:rotate(var(--r)) scale(1)} }
        .oc-claw-drift { animation: driftRotate 12s ease-in-out infinite; }
        .oc-stat-card { transition:transform 0.3s ease,box-shadow 0.3s ease; }
        .oc-stat-card:hover { transform:translateY(-4px); box-shadow:0 8px 30px rgba(255,77,0,0.08); }
        .oc-testimonial-card { transition:transform 0.3s ease,border-color 0.3s ease; }
        .oc-testimonial-card:hover { transform:translateY(-4px); border-color:rgba(255,77,0,0.25) !important; }
        .oc-pricing-card { transition:transform 0.3s ease,box-shadow 0.3s ease; }
        .oc-pricing-card:hover { transform:translateY(-5px); box-shadow:0 12px 40px rgba(255,77,0,0.1); }
        .oc-faq-item { transition:background 0.2s ease,border-color 0.2s ease; }
        .oc-cta-btn { animation: glowPulse 3s ease-in-out infinite; }
        .oc-section-heading { opacity:0; }
        .oc-section-heading.oc-visible { animation: slideInLeft 0.7s ease forwards; }
        .oc-shimmer { background:linear-gradient(90deg,#FF4D00 0%,#FF8C42 40%,#FFB88C 50%,#FF8C42 60%,#FF4D00 100%); background-size:200% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:shimmer 4s ease-in-out infinite; }
        .oc-hero-btns button:first-child { transition:transform 0.2s ease,box-shadow 0.2s ease; }
        .oc-hero-btns button:first-child:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(255,77,0,0.3); }
        .oc-hero-btns button:last-child { transition:transform 0.2s ease,border-color 0.2s ease; }
        .oc-hero-btns button:last-child:hover { transform:translateY(-2px); border-color:rgba(255,77,0,0.4) !important; color:#F0EEE8 !important; }
        * { box-sizing:border-box; }
        .oc-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .oc-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:center; }
        .oc-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .oc-grid-pricing { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .oc-grid-footer { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:2rem; }
        .oc-testimonials { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .oc-nav-links { display:flex; gap:2rem; }
        .oc-hamburger { display:none !important; }
        .oc-agent-card { transition:border-color 0.25s,transform 0.25s; }
        .oc-agent-card:hover { border-color:rgba(255,77,0,0.3) !important; transform:translateY(-3px); }
        .oc-footer-bottom { display:flex; align-items:center; justify-content:space-between; }
        .oc-hero-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .oc-social-proof { display:flex; align-items:center; gap:10px; justify-content:center; margin-bottom:2.5rem; }
        .oc-logo-bar { display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; }
        @media(max-width:900px){
          .oc-grid-3{grid-template-columns:1fr 1fr;}
          .oc-grid-4{grid-template-columns:1fr 1fr;}
          .oc-grid-pricing{grid-template-columns:1fr;}
          .oc-testimonials{grid-template-columns:1fr 1fr;}
          .oc-grid-footer{grid-template-columns:1fr 1fr;}
          .oc-hero-claw img { width: 130px !important; opacity: 0.22 !important; }
          .oc-hero-claw img:nth-child(3n) { display: none !important; }
        }
        @media(max-width:640px){
          .oc-grid-3{grid-template-columns:1fr;}
          .oc-grid-2{grid-template-columns:1fr;gap:2.5rem;}
          .oc-grid-4{grid-template-columns:1fr 1fr;}
          .oc-testimonials{grid-template-columns:1fr;}
          .oc-nav-links{display:none;}
          .oc-hamburger{display:flex !important;}
          .oc-hero-btns{flex-direction:column;align-items:center;}
          .oc-social-proof{flex-direction:column;gap:6px;}
          .oc-footer-bottom{flex-direction:column;gap:1rem;text-align:center;}
          .oc-grid-footer{grid-template-columns:1fr 1fr;}
          .oc-dash-inner{grid-template-columns:1fr !important;}
          .oc-dash-sidebar{display:none;}
          .oc-hero-claw img { width: 90px !important; opacity: 0.18 !important; }
          .oc-hero-claw img:nth-child(even) { display: none !important; }
          .oc-guardian-header { flex-direction: column !important; align-items: flex-start !important; gap: 1rem !important; }
          .oc-guardian-img { width: 100px !important; }
        }
      `}</style>

      <div style={{ background: '#1A1A1A', color: '#F0EEE8', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>


        {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)', borderBottom: '0.5px solid #1E1E1E',
        }}>
          {/* Main bar */}
          <div style={{
            height: '60px', padding: '0 1.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
                <rect width="56" height="56" rx="13" fill="#FF4D00" />
                <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
                <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
                <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
              </svg>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: '#F0EEE8' }}>
                  Open<span style={{ color: '#FF4D00' }}>Claw</span>
                </div>
                <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444444', marginTop: '3px' }}>
                  Manager
                </div>
              </div>
            </div>

            {/* Desktop nav links */}
            {!isMobile && (
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                {navLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    style={{
                      fontSize: '13px', color: '#555555', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F0EEE8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555555' }}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}

            {/* Right side */}
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
                    color: '#F0EEE8', width: '36px', height: '36px',
                  }}
                >
                  {navOpen ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <line x1="4" y1="4" x2="16" y2="16" stroke="#F0EEE8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="16" y1="4" x2="4" y2="16" stroke="#F0EEE8" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <line x1="2" y1="5" x2="18" y2="5" stroke="#F0EEE8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="2" y1="10" x2="18" y2="10" stroke="#F0EEE8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="2" y1="15" x2="18" y2="15" stroke="#F0EEE8" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Mobile full-screen menu overlay */}
        {isMobile && navOpen && (
          <div style={{
            position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
            zIndex: 99, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '1.5rem',
            overflowY: 'auto', touchAction: 'none',
          }}
            onClick={(e) => { if (e.target === e.currentTarget) setNavOpen(false) }}
          >
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => { scrollTo(link.id); setNavOpen(false) }}
                style={{
                  fontSize: '1.4rem', color: '#F0EEE8', background: 'none', border: 'none',
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

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '120px 2rem 6rem',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Hero background — scattered claw images */}
          <div className="oc-hero-claw" style={{
            position: 'absolute', inset: 0,
            zIndex: 0, pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
          }}>
            {([
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
            ] as { t: string; l: string; s: number; r: number; o: number }[]).map((m, i) => (
              <img
                key={i}
                src="/images/claw-hero.png"
                alt=""
                aria-hidden="true"
                loading="eager"
                className="oc-claw-drift"
                style={{
                  position: 'absolute',
                  top: m.t, left: m.l,
                  width: `${m.s}px`,
                  height: 'auto',
                  opacity: m.o,
                  filter: 'none',
                  '--r': `${m.r}deg`,
                  animationDelay: `${i * -0.8}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* H1 */}
          <h1 ref={heroH1Ref} style={{
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            fontWeight: 500,
            lineHeight: 1.10,
            letterSpacing: '-0.04em',
            maxWidth: '780px',
            margin: '0 auto 2rem',
            position: 'relative', zIndex: 1,
          }}>
            Your AI team for<br />
            Finance, <span className="oc-shimmer" style={{ color: '#FF4D00' }}>Marketing</span><br />
            &amp; Operations.
          </h1>

          {/* Subtext */}
          <p ref={heroSubRef} style={{
            fontSize: '1.1rem',
            color: '#888888',
            maxWidth: '520px',
            lineHeight: 2,
            margin: '0 auto 3.5rem',
            fontWeight: 400,
            position: 'relative', zIndex: 1,
          }}>
            Deploy domain-locked AI agents that work 24/7.<br />
            Command them from Telegram, Discord, or WhatsApp.<br />
            Monitor everything from one dashboard.
          </p>

          {/* CTAs */}
          <div ref={heroBtnsRef} className="oc-hero-btns" style={{ marginBottom: '4rem', position: 'relative', zIndex: 1 }}>
            <button
              style={{
                background: '#FF4D00', color: '#FFFFFF', border: 'none',
                padding: '16px 32px', borderRadius: '10px', fontSize: '15px',
                fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em',
              }}
              onClick={() => window.location.href = '/register'}
            >
              Launch Your First Agent
            </button>
            <button
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#C8C6C0',
                border: '0.5px solid rgba(255,255,255,0.1)',
                padding: '16px 32px',
                borderRadius: '10px', fontSize: '15px', cursor: 'pointer',
              }}
              onClick={() => scrollTo('how-it-works')}
            >
              See How It Works
            </button>
          </div>


        </section>

        {/* ── CLAW SCROLL SECTION ─────────────────────────────────────────── */}
        <ClawScrollSection />

        <Divider />

        {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <SectionLabel text="How It Works" />
            <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
              From zero to running in three steps.
            </h2>
            <p style={{ color: '#555555', fontSize: '1rem', marginBottom: '2.5rem' }}>
              No technical setup required. No infrastructure to manage. Just pick an agent and go.
            </p>
            <div className="oc-grid-3">
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  ref={[step0Ref, step1Ref, step2Ref][i]}
                  style={{
                    background: '#111111', border: '0.5px solid #1E1E1E',
                    borderRadius: '16px', padding: '2rem 1.5rem',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: '#2A2A2A' }} />
                  <div style={{ fontSize: '4rem', fontWeight: 500, lineHeight: 1, color: '#222222', marginBottom: '1.25rem' }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>{step.title}</div>
                  <div style={{ fontSize: '13px', color: '#555555', lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── MEET THE AGENTS ─────────────────────────────────────────────── */}
        <section id="agents" style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <SectionLabel text="Meet the Agents" />
            <div className="oc-guardian-header" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2.5rem' }}>
                <img src="/images/lobster-guardian.png" alt="OpenClaw Guardian" className="oc-guardian-img" loading="lazy" style={{
                width: 'clamp(120px, 18vw, 200px)',
                filter: 'drop-shadow(0 10px 20px rgba(255,77,0,0.15))',
                animation: 'floatY 4s ease-in-out infinite'
              }} />
              <div>
                <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                  Three agents. Every side of your business.
                </h2>
                <p style={{ color: '#555555', fontSize: '1rem' }}>
                  Each agent is strictly domain-locked — your Finance agent will never stray into marketing territory.
                </p>
              </div>
            </div>
            <div className="oc-grid-3">
              {agents.map((agent, i) => (
                <div
                  key={agent.name}
                  ref={[agent0Ref, agent1Ref, agent2Ref][i]}
                  className="oc-agent-card"
                  style={{
                    background: '#111111', border: '0.5px solid #1E1E1E',
                    borderRadius: '16px', padding: '1.75rem 1.5rem',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '0.9rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.tagColor, flexShrink: 0 }} />
                    <span style={{
                      fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: agent.tagColor, fontWeight: 600,
                    }}>
                      {agent.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>{agent.name}</div>
                  <div style={{ fontSize: '13px', color: '#555555', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                    {agent.desc}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {agent.commands.map(cmd => (
                      <span key={cmd} style={{
                        fontFamily: 'monospace', fontSize: '11px', padding: '5px 10px',
                        borderRadius: '5px', background: '#0D0D0D',
                        border: '0.5px solid #222222', color: '#666666',
                      }}>
                        {cmd}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── TELEGRAM SECTION ────────────────────────────────────────────── */}
        <section id="telegram" ref={telegramSectionRef} style={{ padding: '6rem 1.75rem' }}>
          <div className="oc-grid-2" style={{ maxWidth: '860px', margin: '0 auto' }}>
            {/* Left */}
            <div>
              <SectionLabel text="Command Interface" />
              <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                Your agents, where you already are.
              </h2>
              <p style={{ color: '#555555', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
                Connect via Telegram, Discord, or WhatsApp — no new apps to learn. Your agents reach you on the platform your team already uses every day.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {telegramFeatures.map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: 'rgba(255,77,0,0.12)', border: '1px solid rgba(255,77,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {f.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#F0EEE8' }}>{f.title}</div>
                      <div style={{ fontSize: '12px', color: '#555555', lineHeight: 1.6, marginTop: '2px' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Real iPhone Frame + Telegram Chat */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              {/* Phone container */}
              <div className="oc-phone-mockup" style={{ position: 'relative', width: '380px' }}>
                {/* iPhone frame image */}
                <img
                  src="/—Pngtree—cell phone mockup_8987311.png"
                  alt=""
                  aria-hidden="true"
                  style={{ width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 2, pointerEvents: 'none' }}
                />

                {/* Screen content — positioned inside the frame */}
                <div style={{
                  position: 'absolute',
                  top: '7.2%', left: '28%', right: '28%', bottom: '7.5%',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  zIndex: 1,
                  background: '#0E1621',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Telegram status bar */}
                  <div style={{
                    padding: '8px 14px 0', background: '#17212B',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '10px', color: '#8899A6',
                  }}>
                    <span style={{ fontWeight: 600 }}>9:41</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#8899A6"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                      <svg width="14" height="10" viewBox="0 0 20 12" fill="#8899A6"><rect x="0" y="3" width="3" height="9" rx="0.5"/><rect x="4.5" y="1" width="3" height="11" rx="0.5"/><rect x="9" y="4" width="3" height="8" rx="0.5"/><rect x="13.5" y="0" width="3" height="12" rx="0.5"/></svg>
                      <div style={{ width: '20px', height: '9px', border: '1px solid #8899A6', borderRadius: '2px', padding: '1px', marginLeft: '2px' }}>
                        <div style={{ width: '60%', height: '100%', background: '#8899A6', borderRadius: '1px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Chat header */}
                  <div style={{
                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#17212B', borderBottom: '0.5px solid #0D1822',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6AB3F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7B68EE, #5B4FCF)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 600, color: '#fff',
                    }}>🤖</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#E4ECF2' }}>Finance Agent</div>
                      <div style={{ fontSize: '10px', color: '#6AB3F3' }}>bot</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6AB3F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                    </svg>
                  </div>

                  {/* Messages area */}
                  <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'hidden', background: '#0E1621' }}>
                    {/* Date separator */}
                    <div style={{ textAlign: 'center', margin: '2px 0 4px' }}>
                      <span style={{ fontSize: '9px', color: '#6D8295', background: '#182533', padding: '2px 10px', borderRadius: '10px' }}>Today</span>
                    </div>

                    {/* User: /report */}
                    <div ref={msg0Ref} style={{ alignSelf: 'flex-end', maxWidth: '70%' }}>
                      <div style={{
                        background: '#2B5278', color: '#E4ECF2', borderRadius: '12px 12px 4px 12px',
                        padding: '6px 10px', fontSize: '12px', lineHeight: 1.4,
                      }}>
                        <span style={{ color: '#7EB8E2', fontFamily: 'monospace' }}>/report</span>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: '2px' }}>09:41 ✓✓</div>
                      </div>
                    </div>

                    {/* Bot: Cash flow report */}
                    <div ref={msg1Ref} style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                      <div style={{
                        background: '#182533', color: '#D5DEE7', borderRadius: '12px 12px 12px 4px',
                        padding: '8px 10px', fontSize: '11px', lineHeight: 1.6,
                      }}>
                        <div style={{ fontSize: '11px', marginBottom: '5px' }}>📊 <span style={{ fontWeight: 600, color: '#E4ECF2' }}>Cash Flow Report — March</span></div>
                        <div style={{ fontSize: '10px', color: '#8899A6', borderLeft: '2px solid #2B5278', paddingLeft: '8px', margin: '4px 0' }}>
                          Revenue: <span style={{ color: '#5DC576' }}>$48,200</span><br />
                          Expenses: <span style={{ color: '#E06C75' }}>$31,450</span><br />
                          Net: <span style={{ color: '#5DC576', fontWeight: 600 }}>+$16,750</span>
                        </div>
                        <div style={{ fontSize: '9px', color: '#6D8295', marginTop: '3px' }}>Margin: 34.7% <span style={{ color: '#5DC576' }}>↑ 2.1%</span></div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: '3px' }}>09:41</div>
                      </div>
                    </div>

                    {/* User: /alert */}
                    <div ref={msg2Ref} style={{ alignSelf: 'flex-end', maxWidth: '70%' }}>
                      <div style={{
                        background: '#2B5278', color: '#E4ECF2', borderRadius: '12px 12px 4px 12px',
                        padding: '6px 10px', fontSize: '12px', lineHeight: 1.4,
                      }}>
                        <span style={{ color: '#7EB8E2', fontFamily: 'monospace' }}>/alert</span>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: '2px' }}>09:42 ✓✓</div>
                      </div>
                    </div>

                    {/* Bot: Alerts */}
                    <div ref={msg3Ref} style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                      <div style={{
                        background: '#182533', color: '#D5DEE7', borderRadius: '12px 12px 12px 4px',
                        padding: '8px 10px', fontSize: '11px', lineHeight: 1.6,
                      }}>
                        <div style={{ fontSize: '11px', marginBottom: '5px' }}>🔔 <span style={{ fontWeight: 600, color: '#E4ECF2' }}>2 Active Alerts</span></div>
                        <div style={{ fontSize: '10px', color: '#8899A6' }}>
                          <span style={{ color: '#E06C75' }}>●</span> Invoice #1042 overdue <span style={{ color: '#6D8295' }}>(3 days)</span><br />
                          <span style={{ color: '#E5C07B' }}>●</span> Expense spike detected <span style={{ color: '#6D8295' }}>(+18%)</span>
                        </div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: '3px' }}>09:42</div>
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div style={{
                    padding: '6px 8px', background: '#17212B', borderTop: '0.5px solid #0D1822',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6AB3F3" strokeWidth="1.5" style={{ flexShrink: 0, opacity: 0.7 }}>
                      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                    <div style={{
                      flex: 1, background: '#0E1621', borderRadius: '18px', padding: '6px 12px',
                      fontSize: '11px', color: '#3D5A73', border: '0.5px solid #1C2B3A',
                    }}>Message</div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6AB3F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                      <path d="M15.172 7l-6.586 6.586a2 2 0 1 0 2.828 2.828l6.414-6.586a4 4 0 0 0-5.656-5.656l-6.415 6.585a6 6 0 1 0 8.486 8.486L20.5 13" />
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6AB3F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    </svg>
                  </div>

                  {/* Home indicator bar */}
                  <div style={{ background: '#17212B', padding: '6px 0 8px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '100px', height: '4px', background: '#3D5A73', borderRadius: '4px', opacity: 0.5 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── STATS / NUMBERS ─────────────────────────────────────────────── */}
        <section ref={statsSecRef} style={{ padding: '6rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
<div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <SectionLabel text="By the numbers" />
              <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em' }}>
                Built for reliability.
              </h2>
            </div>
            <div className="oc-grid-4">
              {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
        <section ref={testimonialsSecRef} style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem' }}>
              <SectionLabel text="What users say" />
              <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em' }}>
                Real businesses. Real results.
              </h2>
            </div>
            <div className="oc-testimonials">
              {testimonials.map(t => (
                <div key={t.name} className="oc-testimonial-card" style={{
                  background: '#111111', border: '0.5px solid #1E1E1E',
                  borderRadius: '16px', padding: '1.75rem',
                  display: 'flex', flexDirection: 'column', gap: '1.25rem',
                }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2, 3, 4].map(s => (
                      <span key={s} style={{ color: '#FF4D00', fontSize: '12px' }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: '13px', color: '#777777', lineHeight: 1.8, flex: 1 }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(255,77,0,0.1)', border: '0.5px solid rgba(255,77,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 600, color: '#FF4D00', flexShrink: 0,
                    }}>
                      {t.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#F0EEE8' }}>{t.name}</div>
                      <div style={{ fontSize: '11px', color: '#444444', marginTop: '2px' }}>{t.role} · {t.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── PRICING ─────────────────────────────────────────────────────── */}
        <section ref={pricingSecRef} id="pricing" style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <SectionLabel text="Pricing" />
              <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em' }}>
                Simple, transparent pricing.
              </h2>
              <p style={{ color: '#555555', fontSize: '1rem', marginTop: '0.5rem' }}>
                Start free. Upgrade when you are ready.
              </p>
            </div>
            <div className="oc-grid-pricing">
              {pricing.map(tier => (
                <div key={tier.name} className="oc-pricing-card" style={{
                  background: tier.highlighted ? '#131313' : '#111111',
                  border: tier.highlighted ? '1px solid rgba(255,77,0,0.3)' : '0.5px solid #1E1E1E',
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
                      Most Popular
                    </div>
                  )}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '13px', color: tier.highlighted ? '#FF4D00' : '#555555', fontWeight: 500, marginBottom: '0.5rem' }}>
                      {tier.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '2.4rem', fontWeight: 500, letterSpacing: '-0.04em', color: '#F0EEE8' }}>
                        {tier.price}
                      </span>
                      {tier.price !== 'Free' && (
                        <span style={{ fontSize: '13px', color: '#444444' }}>/{tier.period.replace('per ', '')}</span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#555555', marginTop: '0.5rem', lineHeight: 1.5 }}>{tier.desc}</p>
                  </div>
                  <div style={{ flex: 1, marginBottom: '1.75rem' }}>
                    {tier.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <Check />
                        <span style={{ fontSize: '13px', color: '#888888', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      border: tier.highlighted ? 'none' : '0.5px solid #2A2A2A',
                      background: tier.highlighted ? '#FF4D00' : 'transparent',
                      color: tier.highlighted ? '#fff' : '#F0EEE8',
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

        <Divider />

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section ref={faqSecRef} id="faq" style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem' }}>
              <SectionLabel text="FAQ" />
              <h2 className="oc-section-heading" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 500, letterSpacing: '-0.03em' }}>
                Common questions.
              </h2>
            </div>
            <FAQAccordion items={faqItems} />
          </div>
        </section>

        <Divider />

        {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
        <section style={{ textAlign: 'center', padding: '7rem 1.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)', width: '600px', height: '400px',
            background: 'radial-gradient(ellipse, rgba(255,77,0,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Image 4: The Reveal */}
          <div ref={ctaLobsterRef} className="oc-cta-lobster" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(300px, 45vw, 550px)',
            opacity: 0,
            zIndex: 0,
            pointerEvents: 'none',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 85%)',
            maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 85%)',
            transition: 'opacity 1s ease-out',
          }}>
            <img src="/images/lobster-full.png" alt="The Reveal" style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
          </div>

          <div ref={ctaTextRef}>
          <h2 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 500,
            letterSpacing: '-0.04em', lineHeight: 1.12, marginBottom: '1rem', position: 'relative',
          }}>
            Your AI team is<br />ready to <span style={{ color: '#FF4D00' }}>deploy.</span>
          </h2>
          <p style={{ color: '#C0BAB0', fontSize: '1rem', lineHeight: 1.8, marginBottom: '2.5rem', position: 'relative' }}>
            Sign up in seconds. Launch your first agent.<br />Command it on Telegram, Discord, or WhatsApp before end of day.
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
            Launch OpenClaw Manager
          </button>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: '0.5px solid #1E1E1E', padding: '4rem 1.75rem 2rem' }}>
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
                    <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.025em', color: '#F0EEE8' }}>
                      Open<span style={{ color: '#FF4D00' }}>Claw</span>
                    </div>
                    <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#777777', marginTop: '2px' }}>Manager</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#888888', lineHeight: 1.8, maxWidth: '220px' }}>
                  Deploy domain-locked AI agents for Finance, Marketing, and Operations. Command via Telegram, Discord, or WhatsApp.
                </p>
              </div>

              {/* Product */}
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999999', marginBottom: '1rem', fontWeight: 500 }}>
                  Product
                </div>
                {[
                  { label: 'How it works', id: 'how-it-works' },
                  { label: 'Agents', id: 'agents' },
                  { label: 'Integrations', id: 'telegram' },
                  { label: 'Pricing', id: 'pricing' },
                ].map(link => (
                  <button
                    key={link.label}
                    onClick={() => scrollTo(link.id)}
                    style={{
                      display: 'block', fontSize: '13px', color: '#888888',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px 0', textAlign: 'left', transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F0EEE8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#888888' }}
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              {/* Company */}
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999999', marginBottom: '1rem', fontWeight: 500 }}>
                  Company
                </div>
                {['About', 'Blog', 'Careers', 'Press'].map(item => (
                  <a key={item} href="#" style={{ display: 'block', fontSize: '13px', color: '#888888', textDecoration: 'none', padding: '4px 0', transition: 'color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F0EEE8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#888888' }}
                  >
                    {item}
                  </a>
                ))}
              </div>

              {/* Legal */}
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999999', marginBottom: '1rem', fontWeight: 500 }}>
                  Legal
                </div>
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'].map(item => (
                  <a key={item} href="#" style={{ display: 'block', fontSize: '13px', color: '#888888', textDecoration: 'none', padding: '4px 0', transition: 'color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F0EEE8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#888888' }}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Footer bottom bar */}
            <div style={{ borderTop: '0.5px solid #333333', paddingTop: '1.5rem' }}>
              <div className="oc-footer-bottom">
                <span style={{ fontSize: '12px', color: '#777777' }}>
                  © {new Date().getFullYear()} OpenClaw Manager · SLTVerse. All rights reserved.
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {[
                    { label: 'Twitter / X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                    { label: 'GitHub', path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
                    { label: 'LinkedIn', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                  ].map(social => (
                    <a
                      key={social.label}
                      href="#"
                      aria-label={social.label}
                      style={{ color: '#777777', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F0EEE8' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#777777' }}
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

      </div>
    </>
  )
}
