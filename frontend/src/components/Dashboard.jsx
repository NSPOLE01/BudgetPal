import { useState, useEffect, useCallback, useRef } from 'react'
import ConnectButton from './ConnectButton.jsx'
import SpendSummary from './SpendSummary.jsx'
import CategoryChart from './CategoryChart.jsx'
import MonthlyChart from './MonthlyChart.jsx'
import TransactionList from './TransactionList.jsx'
import TransactionFilters from './TransactionFilters.jsx'
import AddTransactionModal from './AddTransactionModal.jsx'
import CalendarView from './CalendarView.jsx'
import Toast from './Toast.jsx'
import { getSpendingSummary, getTransactions, getMonthlyTotals, syncTransactions, getConnectedItems } from '../lib/api.js'
import supabase from '../lib/supabase.js'

const TIMEFRAMES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '1Y', days: 365 },
]

function getChartStart(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export default function Dashboard({ connected, onConnected }) {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [error, setError] = useState(null)
  const [chartTimeframe, setChartTimeframe] = useState('1M')
  const [monthlyTotals, setMonthlyTotals] = useState([])
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [toast, setToast] = useState(null)
  const [filters, setFilters] = useState({ account_id: '', category: '', start: '', end: '', min_amount: '', max_amount: '' })
  const [maxTransactionAmount, setMaxTransactionAmount] = useState(500)
  const [calendarKey, setCalendarKey] = useState(0)
  const [monthlyTimeframe, setMonthlyTimeframe] = useState('1Y')
  const [profileOpen, setProfileOpen] = useState(false)
  const [connectedItems, setConnectedItems] = useState([])
  const profileRef = useRef(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const realtimeBuffer = useRef(0)
  const realtimeTimer = useRef(null)

  const showToast = (count) => {
    setToast(`${count} new transaction${count !== 1 ? 's' : ''} synced`)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const load = useCallback(async (timeframe = chartTimeframe, activeFilters = filters) => {
    if (!connected) return
    const days = (TIMEFRAMES.find((t) => t.label === timeframe) ?? TIMEFRAMES[0]).days
    const txParams = Object.fromEntries(Object.entries({ limit: 50, ...activeFilters }).filter(([, v]) => v !== ''))
    try {
      const [s, t, m] = await Promise.all([
        getSpendingSummary(getChartStart(days)),
        getTransactions(txParams),
        getMonthlyTotals(),
      ])
      setSummary(s)
      const txList = t.transactions ?? []
      setTransactions(txList)
      if (txList.length > 0) {
        setMaxTransactionAmount((prev) => Math.max(prev, Math.ceil(Math.max(...txList.map((tx) => tx.amount)))))
      }
      setMonthlyTotals(m)
    } catch (e) {
      setError(e.message)
    }
  }, [connected, chartTimeframe, filters])

  const handleTimeframeChange = (label) => {
    setChartTimeframe(label)
    const days = (TIMEFRAMES.find((t) => t.label === label) ?? TIMEFRAMES[0]).days
    getSpendingSummary(getChartStart(days)).then(setSummary).catch(() => {})
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (connected) getConnectedItems().then(setConnectedItems).catch(() => {})
  }, [connected])

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Realtime subscription — auto-refresh when Edge Function inserts new transactions
  useEffect(() => {
    if (!connected) return
    const channel = supabase
      .channel('transactions-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        realtimeBuffer.current += 1
        clearTimeout(realtimeTimer.current)
        // Batch rapid inserts — reload once they settle
        realtimeTimer.current = setTimeout(async () => {
          const count = realtimeBuffer.current
          realtimeBuffer.current = 0
          await load(chartTimeframe)
          setLastSync(new Date())
          showToast(count)
        }, 1500)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [connected, chartTimeframe, load])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const { synced } = await syncTransactions()
      await load(chartTimeframe)
      setLastSync(new Date())
      if (synced > 0) showToast(synced)
    } catch (e) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const syncBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: 'var(--bg-3)',
    border: '1px solid var(--border-2)',
    borderRadius: 8,
    color: 'var(--text-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    cursor: syncing ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onCreated={(tx) => {
            setTransactions((prev) => [tx, ...prev])
            const days = (TIMEFRAMES.find((t) => t.label === chartTimeframe) ?? TIMEFRAMES[0]).days
            Promise.all([
              getSpendingSummary(getChartStart(days)),
              getMonthlyTotals(),
            ]).then(([s, m]) => { setSummary(s); setMonthlyTotals(m) }).catch(() => {})
            showToast('Transaction added')
          }}
        />
      )}
      {/* Top bar */}
      <div style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        width: 'calc(100% - 96px)',
        maxWidth: 1100,
      }}>
      <header style={{
        borderRadius: 999,
        border: '1px solid var(--border-2)',
        background: 'color-mix(in srgb, var(--bg-2) 80%, transparent)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="2"    y1="2" x2="2"    y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="5.5"  y1="2" x2="5.5"  y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="9"    y1="2" x2="9"    y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="12.5" y1="2" x2="12.5" y2="14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="0.5"  y1="13" x2="14.5" y2="1" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
            Tally
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34,
              background: 'var(--bg-3)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-2)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-2)'}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3 3l1 1M11 11l1 1M11 3l-1 1M3 11l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M13 8.5A5.5 5.5 0 1 1 6.5 2a4 4 0 0 0 6.5 6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {/* Profile popover */}
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              title="Connected accounts"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34,
                background: profileOpen ? 'var(--bg-3)' : 'var(--bg-3)',
                border: `1px solid ${profileOpen ? 'var(--accent)' : 'var(--border-2)'}`,
                borderRadius: 8, cursor: 'pointer',
                color: profileOpen ? 'var(--accent)' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={(e) => { if (!profileOpen) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' } }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>

            {profileOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                zIndex: 200,
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                width: 280,
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                animation: 'fadeUp 0.15s ease both',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Connected Accounts
                  </p>
                </div>
                {connectedItems.filter(item => item.institution_name !== 'Venmo' || item.institution_name === 'Venmo').filter(item => !item.plaid_access_token?.startsWith?.('manual')).length === 0 && connectedItems.length === 0 ? (
                  <p style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>No accounts connected</p>
                ) : (
                  connectedItems
                    .filter(item => item.institution_name !== 'Venmo')
                    .map((item) => (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                            {item.institution_name}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {item.last_synced_at
                              ? `Last synced ${new Date(item.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${new Date(item.last_synced_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                              : 'Never synced'}
                          </p>
                        </div>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: item.last_synced_at ? 'var(--green)' : 'var(--text-3)',
                          boxShadow: item.last_synced_at ? '0 0 6px var(--green)' : 'none',
                          flexShrink: 0,
                        }} />
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          {connected && (
            <button style={syncBtnStyle} onClick={handleSync} disabled={syncing}
              onMouseEnter={(e) => !syncing && (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-2)'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}>
                <path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6 0l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <ConnectButton onConnected={onConnected} compact />
        </div>
      </header>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 32px 40px' }}>
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255,77,106,0.08)',
            border: '1px solid rgba(255,77,106,0.2)',
            borderRadius: 10,
            color: 'var(--red)',
            fontSize: 13,
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {!connected ? (
          <EmptyState onConnected={onConnected} />
        ) : (
          <>
            {/* Spending summary */}
            <section style={{ marginBottom: 40 }}>
              <SpendSummary summary={summary} />
            </section>

            {/* Monthly spend over time */}
            <section style={{
              marginBottom: 40,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 32px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Monthly Spend
                </h2>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                  {['1M', '6M', '1Y', 'All'].map((label) => (
                    <button
                      key={label}
                      onClick={() => setMonthlyTimeframe(label)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: 'none',
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: monthlyTimeframe === label ? 'var(--bg-3)' : 'transparent',
                        color: monthlyTimeframe === label ? 'var(--text)' : 'var(--text-3)',
                        fontWeight: monthlyTimeframe === label ? 500 : 400,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <MonthlyChart data={monthlyTotals} timeframe={monthlyTimeframe} />
            </section>

            {/* Calendar */}
            <section style={{
              marginBottom: 40,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 32px',
            }}>
              <CalendarView refreshKey={calendarKey} />
            </section>

            {/* Category chart */}
            <section style={{
              marginBottom: 40,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 32px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Spending by Category
                </h2>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                  {TIMEFRAMES.map(({ label }) => (
                    <button
                      key={label}
                      onClick={() => handleTimeframeChange(label)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: 'none',
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: chartTimeframe === label ? 'var(--bg-3)' : 'transparent',
                        color: chartTimeframe === label ? 'var(--text)' : 'var(--text-3)',
                        fontWeight: chartTimeframe === label ? 500 : 400,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <CategoryChart data={summary?.categoryBreakdown} />
            </section>

            {/* Transactions */}
            <section style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 32px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Transactions
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {lastSync && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Updated {lastSync.toLocaleTimeString()}
                    </span>
                  )}
                  <TransactionFilters
                    filters={filters}
                    onChange={(f) => { setFilters(f); load(chartTimeframe, f) }}
                  />
                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border-2)',
                      borderRadius: 8,
                      color: 'var(--text-2)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    Add
                  </button>
                </div>
              </div>
              {(filters.account_id || filters.start || filters.end || filters.min_amount || filters.max_amount) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  marginBottom: 12,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text)',
                    letterSpacing: '-0.02em',
                  }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                      transactions.reduce((sum, tx) => sum + tx.amount, 0)
                    )}
                  </span>
                </div>
              )}
              <TransactionList
                transactions={transactions}
                onTransactionUpdated={(updated) => {
                  setTransactions((prev) => prev.map((tx) => tx.id === updated.id ? updated : tx))
                  setCalendarKey((k) => k + 1)
                  const days = (TIMEFRAMES.find((t) => t.label === chartTimeframe) ?? TIMEFRAMES[0]).days
                  getSpendingSummary(getChartStart(days)).then(setSummary).catch(() => {})
                }}
                onTransactionDeleted={(id) => {
                  setTransactions((prev) => prev.filter((tx) => tx.id !== id))
                  setCalendarKey((k) => k + 1)
                  const days = (TIMEFRAMES.find((t) => t.label === chartTimeframe) ?? TIMEFRAMES[0]).days
                  Promise.all([
                    getSpendingSummary(getChartStart(days)),
                    getMonthlyTotals(),
                  ]).then(([s, m]) => { setSummary(s); setMonthlyTotals(m) }).catch(() => {})
                }}
              />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState({ onConnected }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 24,
      animation: 'fadeUp 0.5s ease',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'var(--bg-3)',
        border: '1px solid var(--border-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
      }}>
        💳
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10 }}>
          Connect your first account
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, maxWidth: 380, lineHeight: 1.7 }}>
          Link a credit card or bank account to start tracking your spending automatically.
        </p>
      </div>
      <ConnectButton onConnected={onConnected} />
    </div>
  )
}
