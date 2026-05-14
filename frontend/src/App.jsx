import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard.jsx'
import { getConnectedItems } from './lib/api.js'

export default function App() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkConnection = useCallback(async () => {
    try {
      const items = await getConnectedItems()
      setConnected(items.length > 0)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkConnection() }, [checkConnection])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return <Dashboard connected={connected} onConnected={() => setConnected(true)} />
}
