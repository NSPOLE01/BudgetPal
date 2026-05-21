import { useEffect, useState } from 'react'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true))
    const hideTimer = setTimeout(() => setVisible(false), 3500)
    const doneTimer = setTimeout(onDone, 4000)
    return () => { clearTimeout(hideTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 20px',
      background: 'var(--bg-3)',
      border: '1px solid var(--border-2)',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--text)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--green)', flexShrink: 0,
      }} />
      {message}
    </div>
  )
}
