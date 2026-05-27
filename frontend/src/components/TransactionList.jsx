import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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

function EditModal({ tx, onSave, onClose }) {
  const [draft, setDraft] = useState({
    category: tx.category || '',
    date: tx.date,
    amount: Math.abs(tx.amount),
  })
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef(null)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateTransaction(tx.id, {
        category: draft.category || null,
        date: draft.date,
        amount: tx.amount >= 0 ? Math.abs(draft.amount) : -Math.abs(draft.amount),
      })
      onSave(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const fieldLabel = {
    fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: 6, display: 'block',
  }

  const field = {
    ...inputStyle,
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    borderRadius: 8,
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeUp 0.2s ease both',
      }}
    >
      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: 400,
        maxWidth: '90vw',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <MerchantIcon name={tx.merchant_name || tx.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tx.merchant_name || tx.name}
            </p>
            {tx.merchant_name && tx.name !== tx.merchant_name && (
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--border-2)',
              borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer',
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, lineHeight: 1, flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Fields */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={fieldLabel}>Category</label>
            <select
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              style={field}
            >
              <option value="">— No category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{fmtLabel(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabel}>Date</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              style={field}
            />
          </div>

          <div>
            <label style={fieldLabel}>Amount ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              style={field}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '0 24px 20px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              background: 'none', border: '1px solid var(--border-2)',
              color: 'var(--text-2)', fontFamily: 'var(--font-body)', fontSize: 13,
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-2)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-2)'}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              background: 'var(--accent)', border: '1px solid var(--accent)',
              color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.12s',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function TransactionRow({ tx, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
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

  return (
    <>
      {editing && (
        <EditModal
          tx={tx}
          onSave={(updated) => { onUpdated(updated); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}
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
          onClick={() => setEditing(true)}
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
    </>
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
