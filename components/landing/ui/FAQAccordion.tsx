'use client'

import { useState } from 'react'

interface FAQItem { q: string; a: string }

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((item, i) => (
        <div key={i} className="oc-faq-item" style={{
          background: open === i ? '#f0e8de' : 'transparent',
          border: `0.5px solid ${open === i ? 'rgba(42,31,25,0.2)' : 'rgba(42,31,25,0.1)'}`,
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
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#2a1f19', lineHeight: 1.5 }}>
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
            <div style={{ padding: '0 1.25rem 1.1rem', fontSize: '13px', color: '#8a7060', lineHeight: 1.8 }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
