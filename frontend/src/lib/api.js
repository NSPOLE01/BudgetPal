const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const createLinkToken = () =>
  request('/api/plaid/create-link-token', { method: 'POST' })

export const exchangeToken = (public_token) =>
  request('/api/plaid/exchange-token', {
    method: 'POST',
    body: JSON.stringify({ public_token }),
  })

export const syncTransactions = () =>
  request('/api/plaid/sync', { method: 'POST' })

export const getConnectedItems = () =>
  request('/api/plaid/items')

export const getAccounts = () =>
  request('/api/accounts')

export const getTransactions = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/api/transactions${qs ? `?${qs}` : ''}`)
}

export const getSpendingSummary = (chartStart) => {
  const qs = chartStart ? `?chartStart=${chartStart}` : ''
  return request(`/api/transactions/summary${qs}`)
}

export const updateTransaction = (id, fields) =>
  request(`/api/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })

export const getMonthlyTotals = () =>
  request('/api/transactions/monthly')

export const deleteTransaction = (id) =>
  request(`/api/transactions/${id}`, { method: 'DELETE' })

export const createTransaction = (fields) =>
  request('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(fields),
  })
