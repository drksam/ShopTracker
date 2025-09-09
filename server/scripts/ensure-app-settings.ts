import 'dotenv/config'
import pg from 'pg'

const { Client } = pg

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const client = new Client({ connectionString: url, ssl: false })
  try {
    await client.connect()
    console.log('Connected to Postgres')

    // Ensure schema exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS shoptracker;`)

    // Check if table exists
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'shoptracker' AND table_name = 'app_settings'`
    )

    if (rows.length === 0) {
      console.log('Creating table shoptracker.app_settings...')
      await client.query(`
        CREATE TABLE shoptracker.app_settings (
          id SERIAL PRIMARY KEY,
          company_name TEXT NOT NULL DEFAULT 'ShopTracker Manufacturing',
          company_logo_url TEXT NOT NULL DEFAULT '',
          time_zone TEXT NOT NULL DEFAULT 'America/New_York',
          date_format TEXT NOT NULL DEFAULT 'MM/dd/yyyy',
          auto_refresh_interval INTEGER NOT NULL DEFAULT 30,
          enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
          enable_push_notifications BOOLEAN NOT NULL DEFAULT false,
          order_completed_notifications BOOLEAN NOT NULL DEFAULT true,
          help_request_notifications BOOLEAN NOT NULL DEFAULT true,
          low_stock_notifications BOOLEAN NOT NULL DEFAULT false,
          require_two_factor BOOLEAN NOT NULL DEFAULT false,
          session_timeout INTEGER NOT NULL DEFAULT 60,
          password_min_length INTEGER NOT NULL DEFAULT 8,
          require_password_complexity BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `)
      console.log('Created table shoptracker.app_settings')
    } else {
      console.log('Table shoptracker.app_settings already exists')
    }

    // Ensure a single default row exists
    const existing = await client.query(`SELECT id FROM shoptracker.app_settings LIMIT 1`)
    if (existing.rows.length === 0) {
      await client.query(`INSERT INTO shoptracker.app_settings DEFAULT VALUES`)
      console.log('Inserted default row into shoptracker.app_settings')
    } else {
      console.log('shoptracker.app_settings already seeded')
    }

    console.log('Done.')
  } catch (err) {
    console.error('Failed:', err)
    process.exitCode = 1
  } finally {
    try { await client.end() } catch {}
  }
}

main()
