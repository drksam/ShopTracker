import { pgSchema, pgTable, text, integer, boolean, timestamp, serial, doublePrecision } from "drizzle-orm/pg-core";
// Use a dedicated Postgres schema to keep ShopTracker objects contained
export const st = pgSchema('shoptracker');
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = st.table("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("shop"),
  active: boolean("active").notNull().default(true),
  rfidNumber: text("rfid_number"),
  email: text("email"),
  // Notification preferences
  enableSoundNotifications: boolean("enable_sound_notifications").default(true),
  enableVisualNotifications: boolean("enable_visual_notifications").default(true),
  notificationSound: text("notification_sound").default("default"),
  orderCompletedNotifications: boolean("order_completed_notifications").default(true),
  orderStartedNotifications: boolean("order_started_notifications").default(true),
  helpRequestNotifications: boolean("help_request_notifications").default(true),
  notificationsLastSeenAt: timestamp("notifications_last_seen_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Locations table
export const locations = st.table("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  usedOrder: integer("used_order").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  skipAutoQueue: boolean("skip_auto_queue").notNull().default(false),
  countMultiplier: doublePrecision("count_multiplier").notNull().default(1),
  noCount: boolean("no_count").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Machines table
export const machines = st.table("machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  machineId: text("machine_id").notNull().unique(), // 2-digit ID for machine
  locationId: integer("location_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Machine access permissions table (relates users to machines)
export const machinePermissions = st.table("machine_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  machineId: integer("machine_id").notNull(), // Foreign key to machines
  accessRole: text("access_role").notNull().default("operator"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Machine assignments: assign orders (at a specific location) to machines in that location
export const machineAssignments = st.table("machine_assignments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  locationId: integer("location_id").notNull(), // The location context for this assignment
  machineId: integer("machine_id").notNull(), // Foreign key to machines
  assignedQuantity: integer("assigned_quantity").notNull().default(0),
  assignedAt: timestamp("assigned_at", { withTimezone: false }).notNull().defaultNow(),
});

// Orders table
export const orders = st.table("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  tbfosNumber: text("tbfos_number").notNull(),
  client: text("client").notNull(),
  dueDate: timestamp("due_date", { withTimezone: false }).notNull(),
  totalQuantity: integer("total_quantity").notNull(),
  description: text("description"),
  notes: text("notes"),
  isFinished: boolean("is_finished").notNull().default(false),
  isShipped: boolean("is_shipped").notNull().default(false), 
  partiallyShipped: boolean("partially_shipped").notNull().default(false),
  shippedQuantity: integer("shipped_quantity").notNull().default(0),
  // Global queue position across all orders (1-based). Null means not in global queue yet.
  globalQueuePosition: integer("global_queue_position"),
  // Rush flag & timestamp for priority handling
  rush: boolean("rush").notNull().default(false),
  rushSetAt: timestamp("rush_set_at", { withTimezone: false }),
  pdfPrefix: text("pdf_prefix").default(""),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  createdBy: integer("created_by"), // Foreign key to users
});

// Order locations table (tracks an order's status at each location)
export const orderLocations = st.table("order_locations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  locationId: integer("location_id").notNull(), // Foreign key to locations
  status: text("status").notNull().default("not_started"),
  queuePosition: integer("queue_position"),
  completedQuantity: integer("completed_quantity").notNull().default(0),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: false }),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Audit trail table
export const auditTrail = st.table("audit_trail", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  userId: integer("user_id"), // Foreign key to users
  locationId: integer("location_id"), // Foreign key to locations (optional)
  action: text("action").notNull(), // e.g., "started", "updated", "finished", "shipped"
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Help requests table
export const helpRequests = st.table("help_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(), // Foreign key to orders
  locationId: integer("location_id").notNull(), // Foreign key to locations
  userId: integer("user_id").notNull(), // Foreign key to users
  notes: text("notes"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: false }),
});

// Email settings table
export const emailSettings = st.table("email_settings", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  forShipping: boolean("for_shipping").notNull().default(true),
  forHelp: boolean("for_help").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// PDF settings table
export const pdfSettings = st.table("pdf_settings", {
  id: serial("id").primaryKey(),
  pdfPrefix: text("pdf_prefix").notNull().default(""),
  pdfPostfix: text("pdf_postfix").notNull().default(".pdf"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// *** Machine Access & RFID Authentication Tables ***

// RFID Cards table
export const rfidCards = st.table("rfid_cards", {
  cardId: text("card_id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users table
  active: boolean("active").notNull().default(true),
  issueDate: timestamp("issue_date", { withTimezone: false }).notNull().defaultNow(),
  expiryDate: timestamp("expiry_date", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Access Levels table for machine access
export const accessLevels = st.table("access_levels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  machineId: text("machine_id").notNull(), // Machine identifier
  accessLevel: text("access_level").notNull().default("operator"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Access Logs table for machine access
export const accessLogs = st.table("access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Foreign key to users (nullable for unidentified cards)
  machineId: text("machine_id").notNull(), // Machine identifier
  cardId: text("card_id").notNull(), // RFID card ID
  accessGranted: boolean("access_granted").notNull().default(false),
  reason: text("reason"), // Reason for access decision
  timestamp: timestamp("timestamp", { withTimezone: false }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  rfidNumber: true,
  email: true,
  active: true,
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
  accessRole: true,
});

export const insertMachineAssignmentSchema = createInsertSchema(machineAssignments).pick({
  orderId: true,
  locationId: true,
  machineId: true,
  assignedQuantity: true,
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

// Machine access schema
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

export type MachineAssignment = typeof machineAssignments.$inferSelect;
export type InsertMachineAssignment = z.infer<typeof insertMachineAssignmentSchema>;

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

// Machine access types
export type RfidCard = typeof rfidCards.$inferSelect;
export type InsertRfidCard = z.infer<typeof insertRfidCardSchema>;

export type AccessLevel = typeof accessLevels.$inferSelect;
export type InsertAccessLevel = z.infer<typeof insertAccessLevelSchema>;

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;

// Authentication request/response types (generic machine access)
export const machineAuthRequestSchema = z.object({
  card_id: z.string(),
  machine_id: z.string()
});

export type MachineAuthRequest = z.infer<typeof machineAuthRequestSchema>;

// API Configuration table
export const apiConfigs = st.table("api_configs", {
  id: serial("id").primaryKey(),
  shopMonitorApiKey: text("machine_monitor_api_key").notNull(),
  shopMonitorApiUrl: text("machine_monitor_api_url").notNull(),
  syncEnabled: boolean("sync_enabled").notNull().default(false),
  syncInterval: integer("sync_interval").notNull().default(60),
  alertsEnabled: boolean("alerts_enabled").notNull().default(false),
  pushUserData: boolean("push_user_data").notNull().default(true),
  pushLocationData: boolean("push_location_data").notNull().default(true),
  pushMachineData: boolean("push_machine_data").notNull().default(true),
  pullAccessLogs: boolean("pull_access_logs").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
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
export const machineAlerts = st.table("machine_alerts", {
  id: serial("id").primaryKey(),
  machineId: text("machine_id").notNull(), // Machine identifier (can be from ShopMonitor)
  senderId: integer("sender_id"), // User who sent the alert (null if from machine)
  message: text("message").notNull(),
  alertType: text("alert_type").notNull(),
  status: text("status").notNull().default("pending"),
  origin: text("origin").notNull(),
  resolvedById: integer("resolved_by_id"), // User who resolved the alert
  resolvedAt: timestamp("resolved_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
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

// Application Settings table (single-row configuration)
export const appSettings = st.table("app_settings", {
  id: serial("id").primaryKey(),
  // System
  companyName: text("company_name").notNull().default("ShopTracker Manufacturing"),
  companyLogoUrl: text("company_logo_url").notNull().default(""),
  timeZone: text("time_zone").notNull().default("America/New_York"),
  dateFormat: text("date_format").notNull().default("MM/dd/yyyy"),
  autoRefreshInterval: integer("auto_refresh_interval").notNull().default(30),
  // Notifications
  enableEmailNotifications: boolean("enable_email_notifications").notNull().default(false),
  enablePushNotifications: boolean("enable_push_notifications").notNull().default(false),
  orderCompletedNotifications: boolean("order_completed_notifications").notNull().default(true),
  helpRequestNotifications: boolean("help_request_notifications").notNull().default(true),
  lowStockNotifications: boolean("low_stock_notifications").notNull().default(false),
  // Security
  requireTwoFactor: boolean("require_two_factor").notNull().default(false),
  sessionTimeout: integer("session_timeout").notNull().default(60),
  passwordMinLength: integer("password_min_length").notNull().default(8),
  requirePasswordComplexity: boolean("require_password_complexity").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).pick({
  companyName: true,
  companyLogoUrl: true,
  timeZone: true,
  dateFormat: true,
  autoRefreshInterval: true,
  enableEmailNotifications: true,
  enablePushNotifications: true,
  orderCompletedNotifications: true,
  helpRequestNotifications: true,
  lowStockNotifications: true,
  requireTwoFactor: true,
  sessionTimeout: true,
  passwordMinLength: true,
  requirePasswordComplexity: true,
});

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
