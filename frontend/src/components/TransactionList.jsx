import { useState } from 'react'
import { updateTransaction, deleteTransaction } from '../lib/api.js'

const CATEGORIES = [
  'FOOD_AND_DRINK', 'SHOPS', 'TRANSPORTATION', 'TRAVEL', 'ENTERTAINMENT',
  'HEALTH_FITNESS', 'PERSONAL_CARE', 'GENERAL_MERCHANDISE', 'HOME_IMPROVEMENT',
  'UTILITIES', 'SUBSCRIPTION', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_PAYMENTS',
  'RENT_AND_UTILITIES', 'INCOME', 'OTHER',
]

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const fmtLabel = (cat) =>
  (cat || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function MerchantIcon({ name }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  const hue = [...(name || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: `hsl(${hue}, 30%, var(--hue-bg-l))`,
      border: `1px solid hsl(${hue}, 30%, var(--hue-border-l))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 600, color: `hsl(${hue}, 60%, var(--hue-text-l))`,
      fontFamily: 'var(--font-head)',
    }}>
      {initials}
    </div>
  )
}

function CategoryBadge({ category }) {
  if (!category) return null
  return (
    <span style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 20,
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      color: 'var(--text-2)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {fmtLabel(category)}
    </span>
  )
}

function InstitutionBadge({ name, mask }) {
  if (!name) return null
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <span style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap',
      background: `hsl(${hue}, 30%, var(--hue-bg-l))`,
      border: `1px solid hsl(${hue}, 30%, var(--hue-border-l))`,
      color: `hsl(${hue}, 60%, var(--hue-text-l))`,
      letterSpacing: '0.04em',
    }}>
      {name}{mask ? ` ••${mask}` : ''}
    </span>
  )
}

const inputStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border-2)',
  borderRadius: 6,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  padding: '4px 8px',
  outline: 'none',
}

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-3)',
  transition: 'color 0.12s, background 0.12s',
  flexShrink: 0,
}

function TransactionRow({ tx, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await deleteTransaction(tx.id)
      onDeleted(tx.id)
    } catch (e) {
      console.error(e)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const startEdit = () => {
    setDraft({ category: tx.category || '', date: tx.date, amount: Math.abs(tx.amount) })
    setEditing(true)
  }

  const cancel = () => { setEditing(false); setDraft({}) }

  const save = async () => {
    setSaving(true)
    try {
      const fields = {
        category: draft.category || null,
        date: draft.date,
        // preserve sign (positive = debit)
        amount: tx.amount >= 0 ? Math.abs(draft.amount) : -Math.abs(draft.amount),
      }
      const updated = await updateTransaction(tx.id, fields)
      onUpdated(updated)
      setEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderRadius: 10,
        background: 'var(--bg-3)', border: '1px solid var(--border-2)',
      }}>
        <MerchantIcon name={tx.merchant_name || tx.name} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.merchant_name || tx.name}
          </p>
          <select
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            style={{ ...inputStyle, width: '100%' }}
          >
            <option value="">— No category —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{fmtLabel(c)}</option>
            ))}
          </select>
        </div>

        <input
          type="date"
          value={draft.date}
          onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
          style={{ ...inputStyle, width: 130 }}
        />

        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          style={{ ...inputStyle, width: 88, textAlign: 'right' }}
        />

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ ...iconBtnStyle, color: 'var(--green)' }}
            title="Save"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={cancel} style={{ ...iconBtnStyle, color: 'var(--red)' }} title="Cancel">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px', borderRadius: 10,
        background: hovered ? 'var(--bg-3)' : 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MerchantIcon name={tx.merchant_name || tx.name} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.merchant_name || tx.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{tx.name}</p>
      </div>

      <CategoryBadge category={tx.category} />
      <InstitutionBadge name={tx.institution_name} mask={tx.account_mask} />

      <p style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 48, textAlign: 'right' }}>
        {fmtDate(tx.date)}
      </p>

      <p style={{
        fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600,
        color: tx.amount > 0 ? 'var(--red)' : 'var(--green)',
        minWidth: 72, textAlign: 'right',
      }}>
        {tx.amount > 0 ? '-' : '+'}{fmt(tx.amount)}
      </p>

      <div style={{ display: 'flex', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 0.12s' }}>
        <button
          onClick={startEdit}
          style={iconBtnStyle}
          title="Edit"
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title={confirmDelete ? 'Click again to confirm' : 'Delete'}
          style={{
            ...iconBtnStyle,
            color: confirmDelete ? 'var(--red)' : 'var(--text-3)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={(e) => e.currentTarget.style.color = confirmDelete ? 'var(--red)' : 'var(--text-3)'}
          onBlur={() => setConfirmDelete(false)}
        >
          {confirmDelete ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function TransactionList({ transactions, onTransactionUpdated, onTransactionDeleted }) {
  if (!transactions?.length) return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No transactions to show</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {transactions.map((tx, i) => (
        <div key={tx.id} style={{ animation: 'fadeUp 0.3s ease both', animationDelay: `${Math.min(i * 30, 300)}ms` }}>
          <TransactionRow tx={tx} onUpdated={onTransactionUpdated} onDeleted={onTransactionDeleted} />
        </div>
      ))}
    </div>
  )
}
