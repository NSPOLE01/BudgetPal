import { useEffect, useState } from 'react'
import { getAccounts, createTransaction } from '../lib/api.js'

const CATEGORIES = [
  'FOOD_AND_DRINK', 'SHOPS', 'TRANSPORTATION', 'TRAVEL', 'ENTERTAINMENT',
  'HEALTH_FITNESS', 'PERSONAL_CARE', 'GENERAL_MERCHANDISE', 'HOME_IMPROVEMENT',
  'UTILITIES', 'SUBSCRIPTION', 'LOAN_PAYMENTS', 'RENT_AND_UTILITIES', 'OTHER',
]

const fmtLabel = (cat) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const today = () => new Date().toISOString().split('T')[0]

const inputStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border-2)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  padding: '9px 12px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-3)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 6,
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  )
}

export default function AddTransactionModal({ onClose, onCreated }) {
  const [accounts, setAccounts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    merchant_name: '',
    name: '',
    amount: '',
    date: today(),
    category: '',
    plaid_account_id: '',
  })

  useEffect(() => {
    getAccounts().then((data) => {
      setAccounts(data)
      if (data.length) setForm((f) => ({ ...f, plaid_account_id: data[0].plaid_account_id }))
    }).catch(() => {})

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.amount || !form.date || !form.plaid_account_id) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const tx = await createTransaction(form)
      onCreated(tx)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-2)',
          borderRadius: 16,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 460,
          animation: 'fadeUp 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600 }}>Add Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Merchant">
              <input
                type="text"
                placeholder="e.g. Whole Foods"
                value={form.merchant_name}
                onChange={(e) => set('merchant_name', e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
              />
            </Field>
            <Field label="Description *">
              <input
                type="text"
                placeholder="e.g. Groceries"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Amount ($) *">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
              />
            </Field>
            <Field label="Date *">
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
              />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              style={inputStyle}
            >
              <option value="">— No category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{fmtLabel(c)}</option>
              ))}
            </select>
          </Field>

          <Field label="Account *">
            <select
              value={form.plaid_account_id}
              onChange={(e) => set('plaid_account_id', e.target.value)}
              style={inputStyle}
            >
              {accounts.map((a) => (
                <option key={a.plaid_account_id} value={a.plaid_account_id}>
                  {a.institution_name} {a.mask ? `••${a.mask}` : a.name}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                background: 'none',
                border: '1px solid var(--border-2)',
                borderRadius: 8,
                color: 'var(--text-2)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 18px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Adding…' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
