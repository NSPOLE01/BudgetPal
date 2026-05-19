import plaidClient from './plaid.js'
import supabase from './supabase.js'

export async function syncAllItems() {
  const { data: items, error } = await supabase.from('items').select('*')
  if (error) throw error
  if (!items.length) return { synced: 0 }

  let totalSynced = 0

  for (const item of items) {
    let cursor = item.cursor || undefined
    let hasMore = true
    const added = []
    const modified = []
    const removedIds = []

    console.log(`[sync] starting item: ${item.institution_name}, cursor: ${cursor ? 'set' : 'null'}`)

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

      console.log(`[sync] page — added: ${data.added.length}, modified: ${data.modified.length}, removed: ${data.removed.length}, has_more: ${data.has_more}`)
    }

    const allIds = [...added, ...modified].map((t) => t.transaction_id)
    let modifiedByUser = new Set()
    if (allIds.length) {
      const { data: manualRows } = await supabase
        .from('transactions')
        .select('plaid_transaction_id')
        .in('plaid_transaction_id', allIds)
        .eq('user_modified', true)
      modifiedByUser = new Set((manualRows || []).map((r) => r.plaid_transaction_id))
    }

    const upsertRows = [...added, ...modified]
      .filter((t) => !modifiedByUser.has(t.transaction_id))
      .map((t) => ({
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

    if (removedIds.length) {
      await supabase.from('transactions').delete().in('plaid_transaction_id', removedIds)
    }

    await supabase
      .from('items')
      .update({ cursor, last_synced_at: new Date().toISOString() })
      .eq('id', item.id)

    console.log(`[sync] ${item.institution_name} done — upserted: ${upsertRows.length}, removed: ${removedIds.length}`)
    totalSynced += upsertRows.length
  }

  console.log(`[sync] complete — total synced: ${totalSynced}`)
  return { synced: totalSynced }
}
