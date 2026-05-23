import { Router } from 'express'
import { CountryCode, Products } from 'plaid'
import plaidClient from '../lib/plaid.js'
import supabase from '../lib/supabase.js'
import { syncAllItems } from '../lib/sync.js'

const router = Router()

// Creates a Plaid Link token — frontend uses this to open the Link flow
router.post('/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'tally-user' },
      client_name: 'Tally',
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

router.post('/sync', async (req, res) => {
  try {
    const result = await syncAllItems()
    res.json(result)
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
