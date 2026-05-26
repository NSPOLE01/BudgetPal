import { useEffect, useState, useRef } from 'react'
import { getDailyTotals, getTransactions } from '../lib/api.js'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const fmt = (n) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
    : `$${Math.round(n)}`

function getIntensity(amount, max) {
  if (!amount || max === 0) return 0
  return Math.max(0.08, amount / max)
}

export default function CalendarView() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [dailyMap, setDailyMap] = useState({})
  const [loading, setLoading]   = useState(false)
  const [selectedDay, setSelectedDay]   = useState(null) // 'YYYY-MM-DD'
  const [dayTxns, setDayTxns]           = useState([])
  const [dayTxLoading, setDayTxLoading] = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    getDailyTotals(year, month)
      .then((data) => {
        const map = {}
        for (const { date, total } of data) map[date] = total
        setDailyMap(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [year, month])

  const openDay = (dateStr) => {
    if (dateStr > todayStr) return
    setSelectedDay(dateStr)
    setDayTxns([])
    setDayTxLoading(true)
    getTransactions({ start: dateStr, end: dateStr, limit: 100 })
      .then((r) => setDayTxns(r.transactions ?? []))
      .catch(() => {})
      .finally(() => setDayTxLoading(false))
  }

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const now = new Date()
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const maxSpend = Math.max(...Object.values(dailyMap), 1)
  const todayStr = today.toISOString().split('T')[0]

  return (
    <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={prevMonth} style={navBtn}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600 }}>{monthLabel}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth} style={{ ...navBtn, opacity: isCurrentMonth ? 0.3 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const amount  = dailyMap[dateStr] || 0
          const intensity = getIntensity(amount, maxSpend)
          const isToday   = dateStr === todayStr
          const isFuture  = dateStr > todayStr

          return (
            <div
              key={day}
              title={amount ? `${fmt(amount)}` : undefined}
              onClick={() => !isFuture && openDay(dateStr)}
              style={{
                borderRadius: 10,
                padding: '10px 6px 8px',
                textAlign: 'center',
                background: amount
                  ? `rgba(108, 99, 255, ${intensity})`
                  : 'var(--bg-3)',
                border: isToday
                  ? '1.5px solid var(--accent)'
                  : '1px solid transparent',
                opacity: isFuture ? 0.35 : 1,
                transition: 'background 0.15s, box-shadow 0.15s',
                cursor: isFuture ? 'default' : 'pointer',
                minHeight: 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => { if (!isFuture) e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <span style={{
                fontSize: 12,
                fontWeight: isToday ? 600 : 400,
                color: isToday ? 'var(--accent)' : 'var(--text-2)',
              }}>
                {day}
              </span>
              {amount > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: intensity > 0.5 ? '#fff' : 'var(--text)',
                  marginTop: 4,
                }}>
                  {fmt(amount)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Day detail modal */}
      {selectedDay && (
        <div
          ref={overlayRef}
          onClick={(e) => { if (e.target === overlayRef.current) setSelectedDay(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeUp 0.2s ease both',
          }}
        >
          <div style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            width: 420,
            maxWidth: '90vw',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Daily Spend
                </p>
                <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {dailyMap[selectedDay] > 0 && (
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.02em' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dailyMap[selectedDay])}
                  </span>
                )}
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{
                    background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                    borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer',
                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Transaction list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {dayTxLoading ? (
                <p style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>Loading…</p>
              ) : dayTxns.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>No transactions</p>
              ) : (
                dayTxns.map((tx) => (
                  <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 24px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.merchant_name || tx.name}
                      </p>
                      {tx.category && (
                        <span style={{
                          fontSize: 10, padding: '2px 7px',
                          background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                          borderRadius: 5, color: 'var(--text-3)', letterSpacing: '0.04em',
                        }}>
                          {tx.category}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 600, color: 'var(--red)', marginLeft: 16, whiteSpace: 'nowrap' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  background: 'var(--bg-3)',
  border: '1px solid var(--border-2)',
  borderRadius: 8,
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  transition: 'all 0.15s',
}
