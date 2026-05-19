import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import plaidRoutes from './routes/plaid.js'
import transactionRoutes from './routes/transactions.js'
import { syncAllItems } from './lib/sync.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/plaid', plaidRoutes)
app.use('/api/transactions', transactionRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true }))

// Sync every day at midnight (server local time)
cron.schedule('0 0 * * *', async () => {
  console.log('[cron] midnight sync starting…')
  try {
    const { synced } = await syncAllItems()
    console.log(`[cron] midnight sync complete — ${synced} transactions updated`)
  } catch (err) {
    console.error('[cron] midnight sync failed:', err.message)
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`BudgetPal backend running on http://localhost:${PORT}`))
