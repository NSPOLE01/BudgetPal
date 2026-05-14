import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#6c63ff', '#8b84ff', '#a9a4ff', '#c4c1ff', '#d4d2ff', '#e2e1ff', '#eeeeff']

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { category, amount } = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-3)',
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontFamily: 'var(--font-body)',
    }}>
      <p style={{ color: 'var(--text-2)', fontSize: 11, marginBottom: 4 }}>{category}</p>
      <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>{fmt(amount)}</p>
    </div>
  )
}

export default function CategoryChart({ data }) {
  if (!data?.length) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No category data yet</p>
    </div>
  )

  const chartData = data.slice(0, 7).map((d) => ({
    ...d,
    category: d.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }))

  return (
    <div style={{ animation: 'fadeUp 0.4s ease 0.2s both' }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="category"
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--font-body)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--font-body)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
