import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import pg from 'pg'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import * as schema from '@shared/schema'

async function main() {
  const sqlitePath = path.resolve(process.cwd(), '.data', 'workshop.db')
  if (!fs.existsSync(sqlitePath)) {
    console.error('Local SQLite not found at', sqlitePath)
    process.exit(1)
  }

  const sqlite = new Database(sqlitePath)

  const { Pool } = pg as any
  const pgUrl = process.env.DATABASE_URL
  if (!pgUrl) {
    console.error('Set DATABASE_URL to target Postgres')
    process.exit(1)
  }
  const pool = new Pool({ connectionString: pgUrl })
  const pdb = drizzlePg(pool, { schema })

  // helpers
  const b = (v: any) => v === 1 || v === true
  const ts = (v: any) => (v == null ? null : new Date(v))

  console.log('Migrating users...')
  const usersRows: any[] = sqlite.prepare('SELECT * FROM users').all()
  for (const u of usersRows) {
    await pdb.insert(schema.users).values({
      id: u.id,
      username: u.username,
      password: u.password,
      fullName: u.full_name,
      role: u.role,
      active: b(u.active),
      rfidNumber: u.rfid_number,
      email: u.email,
      enableSoundNotifications: b(u.enable_sound_notifications),
      enableVisualNotifications: b(u.enable_visual_notifications),
      notificationSound: u.notification_sound,
      orderCompletedNotifications: b(u.order_completed_notifications),
      orderStartedNotifications: b(u.order_started_notifications),
      helpRequestNotifications: b(u.help_request_notifications),
      notificationsLastSeenAt: ts(u.notifications_last_seen_at),
      createdAt: ts(u.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating locations...')
  const locs: any[] = sqlite.prepare('SELECT * FROM locations').all()
  for (const l of locs) {
    await pdb.insert(schema.locations).values({
      id: l.id,
      name: l.name,
  usedOrder: l.used_order,
  isPrimary: b(l.is_primary),
  skipAutoQueue: b(l.skip_auto_queue),
  countMultiplier: l.count_multiplier,
  noCount: b(l.no_count),
  createdAt: ts(l.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating machines...')
  const machines: any[] = sqlite.prepare('SELECT * FROM machines').all()
  for (const m of machines) {
    await pdb.insert(schema.machines).values({
      id: m.id,
      name: m.name,
  machineId: m.machine_id,
  locationId: m.location_id,
  createdAt: ts(m.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating orders...')
  const orders: any[] = sqlite.prepare('SELECT * FROM orders').all()
  for (const o of orders) {
    await pdb.insert(schema.orders).values({
      id: o.id,
  orderNumber: o.order_number,
  tbfosNumber: o.tbfos_number,
  client: o.client,
  dueDate: ts(o.due_date) as any,
  totalQuantity: o.total_quantity,
  description: o.description,
  notes: o.notes,
  isFinished: b(o.is_finished),
  isShipped: b(o.is_shipped),
  partiallyShipped: b(o.partially_shipped),
  shippedQuantity: o.shipped_quantity,
  globalQueuePosition: o.global_queue_position,
  rush: b(o.rush),
  rushSetAt: ts(o.rush_set_at) as any,
  pdfPrefix: o.pdf_prefix,
  createdAt: ts(o.created_at) as any,
  createdBy: o.created_by,
    }).onConflictDoNothing()
  }

  console.log('Migrating order_locations...')
  const ols: any[] = sqlite.prepare('SELECT * FROM order_locations').all()
  for (const ol of ols) {
    await pdb.insert(schema.orderLocations).values({
      id: ol.id,
  orderId: ol.order_id,
  locationId: ol.location_id,
      status: ol.status,
  queuePosition: ol.queue_position,
  completedQuantity: ol.completed_quantity,
      notes: ol.notes,
  startedAt: ts(ol.started_at) as any,
  completedAt: ts(ol.completed_at) as any,
  createdAt: ts(ol.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating machine_permissions...')
  const perms: any[] = sqlite.prepare('SELECT * FROM machine_permissions').all()
  for (const p of perms) {
    await pdb.insert(schema.machinePermissions).values({
      id: p.id,
  userId: p.user_id,
  machineId: p.machine_id,
  accessRole: p.access_role,
  createdAt: ts(p.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating machine_assignments...')
  const assigns: any[] = sqlite.prepare('SELECT * FROM machine_assignments').all()
  for (const a of assigns) {
    await pdb.insert(schema.machineAssignments).values({
      id: a.id,
  orderId: a.order_id,
  locationId: a.location_id,
  machineId: a.machine_id,
  assignedQuantity: a.assigned_quantity,
  assignedAt: ts(a.assigned_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating audit_trail...')
  const audits: any[] = sqlite.prepare('SELECT * FROM audit_trail').all()
  for (const a of audits) {
    await pdb.insert(schema.auditTrail).values({
      id: a.id,
  orderId: a.order_id,
  userId: a.user_id,
  locationId: a.location_id,
      action: a.action,
      details: a.details,
  createdAt: ts(a.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating help_requests...')
  const helps: any[] = sqlite.prepare('SELECT * FROM help_requests').all()
  for (const h of helps) {
    await pdb.insert(schema.helpRequests).values({
      id: h.id,
  orderId: h.order_id,
  locationId: h.location_id,
  userId: h.user_id,
      notes: h.notes,
  isResolved: b(h.is_resolved),
  createdAt: ts(h.created_at) as any,
  resolvedAt: ts(h.resolved_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating email_settings...')
  const emails: any[] = sqlite.prepare('SELECT * FROM email_settings').all()
  for (const e of emails) {
    await pdb.insert(schema.emailSettings).values({
      id: e.id,
      email: e.email,
  forShipping: b(e.for_shipping),
  forHelp: b(e.for_help),
  createdAt: ts(e.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating pdf_settings...')
  const pdfs: any[] = sqlite.prepare('SELECT * FROM pdf_settings').all()
  for (const p of pdfs) {
    await pdb.insert(schema.pdfSettings).values({
      id: p.id,
  pdfPrefix: p.pdf_prefix,
  pdfPostfix: p.pdf_postfix,
  createdAt: ts(p.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating RFID cards...')
  const cards: any[] = sqlite.prepare('SELECT * FROM rfid_cards').all()
  for (const c of cards) {
    await pdb.insert(schema.rfidCards).values({
  cardId: c.card_id,
  userId: c.user_id,
  active: b(c.active),
  issueDate: ts(c.issue_date) as any,
  expiryDate: ts(c.expiry_date) as any,
  createdAt: ts(c.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating access_levels...')
  const acls: any[] = sqlite.prepare('SELECT * FROM access_levels').all()
  for (const al of acls) {
    await pdb.insert(schema.accessLevels).values({
      id: al.id,
  userId: al.user_id,
  machineId: al.machine_id,
  accessLevel: al.access_level,
  createdAt: ts(al.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating access_logs...')
  const logs: any[] = sqlite.prepare('SELECT * FROM access_logs').all()
  for (const l of logs) {
    await pdb.insert(schema.accessLogs).values({
      id: l.id,
  userId: l.user_id,
  machineId: l.machine_id,
  cardId: l.card_id,
  accessGranted: b(l.access_granted),
      reason: l.reason,
  timestamp: ts(l.timestamp) as any,
  createdAt: ts(l.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating machine_alerts...')
  const mals: any[] = sqlite.prepare('SELECT * FROM machine_alerts').all()
  for (const ma of mals) {
    await pdb.insert(schema.machineAlerts).values({
      id: ma.id,
      machineId: ma.machine_id,
      senderId: ma.sender_id,
      message: ma.message,
      alertType: ma.alert_type,
      status: ma.status,
      origin: ma.origin,
      resolvedById: ma.resolved_by_id,
      resolvedAt: ts(ma.resolved_at) as any,
      createdAt: ts(ma.created_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Migrating api_configs...')
  const apis: any[] = sqlite.prepare('SELECT * FROM api_configs').all()
  for (const c of apis) {
    await pdb.insert(schema.apiConfigs).values({
      id: c.id,
      shopMonitorApiKey: c.machine_monitor_api_key,
      shopMonitorApiUrl: c.machine_monitor_api_url,
      syncEnabled: b(c.sync_enabled),
      syncInterval: c.sync_interval,
      alertsEnabled: b(c.alerts_enabled),
      pushUserData: b(c.push_user_data),
      pushLocationData: b(c.push_location_data),
      pushMachineData: b(c.push_machine_data),
      pullAccessLogs: b(c.pull_access_logs),
      createdAt: ts(c.created_at) as any,
      updatedAt: ts(c.updated_at) as any,
    }).onConflictDoNothing()
  }

  console.log('Resetting Postgres sequences...')
  const seqTables = [
    'users','locations','machines','machine_permissions','machine_assignments',
    'orders','order_locations','audit_trail','help_requests','email_settings',
    'pdf_settings','access_levels','access_logs','machine_alerts','api_configs'
  ]
  for (const t of seqTables) {
    const { rows } = await pool.query(`SELECT MAX(id) AS max FROM shoptracker.${t}`)
    const max = rows?.[0]?.max as number | null
    if (max == null) {
      // No rows: set sequence to 1 with is_called = false so nextval() returns 1
      const sql = `SELECT setval(pg_get_serial_sequence('shoptracker.${t}', 'id'), 1, false);`
      await pool.query(sql)
    } else {
      const sql = `SELECT setval(pg_get_serial_sequence('shoptracker.${t}', 'id'), ${max}, true);`
      await pool.query(sql)
    }
  }

  console.log('Done')
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})