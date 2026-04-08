'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '../../../components/Navbar'

const NAV = [
  { id: 'introduction',    label: 'Introduction' },
  { id: 'quickstart',      label: 'Quickstart' },
  { id: 'agents',          label: 'Agents' },
  { id: 'skills',          label: 'Skills' },
  { id: 'mcp',             label: 'MCP Servers' },
  { id: 'integrations',    label: 'Integrations' },
  { id: 'byok',            label: 'BYOK' },
  { id: 'memory',          label: 'Memory & Context' },
  { id: 'documents',       label: 'PDF Documents' },
  { id: 'dashboard',       label: 'Dashboard' },
  { id: 'pricing',         label: 'Pricing' },
  { id: 'security',        label: 'Security' },
  { id: 'faq',             label: 'FAQ' },
]

function Tag({ children, color = '#FF4D00' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '3px 10px', borderRadius: '100px',
      background: `${color}18`, border: `0.5px solid ${color}40`, color,
    }}>
      {children}
    </span>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: 'monospace', fontSize: '12px',
      background: '#0D0D0D', border: '0.5px solid #2A2A2A',
      color: '#FF8C42', padding: '2px 7px', borderRadius: '5px',
    }}>
      {children}
    </code>
  )
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{
      borderRadius: '12px', overflow: 'hidden',
      border: '0.5px solid #1E1E1E', margin: '1.25rem 0',
    }}>
      {title && (
        <div style={{
          background: '#0D0D0D', borderBottom: '0.5px solid #1E1E1E',
          padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: '#555555', fontFamily: 'monospace' }}>{title}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: copied ? '#FF4D00' : '#444444',
              transition: 'color 0.2s',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <pre style={{
        background: '#0A0A0A', margin: 0, padding: '1.25rem 1.5rem',
        fontSize: '13px', color: '#C8C6C0', lineHeight: 1.8,
        overflowX: 'auto', fontFamily: 'monospace',
      }}>
        {children}
      </pre>
    </div>
  )
}

function Callout({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const colors = {
    info:    { border: '#3B82F6', bg: '#3B82F608', icon: 'ℹ', text: '#93C5FD' },
    warning: { border: '#F59E0B', bg: '#F59E0B08', icon: '⚠', text: '#FCD34D' },
    tip:     { border: '#FF4D00', bg: '#FF4D0008', icon: '◆', text: '#FF8C42' },
  }
  const c = colors[type]
  return (
    <div style={{
      borderLeft: `2px solid ${c.border}`, background: c.bg,
      borderRadius: '0 10px 10px 0', padding: '1rem 1.25rem',
      margin: '1.25rem 0', display: 'flex', gap: '10px', alignItems: 'flex-start',
    }}>
      <span style={{ color: c.text, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{c.icon}</span>
      <div style={{ fontSize: '13px', color: '#AAAAAA', lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ padding: '3rem 0', borderBottom: '0.5px solid #1A1A1A' }}>
      {children}
    </section>
  )
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{
      fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 500,
      letterSpacing: '-0.03em', color: '#F0EEE8', marginBottom: '0.5rem', lineHeight: 1.2,
    }}>
      {children}
    </h1>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '1.4rem', fontWeight: 500,
      letterSpacing: '-0.025em', color: '#F0EEE8',
      marginTop: '2.5rem', marginBottom: '0.75rem', lineHeight: 1.3,
    }}>
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: '1rem', fontWeight: 600,
      color: '#DDDDDD', marginTop: '1.75rem', marginBottom: '0.5rem',
    }}>
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '14px', color: '#AAAAAA', lineHeight: 1.9, margin: '0.75rem 0' }}>
      {children}
    </p>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', margin: '1.25rem 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '10px 14px',
                color: '#888888', fontWeight: 500, fontSize: '11px',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                borderBottom: '0.5px solid #222222', background: '#0D0D0D',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid #181818' }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '10px 14px', color: '#BBBBBB', lineHeight: 1.6,
                  verticalAlign: 'top',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveSection(e.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })
    return () => observerRef.current?.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    setMobileNavOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 4px; }
        .doc-nav-link { transition: color 0.15s, background 0.15s; }
        .doc-nav-link:hover { color: #F0EEE8 !important; background: rgba(255,255,255,0.04) !important; }
        @media(max-width: 860px) {
          .doc-sidebar { display: none !important; }
          .doc-mobile-btn { display: flex !important; }
        }
        @media(min-width: 861px) {
          .doc-mobile-btn { display: none !important; }
          .doc-mobile-nav { display: none !important; }
        }
      `}</style>

      <div style={{ background: '#0F0F0F', color: '#F0EEE8', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ── NAVBAR ── */}
        <Navbar />

        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div
            className="doc-mobile-nav"
            style={{
              position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
              background: 'rgba(10,10,10,0.97)', zIndex: 99,
              padding: '2rem 1.5rem', overflowY: 'auto',
            }}
          >
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 14px', borderRadius: '8px',
                  fontSize: '14px', color: '#AAAAAA', marginBottom: '2px',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', paddingTop: '60px' }}>

          {/* Sidebar */}
          <aside className="doc-sidebar" style={{
            position: 'fixed', top: '60px', left: 0, bottom: 0, width: '220px',
            background: '#0A0A0A', borderRight: '0.5px solid #1A1A1A',
            overflowY: 'auto', padding: '2rem 0',
          }}>
            <div style={{ padding: '0 1rem' }}>
              <div style={{
                fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#444444', fontWeight: 500, marginBottom: '0.75rem', padding: '0 8px',
              }}>
                Documentation
              </div>
              {NAV.map(item => (
                <button
                  key={item.id}
                  className="doc-nav-link"
                  onClick={() => scrollTo(item.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: activeSection === item.id ? 'rgba(255,77,0,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    padding: '7px 10px', borderRadius: '8px',
                    fontSize: '13px',
                    color: activeSection === item.id ? '#FF4D00' : '#666666',
                    marginBottom: '1px',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main style={{
            marginLeft: '220px',
            maxWidth: '820px',
            padding: '3rem 3rem 6rem',
            flex: 1,
            minWidth: 0,
          }}
          className="doc-main"
          >

            {/* ── INTRODUCTION ─────────────────────────────────────────── */}
            <Section id="introduction">
              <div style={{ marginBottom: '1.5rem' }}>
                <Tag>Platform Overview</Tag>
              </div>
              <H1>OpenClaw Documentation</H1>
              <p style={{ fontSize: '1.05rem', color: '#888888', lineHeight: 1.8, margin: '1rem 0 2rem' }}>
                OpenClaw is an AI agent platform that lets you build, deploy, and manage custom agents for any business domain — delivered straight to Telegram, Discord, or WhatsApp.
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px', margin: '2rem 0',
              }}>
                {[
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    ),
                    title: 'Live in 2 minutes',
                    desc: 'No infrastructure, no engineers. Sign up and deploy.',
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                    ),
                    title: 'Any domain',
                    desc: 'Legal, HR, Real Estate, Healthcare — any field you operate in.',
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                      </svg>
                    ),
                    title: 'BYOK',
                    desc: 'Bring your own API keys. Full control over your AI costs.',
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF4D00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                      </svg>
                    ),
                    title: 'MCP-ready',
                    desc: 'Connect Notion, GitHub, Google Calendar and more.',
                  },
                ].map(c => (
                  <div key={c.title} style={{
                    background: '#111111', border: '0.5px solid #1E1E1E',
                    borderRadius: '12px', padding: '1.25rem',
                  }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '9px',
                      background: 'rgba(255,77,0,0.07)', border: '0.5px solid rgba(255,77,0,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '12px',
                    }}>
                      {c.icon}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8', marginBottom: '4px' }}>{c.title}</div>
                    <div style={{ fontSize: '12px', color: '#777777', lineHeight: 1.6 }}>{c.desc}</div>
                  </div>
                ))}
              </div>

              <H2>What is an OpenClaw agent?</H2>
              <P>
                An agent is an AI-powered bot that lives in your messaging app of choice. You define its domain of expertise — Legal, HR, Real Estate, or any other field — and it becomes a specialist for that area. It can answer questions, execute tasks, generate reports, send proactive alerts, and deliver PDFs, all without you opening a browser.
              </P>
              <P>
                Every agent runs in its own isolated container on AWS ECS. It maintains conversation history, understands context across messages, and stays strictly within the domain you defined.
              </P>

              <H2>Core concepts</H2>
              <Table
                headers={['Concept', 'Description']}
                rows={[
                  ['Agent', 'A domain-specialized AI bot deployed in a container and connected to a messaging platform.'],
                  ['Skill', 'A capability given to an agent — auto-generated, imported from the library, or custom-built.'],
                  ['Channel', 'A messaging platform connection (Telegram, Discord, WhatsApp) attached to an agent.'],
                  ['MCP Server', 'A Model Context Protocol server that extends an agent\'s reach to external tools and APIs.'],
                  ['BYOK', 'Bring Your Own Key — connect your own API key so your agent uses your AI credits directly.'],
                  ['Memory', 'The chat history an agent holds per conversation, used as context for future messages.'],
                ]}
              />
            </Section>

            {/* ── QUICKSTART ───────────────────────────────────────────── */}
            <Section id="quickstart">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Getting Started</Tag></div>
              <H1>Quickstart</H1>
              <P>From zero to a running agent in under 2 minutes.</P>

              {[
                {
                  step: '01',
                  title: 'Create your account',
                  desc: 'Sign up at openclaw.sltverse.com. No credit card required to get started.',
                },
                {
                  step: '02',
                  title: 'Start your free trial',
                  desc: 'Every account gets a 15-day free trial on the first agent. No payment info needed.',
                },
                {
                  step: '03',
                  title: 'Build your agent',
                  desc: 'Name your agent, write its system prompt, and pick the domain it operates in.',
                },
                {
                  step: '04',
                  title: 'Connect a messaging platform',
                  desc: 'Add a Telegram bot token, a Discord bot token, or scan a WhatsApp QR code.',
                },
                {
                  step: '05',
                  title: 'Deploy',
                  desc: 'Hit Deploy. Your agent spins up in seconds and is live in your chat.',
                },
              ].map(s => (
                <div key={s.step} style={{
                  display: 'flex', gap: '1.25rem', marginBottom: '1.25rem',
                  background: '#111111', border: '0.5px solid #1E1E1E',
                  borderRadius: '12px', padding: '1.25rem',
                }}>
                  <div style={{
                    fontSize: '1.6rem', fontWeight: 500, color: 'rgba(255,77,0,0.3)',
                    lineHeight: 1, flexShrink: 0, minWidth: '36px',
                  }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8', marginBottom: '4px' }}>{s.title}</div>
                    <div style={{ fontSize: '13px', color: '#888888', lineHeight: 1.7 }}>{s.desc}</div>
                  </div>
                </div>
              ))}

              <H2>Your first command</H2>
              <P>Once your agent is live, open your messaging app and send:</P>
              <CodeBlock title="Telegram / Discord / WhatsApp">{`/summary

→ Your agent replies with a summary of recent activity in its domain.`}</CodeBlock>

              <Callout type="tip">
                You can send any natural language message too — commands are shortcuts, not requirements. Try <strong>"What should I focus on today?"</strong> and your agent will answer in context.
              </Callout>
            </Section>

            {/* ── AGENTS ───────────────────────────────────────────────── */}
            <Section id="agents">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Core</Tag></div>
              <H1>Agents</H1>
              <P>
                An agent is the core unit of OpenClaw. Each agent is scoped to a domain, equipped with skills, and deployed as an isolated container. It connects to one or more messaging platforms and responds to commands and natural language.
              </P>

              <H2>Creating an agent</H2>
              <P>From the dashboard, click <strong style={{ color: '#F0EEE8' }}>New Agent</strong>. You'll configure:</P>
              <Table
                headers={['Field', 'Description', 'Required']}
                rows={[
                  ['Name', 'A display name for this agent (e.g. "Legal Researcher").', 'Yes'],
                  ['System Prompt', 'The personality, tone, and specific instructions for this agent.', 'Yes'],
                  ['Domain', 'The business field this agent specializes in. Enforced at runtime.', 'Yes'],
                  ['Platform', 'Telegram, Discord, or WhatsApp. Can add more later from Channels.', 'Yes'],
                  ['Bot Token / QR', 'Platform-specific credentials for the messaging integration.', 'Yes'],
                ]}
              />

              <H2>Domain boundary enforcement</H2>
              <P>
                Every agent has a domain preamble prepended to its system prompt at runtime. This preamble instructs the agent to refuse any question outside its designated field and redirect the user appropriately. You cannot remove this boundary — it ensures your Legal agent never drifts into medical advice, and your HR agent never handles finance queries.
              </P>
              <Callout type="info">
                The boundary preamble is system-level and cannot be overridden by user messages. Jailbreak attempts are handled gracefully — the agent acknowledges the limit and redirects.
              </Callout>

              <H2>Agent status</H2>
              <Table
                headers={['Status', 'Meaning']}
                rows={[
                  ['active', 'Container is running and the agent is accepting messages.'],
                  ['starting', 'Container is spinning up. Usually resolves within 30–60 seconds.'],
                  ['stopped', 'Container has been manually stopped. No messages will be processed.'],
                  ['error', 'The container exited unexpectedly. OpenClaw will attempt an automatic restart.'],
                ]}
              />

              <H2>Agent limits per plan</H2>
              <Table
                headers={['Plan', 'Active Agents']}
                rows={[
                  ['Tier A', 'Up to 5'],
                  ['Tier B', 'Up to 10'],
                  ['Tier C', 'Up to 15'],
                ]}
              />

              <H2>Automatic recovery</H2>
              <P>
                A background cron job runs continuously to check all active agents. If a container has stopped unexpectedly, OpenClaw automatically relaunches it and logs the recovery event in the activity log. You'll see an entry like <Code>auto_restart</Code> in the agent timeline.
              </P>
            </Section>

            {/* ── SKILLS ───────────────────────────────────────────────── */}
            <Section id="skills">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Skills System</Tag></div>
              <H1>Skills</H1>
              <P>
                Skills are the capabilities you give an agent. They tell the agent what it knows how to do, how to structure its outputs, and which tools or workflows to invoke when asked.
              </P>

              <H2>Auto-generated skills</H2>
              <P>
                When you create a new agent, OpenClaw automatically generates a curated skill set based on the domain you selected. A Legal agent ships with contract review, case research, and memo drafting. An HR agent ships with resume screening, interview scheduling, and onboarding checklists. You get a working agent out of the box — no configuration needed.
              </P>

              <H2>Skills library</H2>
              <P>
                From the agent's <strong style={{ color: '#F0EEE8' }}>Skills</strong> tab in the dashboard, you can browse and import pre-built skills:
              </P>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px', margin: '1.25rem 0',
              }}>
                {[
                  { name: 'Web Search', desc: 'Live internet search via tool call.' },
                  { name: 'PDF Generation', desc: 'Produce formatted PDF reports on demand.' },
                  { name: 'Data Analysis', desc: 'Interpret tables, numbers, and trends.' },
                  { name: 'External API Calls', desc: 'Call any REST endpoint via MCP.' },
                  { name: 'Summarisation', desc: 'Condense long documents or threads.' },
                  { name: 'Translation', desc: 'Multi-language output support.' },
                ].map(s => (
                  <div key={s.name} style={{
                    background: '#0D0D0D', border: '0.5px solid #1E1E1E',
                    borderRadius: '10px', padding: '1rem',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8', marginBottom: '4px' }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: '#666666', lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              <H2>Custom skill builder</H2>
              <P>
                For skills that don't exist in the library, write them yourself in plain language. Define:
              </P>
              <CodeBlock title="Custom Skill Example">{`Name: Due Diligence Report

Instructions:
When asked to perform due diligence on a company or deal,
collect all available context from the conversation, then:
1. Summarise the entity and its background
2. Identify key risks: legal, financial, reputational
3. List open questions that require further investigation
4. Output a structured report with sections and severity ratings

Trigger phrases: due diligence, DD report, risk assessment`}</CodeBlock>
              <P>
                Once saved, the agent learns this skill and will invoke it whenever the trigger context matches.
              </P>

              <H2>Domain locking</H2>
              <P>
                Skills are scoped to their agent's domain. A skill defined on a Legal agent cannot be invoked by an HR agent. This boundary-checking happens at the execution layer, ensuring responses stay accurate and never bleed across agent contexts.
              </P>
            </Section>

            {/* ── MCP ──────────────────────────────────────────────────── */}
            <Section id="mcp">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Extensibility</Tag></div>
              <H1>MCP Servers</H1>
              <P>
                Model Context Protocol (MCP) lets your agents reach outside their context window and interact with external tools, services, and APIs. An MCP server exposes a set of callable tools that your agent can invoke during a conversation.
              </P>

              <H2>Supported transports</H2>
              <Table
                headers={['Transport', 'Use case', 'Example']}
                rows={[
                  ['stdio', 'Run a local process. Used for CLI tools and Node/Python packages.', 'npx @notionhq/notion-mcp-server'],
                  ['http', 'Connect to a remote HTTP endpoint. Used for hosted MCP services.', 'https://mcp.example.com/api'],
                ]}
              />

              <H2>Allowlisted commands (stdio)</H2>
              <P>For security, only the following runtimes are permitted for stdio MCP servers:</P>
              <CodeBlock>{`npx    — Node.js packages via npm exec
node   — Direct Node.js scripts
python3 / python — Python scripts
uvx    — Python tools via uv`}</CodeBlock>

              <H2>Pre-configured integrations</H2>
              <Table
                headers={['Service', 'Transport', 'What it enables']}
                rows={[
                  ['Notion', 'HTTP', 'Read and write Notion pages, databases, and blocks.'],
                  ['Google Calendar', 'HTTP', 'Create events, check availability, send invites.'],
                  ['GitHub', 'stdio (npx)', 'Search repos, read files, open issues and PRs.'],
                  ['Filesystem', 'stdio (node)', 'Read and write files on the agent\'s EFS volume.'],
                ]}
              />

              <H2>Adding a custom MCP server</H2>
              <P>From the agent's <strong style={{ color: '#F0EEE8' }}>MCP Servers</strong> tab:</P>
              <CodeBlock title="stdio example">{`Transport: stdio
Command:   npx
Args:      ["-y", "@notionhq/notion-mcp-server"]
Env:       { "OPENAI_API_KEY": "sk-..." }`}</CodeBlock>
              <CodeBlock title="http example">{`Transport: http
URL:       https://your-mcp-server.com/sse
Headers:   { "Authorization": "Bearer your-token" }`}</CodeBlock>

              <Callout type="info">
                After adding or removing an MCP server, the agent container automatically relaunches with the new configuration. Downtime is typically under 30 seconds.
              </Callout>

              <H2>How MCP works at runtime</H2>
              <P>
                When your agent receives a message, it evaluates whether any registered MCP tools are relevant to the request. If so, it calls those tools in a loop, collects their outputs, and incorporates the results into its response before replying to the user. The entire tool loop is transparent — the user just gets the final answer.
              </P>
            </Section>

            {/* ── INTEGRATIONS ─────────────────────────────────────────── */}
            <Section id="integrations">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Messaging</Tag></div>
              <H1>Integrations</H1>
              <P>
                Your agents live where your team already is. OpenClaw supports three messaging platforms. Each is configured separately and can be added to any agent at any time from the <strong style={{ color: '#F0EEE8' }}>Channels</strong> tab.
              </P>

              {/* Telegram */}
              <div style={{
                border: '0.5px solid #1E1E1E', borderRadius: '14px',
                overflow: 'hidden', margin: '2rem 0',
              }}>
                <div style={{
                  background: '#0D1822', padding: '1.25rem 1.5rem',
                  borderBottom: '0.5px solid #1E1E1E',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <img src="/images/telegram.png" alt="Telegram" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>Telegram</div>
                    <div style={{ fontSize: '11px', color: '#6AB3F3' }}>Webhook-based · Instant delivery</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}><Tag color="#2AABEE">Recommended</Tag></div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <H3>Setup</H3>
                  <P>Create a bot via <Code>@BotFather</Code> on Telegram and copy the bot token.</P>
                  <CodeBlock title="BotFather commands">{`/newbot
→ Choose a name and username
→ Copy the token: 7891234567:AAF...

Paste this token into OpenClaw when creating your agent.`}</CodeBlock>
                  <H3>Commands</H3>
                  <P>Send any of these in your Telegram chat with the bot:</P>
                  <Table
                    headers={['Command', 'Description']}
                    rows={[
                      ['/summary', 'Get a structured summary report from your agent.'],
                      ['/report', 'Request a detailed report (delivered as PDF if the message includes "as pdf").'],
                      ['/alert', 'Ask the agent to surface any active alerts or flagged items.'],
                      ['/status', 'Check the agent\'s current operational status.'],
                      ['Any message', 'Free-form conversation in the agent\'s domain.'],
                    ]}
                  />
                  <H3>PDF delivery</H3>
                  <P>Add "as PDF", "create document", or "export report" to any message and the agent will generate a formatted PDF and deliver it directly in the chat.</P>
                </div>
              </div>

              {/* Discord */}
              <div style={{
                border: '0.5px solid #1E1E1E', borderRadius: '14px',
                overflow: 'hidden', margin: '2rem 0',
              }}>
                <div style={{
                  background: '#1A1B2E', padding: '1.25rem 1.5rem',
                  borderBottom: '0.5px solid #1E1E1E',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <img src="/images/discord.png" alt="Discord" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>Discord</div>
                    <div style={{ fontSize: '11px', color: '#7289DA' }}>Bot gateway · Server channels</div>
                  </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <H3>Setup</H3>
                  <P>
                    Create a bot application at <Code>discord.com/developers</Code>. Under <strong style={{ color: '#F0EEE8' }}>Bot</strong>, enable <Code>Message Content Intent</Code> and copy the bot token. Invite the bot to your server with the <Code>bot</Code> scope and <Code>Send Messages</Code> permission.
                  </P>
                  <Callout type="warning">
                    <strong>Message Content Intent</strong> must be enabled in the Discord Developer Portal for your bot to read messages. Without it, your agent will not receive any input.
                  </Callout>
                </div>
              </div>

              {/* WhatsApp */}
              <div style={{
                border: '0.5px solid #1E1E1E', borderRadius: '14px',
                overflow: 'hidden', margin: '2rem 0',
              }}>
                <div style={{
                  background: '#0D1A14', padding: '1.25rem 1.5rem',
                  borderBottom: '0.5px solid #1E1E1E',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <img src="/images/whatsapp.png" alt="WhatsApp" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEE8' }}>WhatsApp</div>
                    <div style={{ fontSize: '11px', color: '#25D366' }}>QR link · Baileys protocol</div>
                  </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <H3>Setup</H3>
                  <P>
                    WhatsApp uses a QR-based linking flow. From the <strong style={{ color: '#F0EEE8' }}>Channels</strong> tab, click <strong style={{ color: '#F0EEE8' }}>Link WhatsApp</strong>. A QR code appears in the dashboard. Open WhatsApp on your phone → <strong style={{ color: '#F0EEE8' }}>Linked Devices</strong> → <strong style={{ color: '#F0EEE8' }}>Link a Device</strong> → scan.
                  </P>
                  <Callout type="warning">
                    WhatsApp linking uses a dedicated temporary ECS task to generate the QR. The QR expires after a few minutes. If it expires, refresh and re-scan. Keep your linked phone connected to the internet for the session to remain active.
                  </Callout>
                </div>
              </div>

              <H2>Multi-channel agents</H2>
              <P>
                One agent can be connected to multiple platforms simultaneously. For example, your Legal agent can serve your team on Telegram and also receive queries from a Discord server. Each channel maintains its own independent conversation context per chat ID.
              </P>
            </Section>

            {/* ── BYOK ─────────────────────────────────────────────────── */}
            <Section id="byok">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Bring Your Own Key</Tag></div>
              <H1>BYOK</H1>
              <P>
                BYOK (Bring Your Own Key) means you connect your own AI provider API key to your OpenClaw agents. Your agents use your key directly — no markup, no token limits imposed by OpenClaw. You pay your AI provider at their standard rates.
              </P>

              <H2>Why BYOK?</H2>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '10px', margin: '1.25rem 0',
              }}>
                {[
                  { title: 'Cost control', desc: 'Pay your AI provider directly. No per-token markup from OpenClaw.' },
                  { title: 'No limits', desc: 'Your usage limits are defined by your provider plan, not by us.' },
                  { title: 'Model choice', desc: 'Use the model your provider offers — GPT-4o, Claude, Gemini, and others.' },
                  { title: 'Data privacy', desc: 'Your API key goes directly to your provider. We never proxy your data.' },
                ].map(c => (
                  <div key={c.title} style={{
                    background: '#111111', border: '0.5px solid rgba(255,77,0,0.12)',
                    borderRadius: '10px', padding: '1rem',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0EEE8', marginBottom: '4px' }}>{c.title}</div>
                    <div style={{ fontSize: '12px', color: '#777777', lineHeight: 1.6 }}>{c.desc}</div>
                  </div>
                ))}
              </div>

              <H2>Supported AI providers</H2>
              <P>OpenClaw agents are currently powered by <strong style={{ color: '#F0EEE8' }}>Google Gemini 2.5 Flash</strong> — optimised for real-time, high-throughput responses with a large context window. Support for additional providers (OpenAI, Anthropic) is on the roadmap.</P>

              <H2>Configuring your key</H2>
              <P>
                Add your API key during agent creation or from <strong style={{ color: '#F0EEE8' }}>Settings → API Keys</strong>. The key is encrypted at rest and injected into your agent's environment at runtime. It is never logged or exposed in the dashboard.
              </P>

              <Callout type="tip">
                Create a dedicated API key for OpenClaw in your provider dashboard. This lets you track usage separately, set spending limits, and revoke access without affecting other integrations.
              </Callout>
            </Section>

            {/* ── MEMORY ───────────────────────────────────────────────── */}
            <Section id="memory">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Context</Tag></div>
              <H1>Memory & Context</H1>
              <P>
                Every agent maintains a conversation history per chat session. When you send a message, your agent has full access to the last 20 exchanges — giving it the context to give coherent, relevant responses without you repeating yourself.
              </P>

              <H2>How sessions work</H2>
              <P>
                A session is scoped to a <Code>chatId</Code> — the unique identifier of a conversation thread on the messaging platform. Telegram private chats, group chats, Discord channels, and WhatsApp conversations each get their own independent session. Sessions are persistent across agent restarts.
              </P>

              <H2>Memory limits</H2>
              <Table
                headers={['Metric', 'Value']}
                rows={[
                  ['Messages kept per session', 'Last 20 messages (10 exchanges)'],
                  ['History storage', 'PostgreSQL, scoped per agent + chatId'],
                  ['Session persistence', 'Survives agent restarts and container relaunches'],
                  ['Token estimation', 'Visible in Dashboard → Agent → Memory tab'],
                ]}
              />

              <H2>Clearing memory</H2>
              <P>
                From the agent's <strong style={{ color: '#F0EEE8' }}>Memory</strong> tab in the dashboard, you can view all active sessions with message counts and estimated token usage. You can clear all history for the agent with one click — this wipes all sessions and the agent starts fresh on the next message.
              </P>
              <Callout type="warning">
                Clearing memory is irreversible. All conversation history across all sessions for that agent will be permanently deleted.
              </Callout>
            </Section>

            {/* ── DOCUMENTS ────────────────────────────────────────────── */}
            <Section id="documents">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Output</Tag></div>
              <H1>PDF Documents</H1>
              <P>
                Any agent can generate a professionally formatted PDF and deliver it directly in your chat. No third-party tools, no browser — just ask.
              </P>

              <H2>Triggering a document</H2>
              <P>Include any of these phrases in your message and your agent will respond with a PDF:</P>
              <CodeBlock>{`"create a document..."
"as a PDF"
"export this report"
"generate a report"
"send me a PDF"
"write a memo on..."
"draft a document for..."
"I need a report on..."`}</CodeBlock>

              <H2>What the PDF contains</H2>
              <P>
                The agent extracts the content request from your message, generates a structured response optimised for document format, and renders it as a PDF with:
              </P>
              <Table
                headers={['Element', 'Description']}
                rows={[
                  ['Title', 'Extracted from the content request.'],
                  ['Author', 'Set to the agent\'s domain (e.g. "Legal Agent").'],
                  ['Sections', 'Parsed from Markdown headings (## and ###).'],
                  ['Body text', 'Formatted with proper line spacing and wrapping.'],
                  ['Bold text', 'Rendered from **bold** Markdown syntax.'],
                  ['Lists', 'Bullet points from Markdown - syntax.'],
                  ['Multi-page', 'Automatic page breaks for long documents.'],
                  ['Footer', 'Agent type label on each page.'],
                ]}
              />

              <H2>Delivery</H2>
              <P>
                The PDF is delivered as a file attachment directly in the chat. On Telegram, it appears as a document you can save or forward. On Discord and WhatsApp, it appears as a downloadable file attachment.
              </P>

              <Callout type="tip">
                For the best PDF output, be specific in your request. Instead of "give me a report", try "create a due diligence report on Acme Corp covering legal risks, open liabilities, and recommended next steps as a PDF."
              </Callout>
            </Section>

            {/* ── DASHBOARD ────────────────────────────────────────────── */}
            <Section id="dashboard">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Platform</Tag></div>
              <H1>Dashboard</H1>
              <P>
                The OpenClaw dashboard is your control plane. Everything about your agents — configuration, channels, skills, memory, logs, and billing — lives here.
              </P>

              <H2>Overview</H2>
              <P>
                The main overview screen shows all your deployed agents with their current status, domain, and connected platforms. From here you can start, stop, or delete any agent, and create new ones.
              </P>

              <H2>Agent detail tabs</H2>
              <Table
                headers={['Tab', 'What you can do']}
                rows={[
                  ['Overview', 'View agent info, start/stop the container, see the system prompt.'],
                  ['Channels', 'Add, configure, or remove messaging platform connections.'],
                  ['Skills', 'View auto-generated skills, import from library, or build custom skills.'],
                  ['MCP Servers', 'Add, enable/disable, or remove Model Context Protocol servers.'],
                  ['Memory', 'View session stats, estimated token usage, and clear chat history.'],
                  ['Activity Log', 'Full timestamped event history: starts, stops, errors, restarts, channel events.'],
                ]}
              />

              <H2>Settings</H2>
              <P>
                Under <strong style={{ color: '#F0EEE8' }}>Settings</strong> you can update your profile, change your password, manage API keys, and delete your account.
              </P>

              <H2>Billing</H2>
              <P>
                Under <strong style={{ color: '#F0EEE8' }}>Settings → Billing</strong> you can view your current plan, manage payment methods, update your card, and cancel or resume your subscription. Billing is handled by Stripe — your card details are never stored on OpenClaw servers.
              </P>
            </Section>

            {/* ── PRICING ──────────────────────────────────────────────── */}
            <Section id="pricing">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Pricing</Tag></div>
              <H1>Pricing</H1>
              <P>
                OpenClaw charges per agent per month. No flat platform fee. You only pay for the agents you have running — scale up or down at any time.
              </P>

              <Callout type="tip">
                Every plan includes a <strong>15-day free trial on your first agent</strong>. No credit card required to start.
              </Callout>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px', margin: '2rem 0',
              }}>
                {[
                  {
                    name: 'Tier A',
                    price: '$20',
                    unit: '/ agent / mo',
                    agents: 'Up to 5 agents',
                    highlight: false,
                    features: ['BYOK support', 'Telegram, Discord & WhatsApp', 'Unlimited commands', 'PDF delivery', 'Activity log (30 days)'],
                  },
                  {
                    name: 'Tier B',
                    price: '$18',
                    unit: '/ agent / mo',
                    agents: 'Up to 10 agents',
                    highlight: true,
                    features: ['Everything in Tier A', 'Better rate per agent', 'Activity log (90 days)', 'Priority support'],
                  },
                  {
                    name: 'Tier C',
                    price: '$15',
                    unit: '/ agent / mo',
                    agents: 'Up to 15 agents',
                    highlight: false,
                    features: ['Everything in Tier B', 'Best rate per agent', 'Unlimited activity log', 'Dedicated support', '99.9% uptime SLA'],
                  },
                ].map(t => (
                  <div key={t.name} style={{
                    background: t.highlight ? '#131313' : '#111111',
                    border: t.highlight ? '1px solid rgba(255,77,0,0.3)' : '0.5px solid #1E1E1E',
                    borderRadius: '14px', padding: '1.5rem',
                    position: 'relative',
                    boxShadow: t.highlight ? '0 0 40px rgba(255,77,0,0.06)' : 'none',
                  }}>
                    {t.highlight && (
                      <div style={{
                        position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                        background: '#FF4D00', color: '#fff', fontSize: '10px', fontWeight: 600,
                        padding: '3px 12px', borderRadius: '100px', letterSpacing: '0.08em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>
                        Best Value
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: t.highlight ? '#FF4D00' : '#888888', fontWeight: 500, marginBottom: '8px' }}>{t.name}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.04em', color: '#F0EEE8', lineHeight: 1 }}>{t.price}</div>
                    <div style={{ fontSize: '11px', color: '#666666', marginBottom: '4px' }}>{t.unit}</div>
                    <div style={{ fontSize: '12px', color: '#999999', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid #1E1E1E' }}>{t.agents}</div>
                    {t.features.map(f => (
                      <div key={f} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '7px' }}>
                        <span style={{ color: '#FF4D00', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>✓</span>
                        <span style={{ fontSize: '12px', color: '#888888', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <H2>How billing works</H2>
              <Table
                headers={['Item', 'Detail']}
                rows={[
                  ['Billing cycle', 'Monthly. Charged on the same day each month.'],
                  ['Per-agent pricing', 'Each active agent is billed at the tier rate. Paused agents are not billed.'],
                  ['Free trial', '15 days free on the first agent. No credit card required.'],
                  ['Cancellation', 'Cancel anytime from Settings → Billing. Agents run until end of period.'],
                  ['Payment processor', 'Stripe. Card details are never stored on OpenClaw servers.'],
                  ['BYOK costs', 'Your AI API usage is billed directly by your provider — separate from OpenClaw.'],
                ]}
              />
            </Section>

            {/* ── SECURITY ─────────────────────────────────────────────── */}
            <Section id="security">
              <div style={{ marginBottom: '1.5rem' }}><Tag>Security</Tag></div>
              <H1>Security</H1>

              <H2>Container isolation</H2>
              <P>
                Every agent runs in its own dedicated AWS ECS Fargate container. Your agent's data, credentials, and conversation history never share memory or storage with any other user's agent. Container boundaries are enforced at the infrastructure level.
              </P>

              <H2>Data storage</H2>
              <Table
                headers={['Data type', 'Storage', 'Encryption']}
                rows={[
                  ['User accounts & profiles', 'PostgreSQL (RDS)', 'TLS in transit, AES-256 at rest'],
                  ['Agent configuration', 'PostgreSQL (RDS)', 'TLS in transit, AES-256 at rest'],
                  ['Conversation history', 'PostgreSQL (RDS)', 'TLS in transit, AES-256 at rest'],
                  ['WhatsApp credentials', 'EFS (per-agent volume)', 'Mounted exclusively to agent container'],
                  ['Bot tokens', 'PostgreSQL (encrypted field)', 'Never exposed in API responses'],
                  ['API keys (BYOK)', 'Environment variable injection', 'Never logged or stored in plaintext'],
                  ['Payment info', 'Stripe (external)', 'PCI DSS compliant — not stored on OpenClaw'],
                ]}
              />

              <H2>Traffic security</H2>
              <P>All traffic between clients, the Next.js server, and external services uses HTTPS/TLS. Telegram webhooks are validated using a per-agent secret token. Internal service-to-service calls (ECS to Next.js) use a <Code>GATEWAY_TOKEN</Code> shared secret.</P>

              <H2>Domain boundary enforcement</H2>
              <P>
                Agent system prompts include a hard-coded boundary preamble that cannot be overridden by user messages. This prevents agents from being repurposed outside their declared domain and blocks prompt injection attempts at the model instruction level.
              </P>

              <H2>Data deletion</H2>
              <P>
                You can delete your account and all associated data at any time from <strong style={{ color: '#F0EEE8' }}>Settings → Account</strong>. This removes your profile, all agents, all conversation history, and all billing records from our systems within 30 days.
              </P>

              <H2>Admin kill-switch</H2>
              <P>
                OpenClaw has a global service kill-switch accessible to platform administrators. When enabled, all agent message processing stops immediately — no tokens are consumed and no responses are sent. This is used only in exceptional operational circumstances.
              </P>
            </Section>

            {/* ── FAQ ──────────────────────────────────────────────────── */}
            <Section id="faq">
              <div style={{ marginBottom: '1.5rem' }}><Tag>FAQ</Tag></div>
              <H1>Frequently Asked Questions</H1>

              {[
                {
                  q: 'Can I build an agent for any industry?',
                  a: 'Yes. OpenClaw is not limited to preset domains. You write the system prompt, define the domain, and build custom skills for your exact workflows. Legal, healthcare, real estate, logistics, education, HR — if you can describe the work, your agent can handle it.',
                },
                {
                  q: 'What AI model do the agents use?',
                  a: 'Agents are powered by Google Gemini 2.5 Flash — optimised for fast, real-time responses with a large context window. With BYOK, you connect your own Google AI API key and your agents use it directly.',
                },
                {
                  q: 'Can one agent be on multiple platforms at the same time?',
                  a: 'Yes. A single agent can be connected to Telegram, Discord, and WhatsApp simultaneously. Each platform connection is a separate channel. Each platform maintains its own independent conversation history per chat.',
                },
                {
                  q: 'What happens if my agent goes down?',
                  a: 'OpenClaw monitors all containers continuously. If a container stops unexpectedly, it is automatically restarted. You can also manually restart from the dashboard. Unexpected stops are logged in the activity timeline.',
                },
                {
                  q: 'Is conversation history stored permanently?',
                  a: 'Conversation history is stored in your dedicated database slot and scoped to your agent and chat ID. You can view, estimate token usage, and clear history at any time from the Memory tab. Clearing is permanent.',
                },
                {
                  q: 'Does OpenClaw see my API key?',
                  a: 'Your BYOK key is injected directly into your agent\'s container environment at launch. It is never logged, never returned by the API, and never visible in the dashboard after initial entry. It is used exclusively to make AI calls on your behalf.',
                },
                {
                  q: 'Can I add multiple MCP servers to one agent?',
                  a: 'Yes. An agent can have multiple MCP servers active at the same time. Each server exposes its own set of tools. The agent selects relevant tools automatically at runtime based on the user\'s message.',
                },
                {
                  q: 'How do I cancel my subscription?',
                  a: 'Cancel from Settings → Billing with one click. No calls, no forms. Your agents continue running until the end of the billing period, then they stop. You can reactivate at any time.',
                },
                {
                  q: 'What is the 15-day free trial?',
                  a: 'Every new account gets 15 days free on the first agent — no credit card required. After 15 days, you\'ll be prompted to subscribe to keep the agent running. Additional agents require a subscription from day one.',
                },
                {
                  q: 'What is the uptime SLA?',
                  a: 'Tier C includes a 99.9% uptime SLA. OpenClaw monitors all containers and the platform infrastructure 24/7. Scheduled maintenance is communicated in advance.',
                },
              ].map((item, i) => (
                <div key={i} style={{
                  borderBottom: '0.5px solid #181818', padding: '1.25rem 0',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#F0EEE8', marginBottom: '0.5rem' }}>
                    {item.q}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888888', lineHeight: 1.8 }}>
                    {item.a}
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: '3rem', padding: '2rem',
                background: 'rgba(255,77,0,0.04)', border: '0.5px solid rgba(255,77,0,0.15)',
                borderRadius: '14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#F0EEE8', marginBottom: '0.5rem' }}>
                  Still have questions?
                </div>
                <div style={{ fontSize: '13px', color: '#888888', marginBottom: '1.25rem' }}>
                  Reach out and we'll get back to you.
                </div>
                <button
                  onClick={() => window.location.href = 'mailto:support@sltverse.com'}
                  style={{
                    background: '#FF4D00', color: '#fff', border: 'none',
                    padding: '10px 24px', borderRadius: '9px', fontSize: '13px',
                    fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Contact Support
                </button>
              </div>
            </Section>

          </main>
        </div>
      </div>

      <style>{`
        @media(max-width: 860px) {
          .doc-main {
            margin-left: 0 !important;
            padding: 2rem 1.25rem 5rem !important;
          }
        }
      `}</style>
    </>
  )
}
