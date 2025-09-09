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

    // Check if column exists
    const { rows } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'shoptracker' AND table_name = 'app_settings' AND column_name = 'company_logo_url'`
    )

    if (rows.length === 0) {
      console.log('Adding column company_logo_url to shoptracker.app_settings...')
      await client.query(`ALTER TABLE shoptracker.app_settings ADD COLUMN company_logo_url TEXT NOT NULL DEFAULT '';`)
      console.log('Added company_logo_url column')
    } else {
      console.log('Column company_logo_url already exists')
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
