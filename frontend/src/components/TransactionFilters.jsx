import { useEffect, useState } from 'react'
import { getAccounts } from '../lib/api.js'

const CATEGORIES = [
  'FOOD_AND_DRINK', 'SHOPS', 'TRANSPORTATION', 'TRAVEL', 'ENTERTAINMENT',
  'HEALTH_FITNESS', 'PERSONAL_CARE', 'GENERAL_MERCHANDISE', 'HOME_IMPROVEMENT',
  'UTILITIES', 'SUBSCRIPTION', 'LOAN_PAYMENTS', 'RENT_AND_UTILITIES', 'OTHER',
]

const fmtLabel = (cat) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

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


export default function TransactionFilters({ filters, onChange }) {
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {})
  }, [])

  const set = (key, value) => onChange({ ...filters, [key]: value })
  const hasFilters = filters.account_id || filters.category || filters.start || filters.end || filters.min_amount || filters.max_amount

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      alignItems: 'flex-end',
      flexWrap: 'nowrap',
      padding: '12px 16px',
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
          style={{ ...inputStyle, width: 136 }}
        >
          <option value="">All cards</option>
          {accounts.map((a) => (
            <option key={a.plaid_account_id} value={a.plaid_account_id}>
              {a.institution_name}{a.mask ? ` ••${a.mask}` : a.name && a.name !== a.institution_name ? ` ${a.name}` : ''}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Category filter */}
      <FilterGroup label="Category">
        <select
          value={filters.category || ''}
          onChange={(e) => set('category', e.target.value)}
          style={{ ...inputStyle, width: 148 }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{fmtLabel(c)}</option>
          ))}
        </select>
      </FilterGroup>

      {/* Date range */}
      <FilterGroup label="From">
        <input
          type="date"
          value={filters.start || ''}
          onChange={(e) => set('start', e.target.value)}
          style={{ ...inputStyle, width: 116 }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
        />
      </FilterGroup>

      <FilterGroup label="To">
        <input
          type="date"
          value={filters.end || ''}
          onChange={(e) => set('end', e.target.value)}
          style={{ ...inputStyle, width: 116 }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
        />
      </FilterGroup>

      {/* Amount range */}
      <FilterGroup label="Min $">
        <input
          type="number" min="0" step="1" placeholder="0"
          value={filters.min_amount || ''}
          onChange={(e) => set('min_amount', e.target.value)}
          style={{ ...inputStyle, width: 72 }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
        />
      </FilterGroup>
      <FilterGroup label="Max $">
        <input
          type="number" min="0" step="1" placeholder="∞"
          value={filters.max_amount || ''}
          onChange={(e) => set('max_amount', e.target.value)}
          style={{ ...inputStyle, width: 72 }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
        />
      </FilterGroup>

      {/* This Month quick filter */}
      <button
        onClick={() => onChange({ ...filters, ...getMonthRange() })}
        style={{
          alignSelf: 'flex-end',
          padding: '7px 10px',
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
          onClick={() => onChange({ account_id: '', category: '', start: '', end: '', min_amount: '', max_amount: '' })}
          style={{
            alignSelf: 'flex-end',
            padding: '7px 10px',
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
