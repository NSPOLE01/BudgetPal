const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

function Card({ label, amount, large, delay }) {
  return (
    <div style={{
      padding: '28px 32px 32px',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      flex: 1,
      minWidth: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: large ? 10 : 16 }}>
        {label}
      </p>
      <p style={{
        fontFamily: 'var(--font-head)',
        fontSize: large ? 52 : 44,
        fontWeight: 700,
        color: 'var(--text)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        {fmt(amount)}
      </p>
    </div>
  )
}

export default function SpendSummary({ summary }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
      <Card label="Today's Spend" amount={summary?.today} large delay={0} />
      <Card label="This Week" amount={summary?.week} delay={60} />
      <Card label="This Month" amount={summary?.month} delay={120} />
    </div>
  )
}
