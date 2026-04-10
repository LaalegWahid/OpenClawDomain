export default function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: '11px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#8a7060',
      marginBottom: '1rem',
      fontWeight: 500,
      fontFamily: 'var(--mono)',
    }}>
      {text}
    </p>
  )
}
