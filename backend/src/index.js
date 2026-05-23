import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import plaidRoutes from './routes/plaid.js'
import transactionRoutes from './routes/transactions.js'
import accountRoutes from './routes/accounts.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/plaid', plaidRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/accounts', accountRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true }))


const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Tally backend running on http://localhost:${PORT}`))
