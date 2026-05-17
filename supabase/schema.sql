-- Run this in your Supabase SQL editor to set up the schema

-- Plaid items (one per connected bank/institution)
CREATE TABLE IF NOT EXISTS items (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaid_item_id     TEXT UNIQUE NOT NULL,
  plaid_access_token TEXT NOT NULL,
  institution_name  TEXT,
  institution_id    TEXT,
  cursor            TEXT,          -- transactions/sync cursor for incremental updates
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Individual bank accounts within an item
CREATE TABLE IF NOT EXISTS accounts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaid_account_id TEXT UNIQUE NOT NULL,
  item_id          UUID REFERENCES items(id) ON DELETE CASCADE,
  name             TEXT,
  official_name    TEXT,
  mask             TEXT,
  type             TEXT,
  subtype          TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Transactions synced from Plaid
CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plaid_transaction_id TEXT UNIQUE NOT NULL,
  plaid_account_id     TEXT REFERENCES accounts(plaid_account_id) ON DELETE CASCADE,
  amount               DECIMAL(10, 2) NOT NULL,  -- positive = debit (spend), negative = credit
  date                 DATE NOT NULL,
  merchant_name        TEXT,
  name                 TEXT NOT NULL,
  category             TEXT,
  subcategory          TEXT,
  pending              BOOLEAN DEFAULT false,
  user_modified        BOOLEAN DEFAULT false,  -- true = user edited this row; sync will not overwrite it
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(pending);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(plaid_account_id);
