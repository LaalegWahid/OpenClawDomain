'use client'

import { useEffect, useRef, useState } from 'react'
import ClawScrollSection from '../../components/ClawScrollSection'

// ─── Types ───────────────────────────────────────────────────────────────────
interface StepCard {
  num: string
  title: string
  desc: string
}

interface AgentDetail {
  tag: string
  name: string
  desc: string
  commands: string[]
}

// ─── Data ────────────────────────────────────────────────────────────────────
const steps: StepCard[] = [
  { num: '01', title: 'Sign Up', desc: 'Create your account in seconds. No credit card required to get started.' },
  { num: '02', title: 'Launch an Agent', desc: 'Choose from Finance, Marketing, or Ops. Your agent is live immediately.' },
  { num: '03', title: 'Command via Telegram', desc: 'Send commands, receive reports, and get alerts directly in Telegram.' },
]

const agents: AgentDetail[] = [
  {
    tag: 'Finance',
    name: 'Finance Agent',
    desc: 'Tracks expenses, flags anomalies, and generates instant cash flow summaries on demand.',
    commands: ['/status', '/report', '/alert'],
  },
  {
    tag: 'Marketing',
    name: 'Marketing Agent',
    desc: 'Drafts social posts, schedules content, and tracks campaign metrics automatically.',
    commands: ['/draft', '/schedule', '/metrics'],
  },
  {
    tag: 'Operations',
    name: 'Ops Agent',
    desc: 'Manages tasks, assigns to team members, and delivers daily standup summaries.',
    commands: ['/tasks', '/assign', '/standup'],
  },
]

const telegramFeatures = [
  {
    icon: '⚡',
    title: 'Instant commands',
    desc: 'Type /report and get a full summary in seconds.',
  },
  {
    icon: '🔔',
    title: 'Proactive alerts',
    desc: 'Your agents message you when something needs attention.',
  },
  {
    icon: '🔗',
    title: 'Synced to dashboard',
    desc: 'Every Telegram action appears in your web activity log.',
  },
]

const activityRows = [
  { agent: 'Finance Agent', action: 'Generated cash flow report', time: '2 min ago' },
  { agent: 'Ops Agent', action: 'Assigned task to Team Member', time: '8 min ago' },
  { agent: 'Finance Agent', action: 'Flagged anomaly in utilities', time: '15 min ago' },
  { agent: 'Marketing Agent', action: 'Drafted 3 social posts', time: '1 hr ago' },
  { agent: 'Ops Agent', action: 'Sent daily standup summary', time: '2 hr ago' },
]

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      style={{
        height: '0.5px',
        background: 'linear-gradient(90deg, transparent, #1E1E1E 20%, #1E1E1E 80%, transparent)',
        margin: '0 1.75rem',
      }}
    />
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: '11px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#FF4D00',
        marginBottom: '1rem',
        fontWeight: 500,
      }}
    >
      {text}
    </p>
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

  // Step cards
  const step0Ref = useRef<HTMLDivElement>(null)
  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const stepsRowRef = useRef<HTMLDivElement>(null)

  // Agent cards
  const agent0Ref = useRef<HTMLDivElement>(null)
  const agent1Ref = useRef<HTMLDivElement>(null)
  const agent2Ref = useRef<HTMLDivElement>(null)
  const agentsRowRef = useRef<HTMLDivElement>(null)

  // Telegram section
  const telegramSectionRef = useRef<HTMLDivElement>(null)
  const msg0Ref = useRef<HTMLDivElement>(null)
  const msg1Ref = useRef<HTMLDivElement>(null)
  const msg2Ref = useRef<HTMLDivElement>(null)
  const msg3Ref = useRef<HTMLDivElement>(null)

  // Dashboard parallax
  const dashboardRef = useRef<HTMLDivElement>(null)
  const dashWrapRef = useRef<HTMLDivElement>(null)

  // ── Step cards IntersectionObserver ────────────────────────────────────────
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

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
              el.style.opacity = '1'
              el.style.transform = 'translateY(0)'
            }, delays[i])
            obs.disconnect()
          }
        },
        { threshold: 0.15 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  // ── Agent cards IntersectionObserver ───────────────────────────────────────
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

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
              el.style.opacity = '1'
              el.style.transform = 'translateY(0)'
            }, delays[i])
            obs.disconnect()
          }
        },
        { threshold: 0.15 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  // ── Telegram message animation ─────────────────────────────────────────────
  useEffect(() => {
    const msgRefs = [msg0Ref, msg1Ref, msg2Ref, msg3Ref]
    const msgDelays = [0, 400, 900, 1300]

    msgRefs.forEach(ref => {
      const el = ref.current
      if (el) el.style.opacity = '0'
    })

    const sectionEl = telegramSectionRef.current
    if (!sectionEl) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          msgRefs.forEach((ref, i) => {
            const el = ref.current
            if (!el) return
            setTimeout(() => {
              el.style.transition = 'opacity 0.3s ease'
              el.style.opacity = '1'
            }, msgDelays[i])
          })
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(sectionEl)
    return () => obs.disconnect()
  }, [])

  // ── Dashboard parallax ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const wrap = dashWrapRef.current
      const dash = dashboardRef.current
      if (!wrap || !dash) return
      const rect = wrap.getBoundingClientRect()
      const vh = window.innerHeight
      // Map rect.top: vh (not yet visible) → -rect.height (fully passed)
      // We want translateY 30px → -20px over that range
      const progress = 1 - (rect.top + rect.height) / (vh + rect.height)
      const clampedP = Math.min(Math.max(progress, 0), 1)
      const ty = 30 - clampedP * 50
      dash.style.transform = `translateY(${ty}px)`
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ background: '#0A0A0A', color: '#F0EEE8', minHeight: '100vh' }}>

        {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
        <nav
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 100,
            background: 'rgba(10,10,10,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '0.5px solid #1E1E1E',
          }}
        >
          {/* Main bar */}
          <div style={{
            height: '60px',
            padding: '0 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <svg width="32" height="32" viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }}>
                <rect width="56" height="56" rx="13" fill="#FF4D00"/>
                <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
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
              <div style={{ display: 'flex', gap: '2rem' }}>
                {['How it works', 'Agents', 'Demo'].map(link => (
                  <a key={link} href="#" style={{ fontSize: '13px', color: '#555555', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F0EEE8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#555555' }}>
                    {link}
                  </a>
                ))}
              </div>
            )}

            {/* Desktop CTA / Mobile hamburger */}
            {isMobile ? (
              <button onClick={() => setNavOpen(o => !o)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#F0EEE8', padding: '6px', display: 'flex', flexDirection: 'column',
                gap: '5px', alignItems: 'flex-end',
              }}>
                <span style={{ display: 'block', width: '20px', height: '1.5px', background: navOpen ? '#FF4D00' : '#F0EEE8', transition: 'background 0.2s, transform 0.2s', transformOrigin: 'center', transform: navOpen ? 'translateY(3.25px) rotate(45deg)' : 'none' }} />
                <span style={{ display: 'block', width: '14px', height: '1.5px', background: navOpen ? 'transparent' : '#555555', transition: 'background 0.2s' }} />
                <span style={{ display: 'block', width: '20px', height: '1.5px', background: navOpen ? '#FF4D00' : '#F0EEE8', transition: 'background 0.2s, transform 0.2s', transformOrigin: 'center', transform: navOpen ? 'translateY(-3.25px) rotate(-45deg)' : 'none' }} />
              </button>
            ) : (
              <button style={{ background: '#FF4D00', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                onClick={() => window.location.href = '/register'}>
                Get Started →
              </button>
            )}
          </div>

          {/* Mobile dropdown menu */}
          {isMobile && (
            <div style={{
              maxHeight: navOpen ? '260px' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.28s ease',
              borderTop: navOpen ? '0.5px solid #1E1E1E' : 'none',
            }}>
              <div style={{ padding: '1rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {['How it works', 'Agents', 'Demo'].map(link => (
                  <a key={link} href="#" onClick={() => setNavOpen(false)} style={{
                    fontSize: '15px', color: '#555555', textDecoration: 'none',
                    padding: '10px 0', borderBottom: '0.5px solid #111',
                  }}>
                    {link}
                  </a>
                ))}
                <button style={{ marginTop: '12px', background: '#FF4D00', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', width: '100%' }}
                  onClick={() => window.location.href = '/register'}>
                  Get Started →
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section
          style={{
            minHeight: '100vh',
            paddingTop: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '60px 1.5rem 4rem',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '2rem',
            }}
          >
          </div>

          {/* H1 */}
          <h1
            style={{
              fontSize: 'clamp(2.8rem, 7vw, 5rem)',
              fontWeight: 500,
              lineHeight: 1.06,
              letterSpacing: '-0.04em',
              maxWidth: '660px',
              marginBottom: '1.5rem',
              margin: '0 auto 1.5rem',
            }}
          >
            Deploy <span style={{ color: '#FF4D00' }}>AI Agents.</span>
            <br />Run your business
            <br />on autopilot.
          </h1>

          {/* Subtext */}
          <p
            style={{
              fontSize: '1.05rem',
              color: '#555555',
              maxWidth: '400px',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
              margin: '0 auto 2.5rem',
            }}
          >
            Launch specialized agents for Finance, Marketing, and Operations.
            Monitor everything. Command via Telegram.
          </p>

          {/* CTA Row */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              style={{
                background: '#FF4D00',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onClick={() => window.location.href = '/register'}
            >
              Launch Your First Agent →
            </button>
            <button
              style={{
                background: 'transparent',
                color: '#F0EEE8',
                border: '0.5px solid #2A2A2A',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                cursor: 'pointer',
              }}
              onClick={() => window.location.href = '/register'}
            >
              Watch Demo
            </button>
          </div>

        </section>

        {/* ── CLAW SCROLL SECTION ─────────────────────────────────────────── */}
        <ClawScrollSection />

        {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
        <section style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <SectionLabel text="How It Works" />
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                marginBottom: '0.75rem',
              }}
            >
              From zero to running in three steps.
            </h2>
            <p style={{ color: '#555555', fontSize: '1rem' }}>
              No technical setup required. Just pick an agent and go.
            </p>

            <div
              ref={stepsRowRef}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '2.5rem',
              }}
            >
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  ref={[step0Ref, step1Ref, step2Ref][i]}
                  style={{
                    background: '#111111',
                    border: '0.5px solid #1E1E1E',
                    borderRadius: '16px',
                    padding: '2rem 1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top accent */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: '#FF4D00',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '4rem',
                      fontWeight: 500,
                      lineHeight: 1,
                      color: 'rgba(255,77,0,0.12)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {step.num}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555555', lineHeight: 1.7 }}>
                    {step.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── MEET THE AGENTS ─────────────────────────────────────────────── */}
        <section style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <SectionLabel text="Meet the Agents" />
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                marginBottom: '0.75rem',
              }}
            >
              Three agents. Every side of your business.
            </h2>

            <div
              ref={agentsRowRef}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginTop: '2.5rem',
              }}
            >
              {agents.map((agent, i) => (
                <div
                  key={agent.name}
                  ref={[agent0Ref, agent1Ref, agent2Ref][i]}
                  style={{
                    background: '#111111',
                    border: '0.5px solid #1E1E1E',
                    borderRadius: '16px',
                    padding: '1.75rem 1.5rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#444444',
                      marginBottom: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    {agent.tag}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
                    {agent.name}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#555555',
                      lineHeight: 1.7,
                      marginBottom: '1.1rem',
                    }}
                  >
                    {agent.desc}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {agent.commands.map(cmd => (
                      <span
                        key={cmd}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          background: '#0D0D0D',
                          border: '0.5px solid #222222',
                          color: '#666666',
                          display: 'inline-block',
                        }}
                      >
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

        {/* ── LIVE IN TELEGRAM ────────────────────────────────────────────── */}
        <section
          ref={telegramSectionRef}
          style={{ padding: '6rem 1.75rem' }}
        >
          <div
            style={{
              maxWidth: '860px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            {/* Left column */}
            <div>
              <SectionLabel text="Command Interface" />
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  marginBottom: '0.75rem',
                }}
              >
                Your agents live in Telegram.
              </h2>
              <p style={{ color: '#555555', fontSize: '0.95rem', lineHeight: 1.7 }}>
                No new apps. No dashboards you have to check. Your agents reach you where you already are.
              </p>

              <div
                style={{
                  marginTop: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {telegramFeatures.map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255,77,0,0.08)',
                        border: '0.5px solid rgba(255,77,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '13px',
                      }}
                    >
                      {f.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#F0EEE8' }}>
                        {f.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#555555',
                          lineHeight: 1.6,
                          marginTop: '2px',
                        }}
                      >
                        {f.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — Phone mockup */}
            <div>
              <div
                style={{
                  width: '260px',
                  margin: '0 auto',
                  background: '#0D0D0D',
                  border: '0.5px solid #2A2A2A',
                  borderRadius: '36px',
                  padding: '14px',
                  boxShadow: '0 0 60px rgba(255,77,0,0.04)',
                }}
              >
                <div
                  style={{
                    background: '#0A0A0A',
                    borderRadius: '26px',
                    overflow: 'hidden',
                    minHeight: '420px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Chat header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '14px 14px 10px',
                      borderBottom: '0.5px solid #1A1A1A',
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(255,77,0,0.1)',
                        border: '0.5px solid rgba(255,77,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      ⬡
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Finance Agent</div>
                      <div style={{ fontSize: '10px', color: '#4CAF50' }}>● Online</div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    style={{
                      flex: 1,
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Message 1 — user */}
                    <div
                      ref={msg0Ref}
                      style={{
                        alignSelf: 'flex-end',
                        background: '#FF4D00',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '12px 12px 2px 12px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    >
                      /report
                    </div>

                    {/* Message 2 — agent */}
                    <div
                      ref={msg1Ref}
                      style={{
                        alignSelf: 'flex-start',
                        background: '#1A1A1A',
                        color: '#F0EEE8',
                        padding: '10px 12px',
                        borderRadius: '12px 12px 12px 2px',
                        fontSize: '12px',
                        lineHeight: 1.6,
                      }}
                    >
                      📊 Cash Flow Report
                      <br />Revenue: +24,500 MAD
                      <br />Expenses: 18,200 MAD
                      <br />Net:{' '}
                      <span style={{ color: '#FF4D00' }}>+6,300 MAD ↑</span>
                      <br />⚠ 2 anomalies detected
                    </div>

                    {/* Message 3 — user */}
                    <div
                      ref={msg2Ref}
                      style={{
                        alignSelf: 'flex-end',
                        background: '#FF4D00',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '12px 12px 2px 12px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                      }}
                    >
                      /alert
                    </div>

                    {/* Message 4 — agent */}
                    <div
                      ref={msg3Ref}
                      style={{
                        alignSelf: 'flex-start',
                        background: '#1A1A1A',
                        color: '#F0EEE8',
                        padding: '10px 12px',
                        borderRadius: '12px 12px 12px 2px',
                        fontSize: '12px',
                        lineHeight: 1.6,
                      }}
                    >
                      🔔 2 Active Alerts
                      <br />• Utilities expense +340%
                      <br />• Invoice #082 overdue
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── DASHBOARD PREVIEW ───────────────────────────────────────────── */}
        <section ref={dashWrapRef} style={{ padding: '6rem 1.75rem' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
            <SectionLabel text="Dashboard" />
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                marginBottom: '0.5rem',
              }}
            >
              Everything in one place.
            </h2>
            <p style={{ color: '#555555', fontSize: '0.95rem' }}>
              A real-time view of every agent, command, and alert.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div
            ref={dashboardRef}
            style={{
              maxWidth: '860px',
              margin: '2.5rem auto 0',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '0.5px solid #1E1E1E',
              position: 'relative',
              transform: 'translateY(30px)',
            }}
          >
            {/* Top gradient fade */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'linear-gradient(to bottom, #0A0A0A, transparent)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />

            {/* Inner dashboard grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '420px',
              }}
            >
              {/* Sidebar */}
              <div
                style={{
                  background: '#0D0D0D',
                  borderRight: '0.5px solid #1E1E1E',
                  padding: '1.5rem 1rem',
                }}
              >
                {/* Logo row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '1.5rem',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }}>
                    <rect width="56" height="56" rx="13" fill="#FF4D00"/>
                    <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                    <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                    <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: '#F0EEE8' }}>
                      Open<span style={{ color: '#FF4D00' }}>Claw</span>
                    </div>
                    <div style={{ fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444444', marginTop: '2px' }}>
                      Manager
                    </div>
                  </div>
                </div>

                {/* Nav items */}
                {[
                  { label: 'Overview', active: true },
                  { label: 'Agents', active: false },
                  { label: 'Activity', active: false },
                  { label: 'Settings', active: false },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      marginBottom: '4px',
                      color: item.active ? '#FF4D00' : '#555555',
                      background: item.active ? 'rgba(255,77,0,0.08)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div style={{ background: '#111111', padding: '1.5rem' }}>
                {/* Stat cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '1.5rem',
                  }}
                >
                  {[
                    { label: 'Total Agents', value: '3' },
                    { label: 'Active Commands', value: '12' },
                    { label: 'Last Synced', value: 'just now', accent: true },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      style={{
                        background: '#0D0D0D',
                        border: '0.5px solid #1E1E1E',
                        borderRadius: '12px',
                        padding: '1rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#555555',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: '6px',
                        }}
                      >
                        {stat.label}
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 500,
                          color: stat.accent ? '#FF4D00' : '#F0EEE8',
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Activity log */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Activity</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      color: '#444444',
                    }}
                  >
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#FF4D00',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }} />
                    Live
                  </span>
                </div>

                {/* Table rows */}
                {activityRows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr 1fr',
                      gap: '8px',
                      padding: '10px 0',
                      borderBottom: '0.5px solid #1A1A1A',
                      alignItems: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: '#FF4D00' }}>{row.agent}</span>
                    <span style={{ color: '#555555' }}>{row.action}</span>
                    <span style={{ color: '#333333', textAlign: 'right' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
        <section
          style={{
            textAlign: 'center',
            padding: '7rem 1.75rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Radial glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              width: '500px',
              height: '300px',
              background:
                'radial-gradient(ellipse, rgba(255,77,0,0.05) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* SVG arch ornament */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
            <svg
              width="70"
              height="80"
              viewBox="0 0 70 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Keyhole arch: rectangle with rounded top */}
              <path
                d="M10 80 L10 35 Q10 10 35 10 Q60 10 60 35 L60 80 Z"
                stroke="#FF4D00"
                strokeWidth="1"
                fill="none"
                opacity="0.2"
              />
              {/* Inner circle */}
              <circle
                cx="35"
                cy="35"
                r="10"
                stroke="#FF4D00"
                strokeWidth="1"
                fill="none"
                opacity="0.3"
              />
            </svg>
          </div>

          <h2
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 500,
              letterSpacing: '-0.04em',
              lineHeight: 1.12,
              marginBottom: '1rem',
              position: 'relative',
            }}
          >
            Your AI team is
            <br />ready to <span style={{ color: '#FF4D00' }}>deploy.</span>
          </h2>

          <p
            style={{
              color: '#555555',
              fontSize: '1rem',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
              position: 'relative',
            }}
          >
            Sign up in seconds. Launch your first agent.
            <br />Command it on Telegram before end of day.
          </p>

          <button
            style={{
              background: '#FF4D00',
              color: '#FFFFFF',
              border: 'none',
              padding: '18px 40px',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              position: 'relative',
            }}
            onClick={() => window.location.href = '/register'}
          >
            Launch OpenClaw Manager →
          </button>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: '0.5px solid #1E1E1E',
            padding: '1.5rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 56 56" fill="none" style={{ flexShrink: 0 }}>
              <rect width="56" height="56" rx="13" fill="#FF4D00"/>
              <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
              <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
              <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
            </svg>
            <span style={{ fontSize: '12px', color: '#333333' }}>
              © 2025 OpenClaw Manager · SLTVerse
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#333333' }}>
            Built for the future of business.
          </span>
        </footer>
      </div>
    </>
  )
}
