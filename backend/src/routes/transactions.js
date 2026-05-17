import { Router } from 'express'
import supabase from '../lib/supabase.js'

const router = Router()

// GET /api/transactions?limit=50&offset=0&category=Food&start=2024-01-01&end=2024-01-31
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category, start, end } = req.query

    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .eq('pending', false)
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (category) query = query.eq('category', category)
    if (start) query = query.gte('date', start)
    if (end) query = query.lte('date', end)

    const { data, error, count } = await query
    if (error) throw error

    res.json({ transactions: data, total: count })
  } catch (err) {
    console.error('get transactions error:', err.message)
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

// GET /api/transactions/summary — returns spend totals for today, this week, this month
router.get('/summary', async (req, res) => {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Start of current week (Monday)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // Start of current month
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, date, category')
      .gte('date', monthStartStr)
      .eq('pending', false)

    if (error) throw error

    let todaySpend = 0
    let weekSpend = 0
    let monthSpend = 0
    const categoryMap = {}

    for (const tx of data) {
      // Plaid amounts are positive for debits (money out), negative for credits
      const spend = tx.amount > 0 ? tx.amount : 0

      if (tx.date === todayStr) todaySpend += spend
      if (tx.date >= weekStartStr) weekSpend += spend
      monthSpend += spend

      if (spend > 0) {
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
