import { useEffect, useRef, useState } from 'react'
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

const getWeekRange = () => {
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  const start = weekStart.toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border-2)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  padding: '7px 10px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 10,
  color: 'var(--text-3)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 5,
  display: 'block',
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

export default function TransactionFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const set = (key, val) => onChange({ ...filters, [key]: val })

  const activeCount = [
    filters.account_id, filters.category, filters.start,
    filters.end, filters.min_amount, filters.max_amount,
  ].filter(Boolean).length

  const isThisMonth = filters.start === getMonthRange().start && filters.end === getMonthRange().end
  const isThisWeek = filters.start === getWeekRange().start && filters.end === getWeekRange().end

  const clear = () => onChange({ account_id: '', category: '', start: '', end: '', min_amount: '', max_amount: '' })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }} ref={ref}>

      {/* Filter toggle button */}
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px',
            background: open || activeCount > 0 ? 'rgba(108,99,255,0.1)' : 'var(--bg-3)',
            border: `1px solid ${open || activeCount > 0 ? 'var(--accent)' : 'var(--border-2)'}`,
            borderRadius: 8,
            color: activeCount > 0 ? 'var(--accent)' : 'var(--text-2)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Filters
          {activeCount > 0 && (
            <span style={{
              background: 'var(--accent)', color: '#fff',
              borderRadius: 10, fontSize: 10, fontWeight: 600,
              padding: '1px 6px', lineHeight: '16px',
            }}>
              {activeCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            zIndex: 100,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: 'fadeUp 0.15s ease both',
          }}>
            <Field label="Card">
              <select value={filters.account_id || ''} onChange={(e) => set('account_id', e.target.value)} style={inputStyle}>
                <option value="">All cards</option>
                {accounts.map((a) => (
                  <option key={a.plaid_account_id} value={a.plaid_account_id}>
                    {a.institution_name}{a.mask ? ` ••${a.mask}` : a.name && a.name !== a.institution_name ? ` ${a.name}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category">
              <select value={filters.category || ''} onChange={(e) => set('category', e.target.value)} style={inputStyle}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{fmtLabel(c)}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="From">
                <input type="date" value={filters.start || ''} onChange={(e) => set('start', e.target.value)} style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'} />
              </Field>
              <Field label="To">
                <input type="date" value={filters.end || ''} onChange={(e) => set('end', e.target.value)} style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Min $">
                <input type="number" min="0" step="1" placeholder="0" value={filters.min_amount || ''} onChange={(e) => set('min_amount', e.target.value)} style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'} />
              </Field>
              <Field label="Max $">
                <input type="number" min="0" step="1" placeholder="∞" value={filters.max_amount || ''} onChange={(e) => set('max_amount', e.target.value)} style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'} />
              </Field>
            </div>

            {activeCount > 0 && (
              <button
                onClick={() => { clear(); setOpen(false) }}
                style={{
                  width: '100%', padding: '7px', borderRadius: 8, cursor: 'pointer',
                  background: 'none', border: '1px solid var(--border-2)',
                  color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontSize: 12,
                  transition: 'all 0.15s', marginTop: 2,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick filters — always visible */}
      <button
        onClick={() => onChange({ ...filters, ...getWeekRange() })}
        style={{
          padding: '7px 12px',
          background: isThisWeek ? 'var(--accent)' : 'var(--bg-3)',
          border: `1px solid ${isThisWeek ? 'var(--accent)' : 'var(--border-2)'}`,
          borderRadius: 8,
          color: isThisWeek ? '#fff' : 'var(--text-2)',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        This Week
      </button>
      <button
        onClick={() => onChange({ ...filters, ...getMonthRange() })}
        style={{
          padding: '7px 12px',
          background: isThisMonth ? 'var(--accent)' : 'var(--bg-3)',
          border: `1px solid ${isThisMonth ? 'var(--accent)' : 'var(--border-2)'}`,
          borderRadius: 8,
          color: isThisMonth ? '#fff' : 'var(--text-2)',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        This Month
      </button>

      {/* Active filter chips */}
      {filters.account_id && (
        <Chip label={accounts.find(a => a.plaid_account_id === filters.account_id)?.institution_name || 'Card'} onRemove={() => set('account_id', '')} />
      )}
      {filters.category && (
        <Chip label={fmtLabel(filters.category)} onRemove={() => set('category', '')} />
      )}
      {(filters.start || filters.end) && !isThisMonth && !isThisWeek && (
        <Chip label={[filters.start, filters.end].filter(Boolean).join(' → ')} onRemove={() => onChange({ ...filters, start: '', end: '' })} />
      )}
      {isThisWeek && (
        <Chip label="This Week" onRemove={() => onChange({ ...filters, start: '', end: '' })} />
      )}
      {isThisMonth && (
        <Chip label="This Month" onRemove={() => onChange({ ...filters, start: '', end: '' })} />
      )}
      {(filters.min_amount || filters.max_amount) && (
        <Chip
          label={`$${filters.min_amount || '0'} – ${filters.max_amount ? '$' + filters.max_amount : '∞'}`}
          onRemove={() => onChange({ ...filters, min_amount: '', max_amount: '' })}
        />
      )}
    </div>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 8px 4px 10px',
      background: 'rgba(108,99,255,0.1)',
      border: '1px solid rgba(108,99,255,0.3)',
      borderRadius: 20,
      fontSize: 11, color: 'var(--accent)',
      fontFamily: 'var(--font-body)',
      whiteSpace: 'nowrap',
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--accent)', fontSize: 14, lineHeight: 1,
          padding: 0, display: 'flex', alignItems: 'center',
          opacity: 0.7,
        }}
      >×</button>
    </span>
  )
}
