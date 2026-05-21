import { Router } from 'express'
import supabase from '../lib/supabase.js'

const router = Router()

// GET /api/accounts — all connected accounts with institution name
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('plaid_account_id, name, mask, type, subtype, items!inner(institution_name)')
      .order('name')

    if (error) throw error

    const accounts = data.map(({ items, ...a }) => ({
      ...a,
      institution_name: items?.institution_name ?? null,
    }))

    res.json(accounts)
  } catch (err) {
    console.error('get accounts error:', err.message)
    res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

export default router
