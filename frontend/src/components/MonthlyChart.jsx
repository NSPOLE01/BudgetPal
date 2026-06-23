import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtMonth = (key) => {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, total } = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-3)',
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontFamily: 'var(--font-body)',
    }}>
      <p style={{ color: 'var(--text-2)', fontSize: 11, marginBottom: 4 }}>{fmtMonth(month)}</p>
      <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>{fmt(total)}</p>
    </div>
  )
}

function filterByTimeframe(data, timeframe) {
  if (!data?.length || timeframe === 'All') return data
  const now = new Date()
  let cutoff
  if (timeframe === '1M') {
    cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1)
  } else if (timeframe === '6M') {
    cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 6)
  } else if (timeframe === '1Y') {
    cutoff = new Date(now); cutoff.setFullYear(now.getFullYear() - 1)
  }
  const cutoffStr = cutoff.toISOString().slice(0, 7) // 'YYYY-MM'
  return data.filter((d) => d.month >= cutoffStr)
}

export default function MonthlyChart({ data, timeframe = '1Y' }) {
  const filtered = filterByTimeframe(data, timeframe)

  if (!filtered?.length) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No data yet</p>
    </div>
  )

  const chartData = filtered.map((d) => ({ ...d, label: fmtMonth(d.month) }))

  return (
    <div style={{ animation: 'fadeUp 0.4s ease 0.2s both' }}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="monthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#6c63ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--font-body)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--font-body)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#6c63ff"
            strokeWidth={2}
            fill="url(#monthGradient)"
            dot={{ r: 3, fill: '#6c63ff', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#8b84ff', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
