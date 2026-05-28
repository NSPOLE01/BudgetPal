import { Router } from 'express'
import supabase from '../lib/supabase.js'

const router = Router()

// Merchants excluded from all queries and calculations
const EXCLUDED_MERCHANTS = ['MTA']
const EXCLUDED_NAMES = ['ANNUAL MEMBERSHIP FEE', 'RENEWAL MEMBERSHIP FEE']

const applyExclusions = (query) => {
  for (const name of EXCLUDED_MERCHANTS) {
    query = query.not('name', 'ilike', `${name}%`)
  }
  for (const name of EXCLUDED_NAMES) {
    query = query.not('name', 'ilike', `%${name}%`)
  }
  return query
}

// GET /api/transactions?limit=50&offset=0&category=Food&start=2024-01-01&end=2024-01-31
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, start, end, account_id, min_amount, max_amount } = req.query

    let query = applyExclusions(
      supabase
        .from('transactions')
        .select('*, accounts!inner(name, mask, items!inner(institution_name))')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .eq('pending', false)
        .gt('amount', 0)
        .range(Number(offset), Number(offset) + Number(limit) - 1)
    )

    if (category)    query = query.eq('category', category)
    if (start)       query = query.gte('date', start)
    if (end)         query = query.lte('date', end)
    if (account_id)  query = query.eq('plaid_account_id', account_id)
    if (min_amount)  query = query.gte('amount', Number(min_amount))
    if (max_amount)  query = query.lte('amount', Number(max_amount))

    const { data, error, count } = await query
    if (error) throw error

    // Flatten nested join into a flat institution_name field
    const transactions = data.map(({ accounts, ...tx }) => ({
      ...tx,
      institution_name: accounts?.items?.institution_name ?? null,
      account_name: accounts?.name ?? null,
      account_mask: accounts?.mask ?? null,
    }))

    res.json({ transactions, total: count })
  } catch (err) {
    console.error('get transactions error:', err.message)
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

// GET /api/transactions/summary?chartStart=2024-01-01
// chartStart controls the category breakdown window; today/week/month totals are always fixed
router.get('/summary', async (req, res) => {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    // chartStart defaults to the current month; can be overridden for longer chart windows
    const chartStart = req.query.chartStart || monthStartStr
    const fetchStart = chartStart < monthStartStr ? chartStart : monthStartStr

    const { data, error } = await applyExclusions(
      supabase
        .from('transactions')
        .select('amount, date, category')
        .gte('date', fetchStart)
        .eq('pending', false)
    )

    if (error) throw error

    let todaySpend = 0
    let weekSpend = 0
    let monthSpend = 0
    const categoryMap = {}

    for (const tx of data) {
      const spend = tx.amount > 0 ? tx.amount : 0

      // Spend totals always use fixed windows
      if (tx.date === todayStr) todaySpend += spend
      if (tx.date >= weekStartStr) weekSpend += spend
      if (tx.date >= monthStartStr) monthSpend += spend

      // Category breakdown uses the requested chartStart window
      if (spend > 0 && tx.date >= chartStart) {
        const cat = tx.category || 'Other'
        categoryMap[cat] = (categoryMap[cat] || 0) + spend
      }
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)

    res.json({
      today: Math.round(todaySpend * 100) / 100,
      week: Math.round(weekSpend * 100) / 100,
      month: Math.round(monthSpend * 100) / 100,
      categoryBreakdown,
    })
  } catch (err) {
    console.error('summary error:', err.message)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

// GET /api/transactions/daily?year=2026&month=5 — spend per day for a given month
router.get('/daily', async (req, res) => {
  try {
    const now = new Date()
    const year  = Number(req.query.year  || now.getFullYear())
    const month = Number(req.query.month || now.getMonth() + 1)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end   = new Date(year, month, 0).toISOString().split('T')[0] // last day of month

    const { data, error } = await applyExclusions(
      supabase
        .from('transactions')
        .select('amount, date')
        .gte('date', start)
        .lte('date', end)
        .eq('pending', false)
        .gt('amount', 0)
    )
    if (error) throw error

    const dayMap = {}
    for (const tx of data) {
      dayMap[tx.date] = (dayMap[tx.date] || 0) + tx.amount
    }

    const daily = Object.entries(dayMap).map(([date, total]) => ({
      date,
      total: Math.round(total * 100) / 100,
    }))

    res.json(daily)
  } catch (err) {
    console.error('daily error:', err.message)
    res.status(500).json({ error: 'Failed to fetch daily totals' })
  }
})

// GET /api/transactions/monthly — total spend grouped by calendar month, oldest first
router.get('/monthly', async (req, res) => {
  try {
    const { data, error } = await applyExclusions(
      supabase
        .from('transactions')
        .select('amount, date')
        .eq('pending', false)
        .gt('amount', 0)
        .order('date', { ascending: true })
    )

    if (error) throw error

    const monthMap = {}
    for (const tx of data) {
      const key = tx.date.slice(0, 7) // 'YYYY-MM'
      monthMap[key] = (monthMap[key] || 0) + tx.amount
    }

    const monthly = Object.entries(monthMap).map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }))

    res.json(monthly)
  } catch (err) {
    console.error('monthly error:', err.message)
    res.status(500).json({ error: 'Failed to fetch monthly totals' })
  }
})

// POST /api/transactions — create a manual transaction
router.post('/', async (req, res) => {
  const { merchant_name, name, amount, date, category, plaid_account_id } = req.body
  if (!name || !amount || !date || !plaid_account_id) {
    return res.status(400).json({ error: 'name, amount, date and plaid_account_id are required' })
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        plaid_transaction_id: `manual-${crypto.randomUUID()}`,
        plaid_account_id,
        merchant_name: merchant_name || null,
        name,
        amount: Math.abs(Number(amount)),
        date,
        category: category || null,
        pending: false,
        user_modified: true,
      })
      .select('*, accounts!inner(name, mask, items!inner(institution_name))')
      .single()

    if (error) throw error

    const { accounts, ...tx } = data
    res.json({
      ...tx,
      institution_name: accounts?.items?.institution_name ?? null,
      account_name: accounts?.name ?? null,
      account_mask: accounts?.mask ?? null,
    })
  } catch (err) {
    console.error('create transaction error:', err.message)
    res.status(500).json({ error: 'Failed to create transaction' })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('delete transaction error:', err.message)
    res.status(500).json({ error: 'Failed to delete transaction' })
  }
})

// PATCH /api/transactions/:id — edit category, date, or amount
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { category, date, amount, split } = req.body

  const updates = { user_modified: true }
  if (category !== undefined) updates.category = category
  if (date !== undefined) updates.date = date
  if (amount !== undefined) updates.amount = Number(amount)
  if (split !== undefined) updates.split = Boolean(split)

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select('*, accounts!inner(name, mask, items!inner(institution_name))')
      .single()

    if (error) throw error

    const { accounts, ...tx } = data
    res.json({
      ...tx,
      institution_name: accounts?.items?.institution_name ?? null,
      account_name: accounts?.name ?? null,
      account_mask: accounts?.mask ?? null,
    })
  } catch (err) {
    console.error('patch transaction error:', err.message)
    res.status(500).json({ error: 'Failed to update transaction' })
  }
})

export default router
