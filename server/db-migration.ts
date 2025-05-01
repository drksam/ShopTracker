import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";

// Create a migration function
export async function runMigrations() {
  try {
    console.log('Creating tables if they do not exist...');
    
    // Create users table with all required columns
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        rfid_number TEXT,
        email TEXT,
        enable_sound_notifications INTEGER DEFAULT 1,
        enable_visual_notifications INTEGER DEFAULT 1,
        notification_sound TEXT DEFAULT 'default',
        order_completed_notifications INTEGER DEFAULT 1,
        order_started_notifications INTEGER DEFAULT 1,
        help_request_notifications INTEGER DEFAULT 1,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
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
        pdf_prefix TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      );
    `);
    
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