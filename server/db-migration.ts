import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

// Create a migration function
export async function runMigrations() {
  try {
  // Always skip here; SQLite bootstrap is no longer supported with pg-core schema
  console.log('Postgres mode: skipping legacy SQLite DDL bootstrap. Ensure schema is applied via drizzle-kit push.');
  return true;
    console.log('Creating tables if they do not exist...');
    
  // Legacy SQLite code path (unused)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'shop',
        rfid_number TEXT,
        email TEXT,
        enable_sound_notifications INTEGER DEFAULT 1,
        enable_visual_notifications INTEGER DEFAULT 1,
        notification_sound TEXT DEFAULT 'default',
        order_completed_notifications INTEGER DEFAULT 1,
        order_started_notifications INTEGER DEFAULT 1,
  help_request_notifications INTEGER DEFAULT 1,
  notifications_last_seen_at TIMESTAMP,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add notification columns if they don't exist
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN enable_sound_notifications INTEGER DEFAULT 1;`);
      console.log('Added enable_sound_notifications column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN enable_visual_notifications INTEGER DEFAULT 1;`);
      console.log('Added enable_visual_notifications column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN notification_sound TEXT DEFAULT 'default';`);
      console.log('Added notification_sound column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN order_completed_notifications INTEGER DEFAULT 1;`);
      console.log('Added order_completed_notifications column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN order_started_notifications INTEGER DEFAULT 1;`);
      console.log('Added order_started_notifications column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN help_request_notifications INTEGER DEFAULT 1;`);
      console.log('Added help_request_notifications column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN notifications_last_seen_at TIMESTAMP;`);
      console.log('Added notifications_last_seen_at column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    // Add active column if it doesn't exist
    try {
      await db.run(sql`ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;`);
      console.log('Added active column to users table');
    } catch (error) {
      // Column might already exist
    }
    
    // Create locations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        used_order INTEGER NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        skip_auto_queue INTEGER NOT NULL DEFAULT 0,
        count_multiplier REAL NOT NULL DEFAULT 1,
        no_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create machines table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        machine_id TEXT NOT NULL UNIQUE,
        location_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create machine_permissions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS machine_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        machine_id INTEGER NOT NULL,
        access_role TEXT NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Add access_role to machine_permissions if missing
    try {
      await db.run(sql`ALTER TABLE machine_permissions ADD COLUMN access_role TEXT NOT NULL DEFAULT 'operator';`);
      console.log('Added access_role column to machine_permissions table');
    } catch (error) {
      // Column might already exist
    }

    // Create machine_assignments table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS machine_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        machine_id INTEGER NOT NULL,
        assigned_quantity INTEGER NOT NULL DEFAULT 0,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Add assigned_quantity to machine_assignments if missing
    try {
      await db.run(sql`ALTER TABLE machine_assignments ADD COLUMN assigned_quantity INTEGER NOT NULL DEFAULT 0;`);
      console.log('Added assigned_quantity column to machine_assignments table');
    } catch (error) {
      // Column might already exist
    }
    
    // Create orders table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL UNIQUE,
        tbfos_number TEXT NOT NULL,
        client TEXT NOT NULL,
        due_date TIMESTAMP NOT NULL,
        total_quantity INTEGER NOT NULL,
        description TEXT,
        notes TEXT,
        is_finished INTEGER NOT NULL DEFAULT 0,
        is_shipped INTEGER NOT NULL DEFAULT 0,
        partially_shipped INTEGER NOT NULL DEFAULT 0,
        shipped_quantity INTEGER NOT NULL DEFAULT 0,
  global_queue_position INTEGER,
        pdf_prefix TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      );
    `);
    // Add missing global_queue_position column if it doesn't exist
    try {
      await db.run(sql`ALTER TABLE orders ADD COLUMN global_queue_position INTEGER;`);
      console.log('Added global_queue_position column to orders table');
    } catch (error) {
      // Column might already exist
    }
    // Add rush column if it doesn't exist
    try {
      await db.run(sql`ALTER TABLE orders ADD COLUMN rush INTEGER NOT NULL DEFAULT 0;`);
      console.log('Added rush column to orders table');
    } catch (error) {
      // Column might already exist
    }
    // Add rush_set_at column if it doesn't exist
    try {
      await db.run(sql`ALTER TABLE orders ADD COLUMN rush_set_at TIMESTAMP;`);
      console.log('Added rush_set_at column to orders table');
    } catch (error) {
      // Column might already exist
    }
    
    // Create order_locations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS order_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_started',
        queue_position INTEGER,
        completed_quantity INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create audit_trail table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        user_id INTEGER,
        location_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create help_requests table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS help_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        notes TEXT,
        is_resolved INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );
    `);
    
    // Create email_settings table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS email_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        for_shipping INTEGER NOT NULL DEFAULT 1,
        for_help INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create pdf_settings table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS pdf_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pdf_prefix TEXT NOT NULL DEFAULT '',
        pdf_postfix TEXT NOT NULL DEFAULT '.pdf',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create RFID cards table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rfid_cards (
        card_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create Access Levels table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS access_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        machine_id TEXT NOT NULL,
        access_level TEXT NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create Access Logs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        machine_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        access_granted INTEGER NOT NULL DEFAULT 0,
        reason TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create API Configs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS api_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_monitor_api_key TEXT NOT NULL,
        machine_monitor_api_url TEXT NOT NULL,
        sync_enabled INTEGER NOT NULL DEFAULT 1,
        sync_interval INTEGER NOT NULL DEFAULT 5,
        alerts_enabled INTEGER NOT NULL DEFAULT 1,
        push_user_data INTEGER NOT NULL DEFAULT 1,
        push_location_data INTEGER NOT NULL DEFAULT 1,
        push_machine_data INTEGER NOT NULL DEFAULT 1,
        pull_access_logs INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add missing columns to api_configs if they don't exist
    try {
      await db.run(sql`ALTER TABLE api_configs ADD COLUMN alerts_enabled INTEGER NOT NULL DEFAULT 1;`);
      console.log('Added alerts_enabled column to api_configs table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE api_configs ADD COLUMN push_user_data INTEGER NOT NULL DEFAULT 1;`);
      console.log('Added push_user_data column to api_configs table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE api_configs ADD COLUMN push_location_data INTEGER NOT NULL DEFAULT 1;`);
      console.log('Added push_location_data column to api_configs table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE api_configs ADD COLUMN push_machine_data INTEGER NOT NULL DEFAULT 1;`);
      console.log('Added push_machine_data column to api_configs table');
    } catch (error) {
      // Column might already exist
    }
    
    try {
      await db.run(sql`ALTER TABLE api_configs ADD COLUMN pull_access_logs INTEGER NOT NULL DEFAULT 1;`);
      console.log('Added pull_access_logs column to api_configs table');
    } catch (error) {
      // Column might already exist
    }
    
    // Create Machine Alerts table for bidirectional communication
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS machine_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_id TEXT NOT NULL,
        sender_id INTEGER,
        message TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        origin TEXT NOT NULL,
        resolved_by_id INTEGER,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('All tables created successfully.');
    return true;
  } catch (error) {
    console.error('Error creating tables:', error);
    return false;
  }
}

// Create a function to add indexes to improve query performance
export async function addDatabaseIndexes() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('Postgres detected (DATABASE_URL set). Skipping SQLite index creation; use SQL migrations instead.');
      return true;
    }
    console.log('Adding database indexes for performance optimization...');
    
    // Orders table indexes
    console.log('Adding indexes to orders table...');
    // Index on isShipped - used in getAllOrders, searchOrders
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_is_shipped ON orders(is_shipped);`);
    // Index on createdAt - used for sorting in many queries
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
    // Index on isFinished - used in getOrdersForPrimaryLocation
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_is_finished ON orders(is_finished);`);
    // Index for search fields - used in searchOrders
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_search ON orders(order_number, client, tbfos_number, description);`);
    // Index on createdBy - used in getOrderWithLocations
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);`);
  // Index on global_queue_position - for global queue operations
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_orders_global_queue_position ON orders(global_queue_position);`);
    
    // OrderLocations table indexes
    console.log('Adding indexes to order_locations table...');
    // Composite index on orderId, locationId - used in many queries
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_order_locations_order_location ON order_locations(order_id, location_id);`);
    // Index on locationId - used in getOrderLocationsByLocation, getLocationQueue
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_order_locations_location_id ON order_locations(location_id);`);
    // Index on status - used in getLocationQueue, updateQueuePositions
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_order_locations_status ON order_locations(status);`);
    // Composite index on locationId and status - used in getLocationQueue query
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_order_locations_location_status ON order_locations(location_id, status);`);
    // Index on queuePosition - used for sorting
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_order_locations_queue_position ON order_locations(queue_position);`);
    
    // AuditTrail table indexes
    console.log('Adding indexes to audit_trail table...');
    // Index on orderId - used in getAuditTrailForOrder, getOrderWithLocations
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_order_id ON audit_trail(order_id);`);
    // Index on createdAt - used for sorting in many queries
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);`);
    // Index on userId - used in leftJoin operations
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);`);
    // Index on locationId - used in leftJoin operations
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_audit_trail_location_id ON audit_trail(location_id);`);
    
    // AccessLogs table indexes
    console.log('Adding indexes to access_logs table...');
    // Index on timestamp - used for sorting in getRecentAccessLogs
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);`);
    // Index on userId - used in getAccessLogsByUser, leftJoin operations
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);`);
    // Index on machineId - used in getAccessLogsByMachine
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_access_logs_machine_id ON access_logs(machine_id);`);
    // Index on cardId - frequent search field
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_access_logs_card_id ON access_logs(card_id);`);
    
    // RFID Cards table indexes
    console.log('Adding indexes to rfid_cards table...');
    // Index on userId - used in join operations with users table
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rfid_cards_user_id ON rfid_cards(user_id);`);
    // Index on active - used to filter active cards
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rfid_cards_active ON rfid_cards(active);`);
    
    // Machines table indexes
    console.log('Adding indexes to machines table...');
    // Index on locationId - used in getMachinesByLocation
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machines_location_id ON machines(location_id);`);
    // Index on machineId - used for lookups
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machines_machine_id ON machines(machine_id);`);
    
  // MachineAssignments table indexes
  console.log('Adding indexes to machine_assignments table...');
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machine_assignments_order_location ON machine_assignments(order_id, location_id);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machine_assignments_machine_id ON machine_assignments(machine_id);`);
    
    // HelpRequests table indexes
    console.log('Adding indexes to help_requests table...');
    // Index on isResolved - used in getActiveHelpRequests
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_help_requests_is_resolved ON help_requests(is_resolved);`);
    // Index on createdAt - used for sorting
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at);`);
    
    // MachineAlerts table indexes
    console.log('Adding indexes to machine_alerts table...');
    // Index on status - used in getPendingMachineAlerts
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machine_alerts_status ON machine_alerts(status);`);
    // Index on machineId - used in getMachineAlertsByMachine
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machine_alerts_machine_id ON machine_alerts(machine_id);`);
    // Index on senderId - used in join operations
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_machine_alerts_sender_id ON machine_alerts(sender_id);`);
    
    // AccessLevels table indexes
    console.log('Adding indexes to access_levels table...');
    // Composite index on userId, machineId - used in getAccessLevel
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_access_levels_user_machine ON access_levels(user_id, machine_id);`);
    
    // Users table indexes
    console.log('Adding indexes to users table...');
    // Index on username - used in getUserByUsername
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    
    // Locations table indexes
    console.log('Adding indexes to locations table...');
    // Index on usedOrder - used in getLocationsByOrder
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_locations_used_order ON locations(used_order);`);
    // Index on isPrimary - used in getOrdersForPrimaryLocation
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_locations_is_primary ON locations(is_primary);`);
    
    console.log('All database indexes created successfully.');
    return true;
  } catch (error) {
    console.error('Error creating database indexes:', error);
    return false;
  }
}