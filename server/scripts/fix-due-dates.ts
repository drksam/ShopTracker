import 'dotenv/config'
import { db } from '../db'
import { orders, type Order } from '@shared/schema'
import { sql, lt, gt } from 'drizzle-orm'

async function main() {
  console.log('Scanning for suspicious dueDate values...')

  // Fetch orders whose dueDate year is between 1970 and 2005 as candidates
  // We can’t do year() in portable Drizzle, so fetch a chunk and filter in JS
  const rows: Order[] = await db.select().from(orders)

  const candidates = rows.filter((r: Order) => {
    if (!r.dueDate) return false
    const d = new Date(r.dueDate as any)
    const y = d.getUTCFullYear()
    return y >= 1970 && y < 2005
  })

  if (candidates.length === 0) {
    console.log('No candidates found. Nothing to do.')
    return
  }

  console.log(`Found ${candidates.length} orders with suspicious dueDate. Applying fix...`)

  let fixed = 0
  for (const o of candidates) {
    const d = new Date(o.dueDate as any)
    // Heuristic: these are likely epoch seconds interpreted as ms; multiply by 1000
    const corrected = new Date(d.getTime() * 1000)
    // Only update if it lands in a modern year (>= 2023 and <= 2100)
    const y = corrected.getUTCFullYear()
    if (y >= 2023 && y <= 2100) {
      await db.update(orders).set({ dueDate: corrected as any }).where(sql`id = ${o.id}`)
      fixed++
    }
  }

  console.log(`Fixed ${fixed} orders.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
