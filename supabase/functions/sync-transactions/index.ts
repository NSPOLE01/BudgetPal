import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLAID_BASE: Record<string, string> = {
  sandbox:    'https://sandbox.plaid.com',
  development:'https://development.plaid.com',
  production: 'https://production.plaid.com',
}

async function plaidPost(endpoint: string, body: Record<string, unknown>) {
  const base = PLAID_BASE[Deno.env.get('PLAID_ENV') ?? 'production']
  const res = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('PLAID_CLIENT_ID'),
      secret:    Deno.env.get('PLAID_SECRET'),
      ...body,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error_message ?? 'Plaid API error')
  return json
}

Deno.serve(async (req) => {
  // Only allow requests that include the cron secret header
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: items, error } = await supabase.from('items').select('*')
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!items.length) return new Response(JSON.stringify({ synced: 0 }))

  let totalSynced = 0

  for (const item of items) {
    let cursor: string | undefined = item.cursor ?? undefined
    let hasMore = true
    const added: any[]   = []
    const modified: any[] = []
    const removedIds: string[] = []

    while (hasMore) {
      const data = await plaidPost('/transactions/sync', {
        access_token: item.plaid_access_token,
        ...(cursor ? { cursor } : {}),
      })
      added.push(...data.added)
      modified.push(...data.modified)
      removedIds.push(...data.removed.map((r: any) => r.transaction_id))
      hasMore = data.has_more
      cursor  = data.next_cursor
    }

    // Skip transactions the user has manually edited
    const allIds = [...added, ...modified].map((t) => t.transaction_id)
    let modifiedByUser = new Set<string>()
    if (allIds.length) {
      const { data: manualRows } = await supabase
        .from('transactions')
        .select('plaid_transaction_id')
        .in('plaid_transaction_id', allIds)
        .eq('user_modified', true)
      modifiedByUser = new Set((manualRows ?? []).map((r: any) => r.plaid_transaction_id))
    }

    const upsertRows = [...added, ...modified]
      .filter((t) => !modifiedByUser.has(t.transaction_id))
      .map((t) => ({
        plaid_transaction_id: t.transaction_id,
        plaid_account_id:     t.account_id,
        amount:               t.amount,
        date:                 t.date,
        merchant_name:        t.merchant_name ?? null,
        name:                 t.name,
        category:             t.personal_finance_category?.primary ?? t.category?.[0] ?? null,
        subcategory:          t.personal_finance_category?.detailed ?? t.category?.[1] ?? null,
        pending:              t.pending,
      }))

    if (upsertRows.length) {
      await supabase.from('transactions').upsert(upsertRows, { onConflict: 'plaid_transaction_id' })
    }

    if (removedIds.length) {
      await supabase.from('transactions').delete().in('plaid_transaction_id', removedIds)
    }

    await supabase
      .from('items')
      .update({ cursor, last_synced_at: new Date().toISOString() })
      .eq('id', item.id)

    totalSynced += upsertRows.length
  }

  console.log(`[sync-transactions] complete — ${totalSynced} transactions updated`)
  return new Response(JSON.stringify({ synced: totalSynced }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
