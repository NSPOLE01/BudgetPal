import { Router } from 'express'
import { CountryCode, Products } from 'plaid'
import plaidClient from '../lib/plaid.js'
import supabase from '../lib/supabase.js'

const router = Router()

// Creates a Plaid Link token — frontend uses this to open the Link flow
router.post('/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'budgetpal-user' },
      client_name: 'BudgetPal',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    res.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('create-link-token error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to create link token' })
  }
})

// Exchanges the public token from Plaid Link for a persistent access token
router.post('/exchange-token', async (req, res) => {
  const { public_token } = req.body
  if (!public_token) return res.status(400).json({ error: 'public_token required' })

  try {
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    // Fetch institution info for display
    const itemRes = await plaidClient.itemGet({ access_token })
    const institutionId = itemRes.data.item.institution_id
    let institutionName = 'Unknown Bank'

    if (institutionId) {
      const instRes = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
      })
      institutionName = instRes.data.institution.name
    }

    // Upsert item into Supabase
    const { data: item, error: itemErr } = await supabase
      .from('items')
      .upsert(
        { plaid_item_id: item_id, plaid_access_token: access_token, institution_name: institutionName, institution_id: institutionId },
        { onConflict: 'plaid_item_id' }
      )
      .select()
      .single()

    if (itemErr) throw itemErr

    // Fetch and store accounts for this item
    const accountsRes = await plaidClient.accountsGet({ access_token })
    const accountRows = accountsRes.data.accounts.map((a) => ({
      plaid_account_id: a.account_id,
      item_id: item.id,
      name: a.name,
      official_name: a.official_name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
    }))

    await supabase.from('accounts').upsert(accountRows, { onConflict: 'plaid_account_id' })

    res.json({ success: true, institution_name: institutionName })
  } catch (err) {
    console.error('exchange-token error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to exchange token' })
  }
})

// Syncs transactions from Plaid for all connected items using the cursor-based sync API
router.post('/sync', async (req, res) => {
  try {
    const { data: items, error } = await supabase.from('items').select('*')
    if (error) throw error
    if (!items.length) return res.json({ synced: 0 })

    let totalSynced = 0

    for (const item of items) {
      let cursor = item.cursor || undefined
      let hasMore = true
      const added = []
      const modified = []
      const removedIds = []

      while (hasMore) {
        const syncRes = await plaidClient.transactionsSync({
          access_token: item.plaid_access_token,
          cursor,
        })
        const data = syncRes.data

        added.push(...data.added)
        modified.push(...data.modified)
        removedIds.push(...data.removed.map((r) => r.transaction_id))
        hasMore = data.has_more
        cursor = data.next_cursor
      }

      // Upsert added + modified transactions
      const upsertRows = [...added, ...modified].map((t) => ({
        plaid_transaction_id: t.transaction_id,
        plaid_account_id: t.account_id,
        amount: t.amount,
        date: t.date,
        merchant_name: t.merchant_name || null,
        name: t.name,
        category: t.personal_finance_category?.primary || (t.category?.[0] ?? null),
        subcategory: t.personal_finance_category?.detailed || (t.category?.[1] ?? null),
        pending: t.pending,
      }))

      if (upsertRows.length) {
        await supabase
          .from('transactions')
          .upsert(upsertRows, { onConflict: 'plaid_transaction_id' })
      }

      // Delete removed transactions
      if (removedIds.length) {
        await supabase.from('transactions').delete().in('plaid_transaction_id', removedIds)
      }

      // Save updated cursor
      await supabase
        .from('items')
        .update({ cursor, last_synced_at: new Date().toISOString() })
        .eq('id', item.id)

      totalSynced += upsertRows.length
    }

    res.json({ synced: totalSynced })
  } catch (err) {
    console.error('sync error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// Returns connected institutions for the UI
router.get('/items', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('id, institution_name, institution_id, last_synced_at, created_at')
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' })
  }
})

export default router
