const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function MerchantIcon({ name }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  const hue = [...(name || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      background: `hsl(${hue}, 30%, 20%)`,
      border: `1px solid hsl(${hue}, 30%, 30%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 600,
      color: `hsl(${hue}, 60%, 70%)`,
      flexShrink: 0,
      fontFamily: 'var(--font-head)',
    }}>
      {initials}
    </div>
  )
}

function CategoryBadge({ category }) {
  if (!category) return null
  const label = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span style={{
      fontSize: 10,
      padding: '3px 8px',
      borderRadius: 20,
      background: 'var(--bg-3)',
      border: '1px solid var(--border)',
      color: 'var(--text-2)',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export default function TransactionList({ transactions }) {
  if (!transactions?.length) return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No transactions to show</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {transactions.map((tx, i) => (
        <div
          key={tx.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'transparent',
            transition: 'background 0.12s',
            animation: `fadeUp 0.3s ease both`,
            animationDelay: `${Math.min(i * 30, 300)}ms`,
            cursor: 'default',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <MerchantIcon name={tx.merchant_name || tx.name} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tx.merchant_name || tx.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{tx.name}</p>
          </div>

          <CategoryBadge category={tx.category} />

          <p style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 48, textAlign: 'right' }}>
            {fmtDate(tx.date)}
          </p>

          <p style={{
            fontFamily: 'var(--font-head)',
            fontSize: 15,
            fontWeight: 600,
            color: tx.amount > 0 ? 'var(--red)' : 'var(--green)',
            minWidth: 72,
            textAlign: 'right',
          }}>
            {tx.amount > 0 ? '-' : '+'}{fmt(tx.amount)}
          </p>
        </div>
      ))}
    </div>
  )
}
