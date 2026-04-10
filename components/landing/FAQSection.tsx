import SectionLabel from './ui/SectionLabel'
import FAQAccordion from './ui/FAQAccordion'

const faqItems = [
  {
    q: 'Do you store my API key?',
    a: 'No. OpenClaw is fully BYOK (Bring Your Own Key). You paste your API key once during setup and it is encrypted and stored only in your isolated environment. We never read it, log it, or use it for anything other than running your agents.',
  },
  {
    q: 'What exactly am I paying for?',
    a: 'You pay a flat hosting fee per agent per month. That covers the container, uptime monitoring, automatic restarts, and platform connectivity. We charge nothing on top of your AI usage. Those costs go directly to your API provider.',
  },
  {
    q: 'Do you log my conversations?',
    a: 'No conversation logs are recorded on our side. What happens between your agent and your team stays in your messaging platform. OpenClaw only tracks infrastructure-level events like container health and restart counts.',
  },
  {
    q: 'Do I need a developer to set this up?',
    a: 'Not at all. OpenClaw is built for non-technical users. You fill in a form, paste a bot token, and your agent is live. No terminal, no config files, no Docker knowledge required.',
  },
  {
    q: 'How does pricing scale?',
    a: 'Every tier includes the exact same features. The only difference is the number of agents you can run and the per-agent rate. The more agents you deploy, the lower your cost per agent. You can upgrade or downgrade at any time.',
  },
  {
    q: 'Which messaging platforms are supported?',
    a: 'Telegram, Discord, and WhatsApp. Each agent runs as a dedicated bot on your chosen platform. You can have agents across different platforms under the same account.',
  },
  {
    q: 'Can I customize what my agent does?',
    a: 'Yes. You write a plain-language system prompt that defines your agent\'s personality, tone, and behavior. A domain boundary is applied automatically so the agent stays focused and never drifts outside its field.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes, always. Cancel from your Settings page with one click, no calls required. Your agents keep running until the end of your billing period.',
  },
]

export default function FAQSection() {
  return (
    <section id="faq" style={{ padding: '6rem 1.75rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <SectionLabel text="FAQ" />
          <h2 className="oc-section-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 600, letterSpacing: '-0.04em' }}>
            Common <em>questions.</em>
          </h2>
        </div>
        <FAQAccordion items={faqItems} />
      </div>
    </section>
  )
}
