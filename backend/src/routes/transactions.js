import { Router } from 'express'
import supabase from '../lib/supabase.js'

const router = Router()

// GET /api/transactions?limit=50&offset=0&category=Food&start=2024-01-01&end=2024-01-31
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, start, end } = req.query

    let query = supabase
      .from('transactions')
      .select('*, accounts!inner(name, mask, items!inner(institution_name))')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .eq('pending', false)
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (category) query = query.eq('category', category)
    if (start) query = query.gte('date', start)
    if (end) query = query.lte('date', end)

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

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, date, category')
      .gte('date', fetchStart)
      .eq('pending', false)

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

// GET /api/transactions/monthly — total spend grouped by calendar month, oldest first
router.get('/monthly', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, date')
      .eq('pending', false)
      .gt('amount', 0)
      .order('date', { ascending: true })

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
  const { category, date, amount } = req.body

  const updates = { user_modified: true }
  if (category !== undefined) updates.category = category
  if (date !== undefined) updates.date = date
  if (amount !== undefined) updates.amount = Number(amount)

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('patch transaction error:', err.message)
    res.status(500).json({ error: 'Failed to update transaction' })
  }
})

export default router
