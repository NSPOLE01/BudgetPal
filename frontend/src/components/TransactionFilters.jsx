import { useEffect, useState } from 'react'
import { getAccounts } from '../lib/api.js'

const getMonthRange = () => {
  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

const inputStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border-2)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  padding: '7px 10px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
}

const labelStyle = {
  fontSize: 10,
  color: 'var(--text-3)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 6,
  display: 'block',
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

function AmountRangeSlider({ minVal, maxVal, maxAmount, onChange }) {
  const lo = minVal === '' ? 0 : Number(minVal)
  const hi = maxVal === '' ? maxAmount : Number(maxVal)
  const loPercent = maxAmount > 0 ? (lo / maxAmount) * 100 : 0
  const hiPercent = maxAmount > 0 ? (hi / maxAmount) * 100 : 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={labelStyle}>Amount</span>
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-body)', letterSpacing: 0 }}>
          ${lo.toLocaleString()} – {hi >= maxAmount ? '∞' : `$${hi.toLocaleString()}`}
        </span>
      </div>
      <div className="range-slider" style={{ position: 'relative', height: 20, width: '100%' }}>
        {/* Base track */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          width: '100%', height: 4, borderRadius: 2, background: 'var(--bg-3)',
          pointerEvents: 'none',
        }} />
        {/* Active track */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: `${loPercent}%`, width: `${hiPercent - loPercent}%`,
          height: 4, borderRadius: 2, background: 'var(--accent)',
          pointerEvents: 'none',
        }} />
        {/* Min thumb — boost z-index when near the max end so it stays draggable */}
        <input
          type="range" min={0} max={maxAmount} step={1}
          value={lo}
          style={{ zIndex: lo >= hi - maxAmount * 0.05 ? 5 : 3 }}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - 1)
            onChange({ min: v === 0 ? '' : String(v), max: maxVal })
          }}
        />
        {/* Max thumb */}
        <input
          type="range" min={0} max={maxAmount} step={1}
          value={hi}
          style={{ zIndex: 4 }}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + 1)
            onChange({ min: minVal, max: v >= maxAmount ? '' : String(v) })
          }}
        />
      </div>
    </div>
  )
}

export default function TransactionFilters({ filters, onChange, maxAmount = 500 }) {
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {})
  }, [])

  const set = (key, value) => onChange({ ...filters, [key]: value })
  const hasFilters = filters.account_id || filters.start || filters.end || filters.min_amount || filters.max_amount

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      padding: '16px 20px',
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      marginBottom: 16,
    }}>

      {/* Card filter */}
      <FilterGroup label="Card">
        <select
          value={filters.account_id || ''}
          onChange={(e) => set('account_id', e.target.value)}
          style={{ ...inputStyle, width: 200 }}
        >
          <option value="">All cards</option>
          {accounts.map((a) => (
            <option key={a.plaid_account_id} value={a.plaid_account_id}>
              {a.institution_name} {a.mask ? `••${a.mask}` : a.name}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Date range */}
      <FilterGroup label="From">
        <input
          type="date"
          value={filters.start || ''}
          onChange={(e) => set('start', e.target.value)}
          style={{ ...inputStyle, width: 148 }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
        />
      </FilterGroup>

      <FilterGroup label="To">
        <input
          type="date"
          value={filters.end || ''}
          onChange={(e) => set('end', e.target.value)}
          style={{ ...inputStyle, width: 148 }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
        />
      </FilterGroup>

      {/* Amount range slider */}
      <AmountRangeSlider
        minVal={filters.min_amount}
        maxVal={filters.max_amount}
        maxAmount={maxAmount}
        onChange={({ min, max }) => onChange({ ...filters, min_amount: min, max_amount: max })}
      />

      {/* This Month quick filter */}
      <button
        onClick={() => onChange({ ...filters, ...getMonthRange() })}
        style={{
          alignSelf: 'flex-end',
          padding: '7px 14px',
          background: filters.start === getMonthRange().start && filters.end === getMonthRange().end
            ? 'var(--accent)'
            : 'none',
          border: `1px solid ${filters.start === getMonthRange().start && filters.end === getMonthRange().end ? 'var(--accent)' : 'var(--border-2)'}`,
          borderRadius: 8,
          color: filters.start === getMonthRange().start && filters.end === getMonthRange().end
            ? '#fff'
            : 'var(--text-2)',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        This Month
      </button>

      {/* Clear button — only shown when a filter is active */}
      {hasFilters && (
        <button
          onClick={() => onChange({ account_id: '', start: '', end: '', min_amount: '', max_amount: '' })}
          style={{
            alignSelf: 'flex-end',
            padding: '7px 14px',
            background: 'none',
            border: '1px solid var(--border-2)',
            borderRadius: 8,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
