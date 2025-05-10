import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  rfidNumber: text("rfid_number"), // This will be 'rfid_number' in the database
  email: text("email"),
  // Notification preferences
  enableSoundNotifications: integer("enable_sound_notifications", { mode: "boolean" }).default(true),
  enableVisualNotifications: integer("enable_visual_notifications", { mode: "boolean" }).default(true),
  notificationSound: text("notification_sound").default("default"),
  orderCompletedNotifications: integer("order_completed_notifications", { mode: "boolean" }).default(true),
  orderStartedNotifications: integer("order_started_notifications", { mode: "boolean" }).default(true),
  helpRequestNotifications: integer("help_request_notifications", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Locations table
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  usedOrder: integer("used_order").notNull(), // Order in which location appears in workflow
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  skipAutoQueue: integer("skip_auto_queue", { mode: "boolean" }).notNull().default(false),
  countMultiplier: real("count_multiplier").notNull().default(1),
  noCount: integer("no_count", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Machines table
export const machines = sqliteTable("machines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  machineId: text("machine_id").notNull().unique(), // 2-digit ID for machine
  locationId: integer("location_id").notNull(), // Foreign key to locations
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Machine access permissions table (relates users to machines)
export const machinePermissions = sqliteTable("machine_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(), // Foreign key to users
  machineId: integer("machine_id").notNull(), // Foreign key to machines
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Orders table
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  tbfosNumber: text("tbfos_number").notNull(),
  client: text("client").notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  totalQuantity: integer("total_quantity").notNull(),
  description: text("description"),
  notes: text("notes"),
  isFinished: integer("is_finished", { mode: "boolean" }).notNull().default(false),
  isShipped: integer("is_shipped", { mode: "boolean" }).notNull().default(false), 
  partiallyShipped: integer("partially_shipped", { mode: "boolean" }).notNull().default(false),
  shippedQuantity: integer("shipped_quantity").notNull().default(0),
  pdfPrefix: text("pdf_prefix").default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdBy: integer("created_by"), // Foreign key to users
});

// Order locations table (tracks an order's status at each location)
export const orderLocations = sqliteTable("order_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  locationId: integer("location_id").notNull(), // Foreign key to locations
  status: text("status", { enum: ["not_started", "in_queue", "in_progress", "paused", "done"] }).notNull().default("not_started"),
  queuePosition: integer("queue_position"),
  completedQuantity: integer("completed_quantity").notNull().default(0),
  notes: text("notes"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Audit trail table
export const auditTrail = sqliteTable("audit_trail", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  userId: integer("user_id"), // Foreign key to users
  locationId: integer("location_id"), // Foreign key to locations (optional)
  action: text("action").notNull(), // e.g., "started", "updated", "finished", "shipped"
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Help requests table
export const helpRequests = sqliteTable("help_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  locationId: integer("location_id").notNull(), // Foreign key to locations
  userId: integer("user_id").notNull(), // Foreign key to users
  notes: text("notes"),
  isResolved: integer("is_resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});

// Email settings table
export const emailSettings = sqliteTable("email_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  forShipping: integer("for_shipping", { mode: "boolean" }).notNull().default(true),
  forHelp: integer("for_help", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// PDF settings table
export const pdfSettings = sqliteTable("pdf_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pdfPrefix: text("pdf_prefix").notNull().default(""),
  pdfPostfix: text("pdf_postfix").notNull().default(".pdf"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// *** Laser System Authentication Tables ***

// RFID Cards table for laser system
export const rfidCards = sqliteTable("rfid_cards", {
  cardId: text("card_id").primaryKey(), // Primary key, the RFID card number
  userId: integer("user_id").notNull(), // Foreign key to users table
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  issueDate: integer("issue_date", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  expiryDate: integer("expiry_date", { mode: "timestamp" }), // Optional expiry date
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Access Levels table for laser system
export const accessLevels = sqliteTable("access_levels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(), // Foreign key to users
  machineId: text("machine_id").notNull(), // Machine identifier
  accessLevel: text("access_level", { enum: ["operator", "admin", "maintenance"] }).notNull().default("operator"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Access Logs table for laser system
export const accessLogs = sqliteTable("access_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"), // Foreign key to users (nullable for unidentified cards)
  machineId: text("machine_id").notNull(), // Machine identifier
  cardId: text("card_id").notNull(), // RFID card ID
  accessGranted: integer("access_granted", { mode: "boolean" }).notNull().default(false),
  reason: text("reason"), // Reason for access decision
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  rfidNumber: true,
  email: true,
});

// Create notification preferences schema
export const notificationPreferencesSchema = createInsertSchema(users).pick({
  enableSoundNotifications: true,
  enableVisualNotifications: true,
  notificationSound: true,
  orderCompletedNotifications: true,
  orderStartedNotifications: true,
  helpRequestNotifications: true,
});

export const insertLocationSchema = createInsertSchema(locations).pick({
  name: true,
  usedOrder: true,
  isPrimary: true,
  skipAutoQueue: true,
  countMultiplier: true,
  noCount: true,
});

export const insertMachineSchema = createInsertSchema(machines).pick({
  name: true,
  machineId: true,
  locationId: true,
});

export const insertMachinePermissionSchema = createInsertSchema(machinePermissions).pick({
  userId: true,
  machineId: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  orderNumber: true,
  tbfosNumber: true,
  client: true,
  dueDate: true,
  totalQuantity: true,
  description: true,
  notes: true,
  pdfPrefix: true,
  createdBy: true,
});

export const insertOrderLocationSchema = createInsertSchema(orderLocations).pick({
  orderId: true,
  locationId: true,
  status: true,
  queuePosition: true,
  completedQuantity: true,
  notes: true,
});

export const insertAuditTrailSchema = createInsertSchema(auditTrail).pick({
  orderId: true,
  userId: true,
  locationId: true,
  action: true,
  details: true,
});

export const insertHelpRequestSchema = createInsertSchema(helpRequests).pick({
  orderId: true,
  locationId: true,
  userId: true,
  notes: true,
});

export const insertEmailSettingSchema = createInsertSchema(emailSettings).pick({
  email: true,
  forShipping: true,
  forHelp: true,
});

export const insertPdfSettingSchema = createInsertSchema(pdfSettings).pick({
  pdfPrefix: true,
  pdfPostfix: true,
});

// Laser system schema
export const insertRfidCardSchema = createInsertSchema(rfidCards).pick({
  cardId: true,
  userId: true,
  active: true,
  issueDate: true,
  expiryDate: true,
});

export const insertAccessLevelSchema = createInsertSchema(accessLevels).pick({
  userId: true,
  machineId: true,
  accessLevel: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).pick({
  userId: true,
  machineId: true,
  cardId: true,
  accessGranted: true,
  reason: true,
  timestamp: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = z.infer<typeof insertMachineSchema>;

export type MachinePermission = typeof machinePermissions.$inferSelect;
export type InsertMachinePermission = z.infer<typeof insertMachinePermissionSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderLocation = typeof orderLocations.$inferSelect;
export type InsertOrderLocation = z.infer<typeof insertOrderLocationSchema>;

export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;

export type EmailSetting = typeof emailSettings.$inferSelect;
export type InsertEmailSetting = z.infer<typeof insertEmailSettingSchema>;

export type PdfSetting = typeof pdfSettings.$inferSelect;
export type InsertPdfSetting = z.infer<typeof insertPdfSettingSchema>;

// Laser system types
export type RfidCard = typeof rfidCards.$inferSelect;
export type InsertRfidCard = z.infer<typeof insertRfidCardSchema>;

export type AccessLevel = typeof accessLevels.$inferSelect;
export type InsertAccessLevel = z.infer<typeof insertAccessLevelSchema>;

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;

// Authentication request/response types
export const laserAuthRequestSchema = z.object({
  card_id: z.string(),
  machine_id: z.string()
});

export type LaserAuthRequest = z.infer<typeof laserAuthRequestSchema>;

// API Configuration table
export const apiConfigs = sqliteTable("api_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopMonitorApiKey: text("machine_monitor_api_key").notNull(),
  shopMonitorApiUrl: text("machine_monitor_api_url").notNull(),
  syncEnabled: integer("sync_enabled", { mode: "boolean" }).notNull().default(false),
  syncInterval: integer("sync_interval").notNull().default(60),
  alertsEnabled: integer("alerts_enabled", { mode: "boolean" }).notNull().default(false),
  pushUserData: integer("push_user_data", { mode: "boolean" }).notNull().default(true),
  pushLocationData: integer("push_location_data", { mode: "boolean" }).notNull().default(true),
  pushMachineData: integer("push_machine_data", { mode: "boolean" }).notNull().default(true),
  pullAccessLogs: integer("pull_access_logs", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertApiConfigSchema = createInsertSchema(apiConfigs).pick({
  shopMonitorApiKey: true,
  shopMonitorApiUrl: true,
  syncEnabled: true,
  syncInterval: true,
  alertsEnabled: true,
  pushUserData: true,
  pushLocationData: true,
  pushMachineData: true,
  pullAccessLogs: true,
});

// Machine Alerts table for bidirectional communication
export const machineAlerts = sqliteTable("machine_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  machineId: text("machine_id").notNull(), // Machine identifier (can be from ShopMonitor)
  senderId: integer("sender_id"), // User who sent the alert (null if from machine)
  message: text("message").notNull(),
  alertType: text("alert_type", { enum: ["help_request", "notification", "warning", "error"] }).notNull(),
  status: text("status", { enum: ["pending", "acknowledged", "resolved"] }).notNull().default("pending"),
  origin: text("origin", { enum: ["machine", "system"] }).notNull(), // Where the alert originated from
  resolvedById: integer("resolved_by_id"), // User who resolved the alert
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const insertMachineAlertSchema = createInsertSchema(machineAlerts).pick({
  machineId: true,
  senderId: true,
  message: true,
  alertType: true,
  status: true,
  origin: true,
});

export type MachineAlert = typeof machineAlerts.$inferSelect;
export type InsertMachineAlert = z.infer<typeof insertMachineAlertSchema>;

export type ApiConfig = typeof apiConfigs.$inferSelect;
export type InsertApiConfig = z.infer<typeof insertApiConfigSchema>;

// Extended types for API responses
export type OrderWithLocations = Order & {
  locations: (OrderLocation & { location: Location })[];
};

export type OrderWithDetails = OrderWithLocations & {
  createdByUser?: User;
  auditTrail?: AuditTrail[];
};
