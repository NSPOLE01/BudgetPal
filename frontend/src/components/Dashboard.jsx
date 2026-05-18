import { useState, useEffect, useCallback } from 'react'
import ConnectButton from './ConnectButton.jsx'
import SpendSummary from './SpendSummary.jsx'
import CategoryChart from './CategoryChart.jsx'
import MonthlyChart from './MonthlyChart.jsx'
import TransactionList from './TransactionList.jsx'
import { getSpendingSummary, getTransactions, getMonthlyTotals, syncTransactions } from '../lib/api.js'

const TIMEFRAMES = [
  { label: '1M', months: 1 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
]

function getChartStart(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
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

  const load = useCallback(async (timeframe = chartTimeframe) => {
    if (!connected) return
    const months = TIMEFRAMES.find((t) => t.label === timeframe)?.months ?? 1
    try {
      const [s, t, m] = await Promise.all([
        getSpendingSummary(getChartStart(months)),
        getTransactions({ limit: 50 }),
        getMonthlyTotals(),
      ])
      setSummary(s)
      setTransactions(t.transactions ?? [])
      setMonthlyTotals(m)
    } catch (e) {
      setError(e.message)
    }
  }, [connected, chartTimeframe])

  const handleTimeframeChange = (label) => {
    setChartTimeframe(label)
    const months = TIMEFRAMES.find((t) => t.label === label)?.months ?? 1
    getSpendingSummary(getChartStart(months)).then(setSummary).catch(() => {})
  }

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncTransactions()
      await load(chartTimeframe)
      setLastSync(new Date())
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
      {/* Top bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        padding: '0 32px',
        height: 56,
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
            fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-head)',
          }}>B</div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
            BudgetPal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
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
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Since first transaction</span>
              </div>
              <MonthlyChart data={monthlyTotals} />
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
                {lastSync && (
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Updated {lastSync.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <TransactionList
                transactions={transactions}
                onTransactionUpdated={(updated) => {
                  setTransactions((prev) => prev.map((tx) => tx.id === updated.id ? updated : tx))
                  const months = TIMEFRAMES.find((t) => t.label === chartTimeframe)?.months ?? 1
                  getSpendingSummary(getChartStart(months)).then(setSummary).catch(() => {})
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
