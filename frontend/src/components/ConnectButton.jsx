import { useState, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { createLinkToken, exchangeToken, syncTransactions } from '../lib/api.js'

export default function ConnectButton({ onConnected, compact = false }) {
  const [linkToken, setLinkToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const initLink = async () => {
    setLoading(true)
    setError(null)
    try {
      const { link_token } = await createLinkToken()
      setLinkToken(link_token)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const onSuccess = useCallback(async (publicToken) => {
    setLoading(true)
    try {
      await exchangeToken(publicToken)
      await syncTransactions()
      onConnected?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLinkToken(null)
    }
  }, [onConnected])

  const onExit = useCallback(() => {
    setLinkToken(null)
    setLoading(false)
  }, [])

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit })

  // Auto-open when token is ready
  if (linkToken && ready) {
    open()
  }

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: compact ? '8px 16px' : '10px 20px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontFamily: 'var(--font-body)',
    fontSize: compact ? 12 : 13,
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.15s',
    letterSpacing: '0.02em',
  }

  return (
    <div>
      <button style={btnStyle} onClick={initLink} disabled={loading}>
        {loading ? (
          <>
            <span style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            Connecting…
          </>
        ) : (
          <>+ Connect Account</>
        )}
      </button>
      {error && <p style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>{error}</p>}
    </div>
  )
}
