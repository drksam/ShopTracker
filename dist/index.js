var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accessLevels: () => accessLevels,
  accessLogs: () => accessLogs,
  apiConfigs: () => apiConfigs,
  auditTrail: () => auditTrail,
  emailSettings: () => emailSettings,
  helpRequests: () => helpRequests,
  insertAccessLevelSchema: () => insertAccessLevelSchema,
  insertAccessLogSchema: () => insertAccessLogSchema,
  insertApiConfigSchema: () => insertApiConfigSchema,
  insertAuditTrailSchema: () => insertAuditTrailSchema,
  insertEmailSettingSchema: () => insertEmailSettingSchema,
  insertHelpRequestSchema: () => insertHelpRequestSchema,
  insertLocationSchema: () => insertLocationSchema,
  insertMachineAlertSchema: () => insertMachineAlertSchema,
  insertMachineAssignmentSchema: () => insertMachineAssignmentSchema,
  insertMachinePermissionSchema: () => insertMachinePermissionSchema,
  insertMachineSchema: () => insertMachineSchema,
  insertOrderLocationSchema: () => insertOrderLocationSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertPdfSettingSchema: () => insertPdfSettingSchema,
  insertRfidCardSchema: () => insertRfidCardSchema,
  insertUserSchema: () => insertUserSchema,
  laserAuthRequestSchema: () => laserAuthRequestSchema,
  locations: () => locations,
  machineAlerts: () => machineAlerts,
  machineAssignments: () => machineAssignments,
  machinePermissions: () => machinePermissions,
  machines: () => machines,
  notificationPreferencesSchema: () => notificationPreferencesSchema,
  orderLocations: () => orderLocations,
  orders: () => orders,
  pdfSettings: () => pdfSettings,
  rfidCards: () => rfidCards,
  users: () => users
});
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, locations, machines, machinePermissions, machineAssignments, orders, orderLocations, auditTrail, helpRequests, emailSettings, pdfSettings, rfidCards, accessLevels, accessLogs, insertUserSchema, notificationPreferencesSchema, insertLocationSchema, insertMachineSchema, insertMachinePermissionSchema, insertMachineAssignmentSchema, insertOrderSchema, insertOrderLocationSchema, insertAuditTrailSchema, insertHelpRequestSchema, insertEmailSettingSchema, insertPdfSettingSchema, insertRfidCardSchema, insertAccessLevelSchema, insertAccessLogSchema, laserAuthRequestSchema, apiConfigs, insertApiConfigSchema, machineAlerts, insertMachineAlertSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = sqliteTable("users", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      username: text("username").notNull().unique(),
      password: text("password").notNull(),
      fullName: text("full_name").notNull(),
      role: text("role", { enum: ["admin", "manager", "office", "shop"] }).notNull().default("shop"),
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      rfidNumber: text("rfid_number"),
      // This will be 'rfid_number' in the database
      email: text("email"),
      // Notification preferences
      enableSoundNotifications: integer("enable_sound_notifications", { mode: "boolean" }).default(true),
      enableVisualNotifications: integer("enable_visual_notifications", { mode: "boolean" }).default(true),
      notificationSound: text("notification_sound").default("default"),
      orderCompletedNotifications: integer("order_completed_notifications", { mode: "boolean" }).default(true),
      orderStartedNotifications: integer("order_started_notifications", { mode: "boolean" }).default(true),
      helpRequestNotifications: integer("help_request_notifications", { mode: "boolean" }).default(true),
      notificationsLastSeenAt: integer("notifications_last_seen_at", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    locations = sqliteTable("locations", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull().unique(),
      usedOrder: integer("used_order").notNull(),
      // Order in which location appears in workflow
      isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
      skipAutoQueue: integer("skip_auto_queue", { mode: "boolean" }).notNull().default(false),
      countMultiplier: real("count_multiplier").notNull().default(1),
      noCount: integer("no_count", { mode: "boolean" }).notNull().default(false),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    machines = sqliteTable("machines", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull(),
      machineId: text("machine_id").notNull().unique(),
      // 2-digit ID for machine
      locationId: integer("location_id").notNull(),
      // Foreign key to locations
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    machinePermissions = sqliteTable("machine_permissions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").notNull(),
      // Foreign key to users
      machineId: integer("machine_id").notNull(),
      // Foreign key to machines
      accessRole: text("access_role", { enum: ["operator", "admin"] }).notNull().default("operator"),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    machineAssignments = sqliteTable("machine_assignments", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      orderId: integer("order_id").notNull(),
      // Foreign key to orders
      locationId: integer("location_id").notNull(),
      // The location context for this assignment
      machineId: integer("machine_id").notNull(),
      // Foreign key to machines
      assignedQuantity: integer("assigned_quantity").notNull().default(0),
      assignedAt: integer("assigned_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    orders = sqliteTable("orders", {
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
      // Global queue position across all orders (1-based). Null means not in global queue yet.
      globalQueuePosition: integer("global_queue_position"),
      // Rush flag & timestamp for priority handling
      rush: integer("rush", { mode: "boolean" }).notNull().default(false),
      rushSetAt: integer("rush_set_at", { mode: "timestamp" }),
      pdfPrefix: text("pdf_prefix").default(""),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
      createdBy: integer("created_by")
      // Foreign key to users
    });
    orderLocations = sqliteTable("order_locations", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      orderId: integer("order_id").notNull(),
      // Foreign key to orders
      locationId: integer("location_id").notNull(),
      // Foreign key to locations
      status: text("status", { enum: ["not_started", "in_queue", "in_progress", "paused", "done"] }).notNull().default("not_started"),
      queuePosition: integer("queue_position"),
      completedQuantity: integer("completed_quantity").notNull().default(0),
      notes: text("notes"),
      startedAt: integer("started_at", { mode: "timestamp" }),
      completedAt: integer("completed_at", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    auditTrail = sqliteTable("audit_trail", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      orderId: integer("order_id").notNull(),
      // Foreign key to orders
      userId: integer("user_id"),
      // Foreign key to users
      locationId: integer("location_id"),
      // Foreign key to locations (optional)
      action: text("action").notNull(),
      // e.g., "started", "updated", "finished", "shipped"
      details: text("details"),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    helpRequests = sqliteTable("help_requests", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      orderId: integer("order_id").notNull(),
      // Foreign key to orders
      locationId: integer("location_id").notNull(),
      // Foreign key to locations
      userId: integer("user_id").notNull(),
      // Foreign key to users
      notes: text("notes"),
      isResolved: integer("is_resolved", { mode: "boolean" }).notNull().default(false),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
      resolvedAt: integer("resolved_at", { mode: "timestamp" })
    });
    emailSettings = sqliteTable("email_settings", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      email: text("email").notNull(),
      forShipping: integer("for_shipping", { mode: "boolean" }).notNull().default(true),
      forHelp: integer("for_help", { mode: "boolean" }).notNull().default(false),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    pdfSettings = sqliteTable("pdf_settings", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      pdfPrefix: text("pdf_prefix").notNull().default(""),
      pdfPostfix: text("pdf_postfix").notNull().default(".pdf"),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    rfidCards = sqliteTable("rfid_cards", {
      cardId: text("card_id").primaryKey(),
      // Primary key, the RFID card number
      userId: integer("user_id").notNull(),
      // Foreign key to users table
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      issueDate: integer("issue_date", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
      expiryDate: integer("expiry_date", { mode: "timestamp" }),
      // Optional expiry date
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    accessLevels = sqliteTable("access_levels", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").notNull(),
      // Foreign key to users
      machineId: text("machine_id").notNull(),
      // Machine identifier
      accessLevel: text("access_level", { enum: ["operator", "admin", "maintenance"] }).notNull().default("operator"),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    accessLogs = sqliteTable("access_logs", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id"),
      // Foreign key to users (nullable for unidentified cards)
      machineId: text("machine_id").notNull(),
      // Machine identifier
      cardId: text("card_id").notNull(),
      // RFID card ID
      accessGranted: integer("access_granted", { mode: "boolean" }).notNull().default(false),
      reason: text("reason"),
      // Reason for access decision
      timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      password: true,
      fullName: true,
      role: true,
      rfidNumber: true,
      email: true,
      active: true
    });
    notificationPreferencesSchema = createInsertSchema(users).pick({
      enableSoundNotifications: true,
      enableVisualNotifications: true,
      notificationSound: true,
      orderCompletedNotifications: true,
      orderStartedNotifications: true,
      helpRequestNotifications: true
    });
    insertLocationSchema = createInsertSchema(locations).pick({
      name: true,
      usedOrder: true,
      isPrimary: true,
      skipAutoQueue: true,
      countMultiplier: true,
      noCount: true
    });
    insertMachineSchema = createInsertSchema(machines).pick({
      name: true,
      machineId: true,
      locationId: true
    });
    insertMachinePermissionSchema = createInsertSchema(machinePermissions).pick({
      userId: true,
      machineId: true,
      accessRole: true
    });
    insertMachineAssignmentSchema = createInsertSchema(machineAssignments).pick({
      orderId: true,
      locationId: true,
      machineId: true,
      assignedQuantity: true
    });
    insertOrderSchema = createInsertSchema(orders).pick({
      orderNumber: true,
      tbfosNumber: true,
      client: true,
      dueDate: true,
      totalQuantity: true,
      description: true,
      notes: true,
      pdfPrefix: true,
      createdBy: true
    });
    insertOrderLocationSchema = createInsertSchema(orderLocations).pick({
      orderId: true,
      locationId: true,
      status: true,
      queuePosition: true,
      completedQuantity: true,
      notes: true
    });
    insertAuditTrailSchema = createInsertSchema(auditTrail).pick({
      orderId: true,
      userId: true,
      locationId: true,
      action: true,
      details: true
    });
    insertHelpRequestSchema = createInsertSchema(helpRequests).pick({
      orderId: true,
      locationId: true,
      userId: true,
      notes: true
    });
    insertEmailSettingSchema = createInsertSchema(emailSettings).pick({
      email: true,
      forShipping: true,
      forHelp: true
    });
    insertPdfSettingSchema = createInsertSchema(pdfSettings).pick({
      pdfPrefix: true,
      pdfPostfix: true
    });
    insertRfidCardSchema = createInsertSchema(rfidCards).pick({
      cardId: true,
      userId: true,
      active: true,
      issueDate: true,
      expiryDate: true
    });
    insertAccessLevelSchema = createInsertSchema(accessLevels).pick({
      userId: true,
      machineId: true,
      accessLevel: true
    });
    insertAccessLogSchema = createInsertSchema(accessLogs).pick({
      userId: true,
      machineId: true,
      cardId: true,
      accessGranted: true,
      reason: true,
      timestamp: true
    });
    laserAuthRequestSchema = z.object({
      card_id: z.string(),
      machine_id: z.string()
    });
    apiConfigs = sqliteTable("api_configs", {
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
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
      updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    insertApiConfigSchema = createInsertSchema(apiConfigs).pick({
      shopMonitorApiKey: true,
      shopMonitorApiUrl: true,
      syncEnabled: true,
      syncInterval: true,
      alertsEnabled: true,
      pushUserData: true,
      pushLocationData: true,
      pushMachineData: true,
      pullAccessLogs: true
    });
    machineAlerts = sqliteTable("machine_alerts", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      machineId: text("machine_id").notNull(),
      // Machine identifier (can be from ShopMonitor)
      senderId: integer("sender_id"),
      // User who sent the alert (null if from machine)
      message: text("message").notNull(),
      alertType: text("alert_type", { enum: ["help_request", "notification", "warning", "error"] }).notNull(),
      status: text("status", { enum: ["pending", "acknowledged", "resolved"] }).notNull().default("pending"),
      origin: text("origin", { enum: ["machine", "system"] }).notNull(),
      // Where the alert originated from
      resolvedById: integer("resolved_by_id"),
      // User who resolved the alert
      resolvedAt: integer("resolved_at", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
    });
    insertMachineAlertSchema = createInsertSchema(machineAlerts).pick({
      machineId: true,
      senderId: true,
      message: true,
      alertType: true,
      status: true,
      origin: true
    });
  }
});

// server/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
var dataDir, dbPath, sqlite, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    dataDir = path.resolve(process.cwd(), ".data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, "workshop.db");
    sqlite = new Database(dbPath);
    db = drizzle(sqlite, { schema: schema_exports });
    sqlite.exec("PRAGMA foreign_keys = ON");
  }
});

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default;
var init_vite_config = __esm({
  async "vite.config.ts"() {
    "use strict";
    vite_config_default = defineConfig({
      plugins: [
        react(),
        runtimeErrorOverlay(),
        themePlugin(),
        ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
          await import("@replit/vite-plugin-cartographer").then(
            (m) => m.cartographer()
          )
        ] : []
      ],
      resolve: {
        alias: {
          "@": path2.resolve(import.meta.dirname, "client", "src"),
          "@shared": path2.resolve(import.meta.dirname, "shared"),
          "@assets": path2.resolve(import.meta.dirname, "attached_assets")
        }
      },
      root: path2.resolve(import.meta.dirname, "client"),
      build: {
        outDir: path2.resolve(import.meta.dirname, "dist/public"),
        emptyOutDir: true
      }
    });
  }
});

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { nanoid } from "nanoid";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}
var viteLogger;
var init_vite = __esm({
  async "server/vite.ts"() {
    "use strict";
    await init_vite_config();
    viteLogger = createLogger();
  }
});

// server/utils.ts
function logError(error, context, level = "error") {
  let errorObject;
  if (error instanceof Error) {
    errorObject = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
    if (error instanceof DatabaseError) {
      errorObject.operation = error.operation;
      errorObject.table = error.table;
      errorObject.originalError = error.originalError;
    } else if (error instanceof ValidationError) {
      errorObject.fields = error.fields;
    } else if (error instanceof NotFoundError) {
      errorObject.resourceType = error.resourceType;
      errorObject.resourceId = error.resourceId;
    } else if (error instanceof SyncError) {
      errorObject.operation = error.operation;
      errorObject.endpoint = error.endpoint;
      errorObject.statusCode = error.statusCode;
    }
  } else {
    errorObject = {
      message: String(error),
      type: typeof error
    };
  }
  const errorMessage = `${level.toUpperCase()} [${context}]: ${JSON.stringify(errorObject, null, 2)}`;
  log(errorMessage, context);
  if (level === "error") {
    console.error(errorMessage);
  } else if (level === "warn") {
    console.warn(errorMessage);
  }
}
async function safeDbOperation(operation, table, fn) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof NotFoundError) {
      logError(error, "database", "warn");
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("UNIQUE constraint failed") || errorMessage.includes("violates unique constraint")) {
      const constraintError = new DatabaseError(
        `Database constraint violation in operation: ${operation} on ${table}`,
        operation,
        table,
        error
      );
      logError(constraintError, "database", "error");
      throw constraintError;
    }
    if (errorMessage.includes("FOREIGN KEY constraint failed") || errorMessage.includes("violates foreign key constraint")) {
      const fkError = new DatabaseError(
        `Foreign key constraint violation in operation: ${operation} on ${table}`,
        operation,
        table,
        error
      );
      logError(fkError, "database", "error");
      throw fkError;
    }
    if (errorMessage.includes("syntax error") || errorMessage.includes("near")) {
      const syntaxError = new DatabaseError(
        `SQL syntax error in operation: ${operation} on ${table}`,
        operation,
        table,
        error
      );
      logError(syntaxError, "database", "error");
      throw syntaxError;
    }
    const genericError = new DatabaseError(
      `Database operation failed: ${operation} on ${table}`,
      operation,
      table,
      error
    );
    logError(genericError, "database", "error");
    throw genericError;
  }
}
function formatErrorResponse(error) {
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      errorType: "validation_error",
      details: {
        fields: error.fields,
        validationFailed: true
      },
      statusCode: 400
    };
  } else if (error instanceof NotFoundError) {
    return {
      message: error.message,
      errorType: "not_found",
      details: {
        resourceType: error.resourceType,
        resourceId: error.resourceId
      },
      statusCode: 404
    };
  } else if (error instanceof AuthorizationError) {
    return {
      message: error.message,
      errorType: "authorization_error",
      details: {
        requiresAuthentication: true
      },
      statusCode: 403
    };
  } else if (error instanceof DatabaseError) {
    const errorMessage = error.message;
    let errorDetails = {
      operation: error.operation,
      table: error.table
    };
    if (errorMessage.includes("constraint violation")) {
      if (errorMessage.includes("UNIQUE constraint")) {
        return {
          message: "The record already exists or would create a duplicate entry",
          errorType: "database_unique_constraint",
          details: errorDetails,
          statusCode: 409
          // Conflict
        };
      }
      if (errorMessage.includes("FOREIGN KEY constraint")) {
        return {
          message: "The operation references a record that does not exist",
          errorType: "database_foreign_key_constraint",
          details: errorDetails,
          statusCode: 400
        };
      }
    }
    return {
      message: `Database operation failed: ${error.operation}`,
      errorType: "database_error",
      details: errorDetails,
      statusCode: 500
    };
  } else if (error instanceof SyncError) {
    let statusCode = error.statusCode || 500;
    let errorMessage = error.message;
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = `Authentication error during sync: ${errorMessage}`;
      statusCode = 403;
    } else if (error.statusCode === 404) {
      errorMessage = `Resource not found during sync: ${errorMessage}`;
    } else if (error.statusCode && error.statusCode >= 500) {
      errorMessage = `Remote server error during sync: ${errorMessage}`;
    }
    return {
      message: errorMessage,
      errorType: "sync_error",
      details: {
        operation: error.operation,
        endpoint: error.endpoint,
        statusCode: error.statusCode
      },
      statusCode
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
      errorType: "general_error",
      details: {
        name: error.name
      },
      statusCode: 500
    };
  } else {
    return {
      message: "An unknown error occurred",
      errorType: "unknown_error",
      statusCode: 500
    };
  }
}
var DatabaseError, ValidationError, NotFoundError, AuthorizationError, SyncError;
var init_utils = __esm({
  async "server/utils.ts"() {
    "use strict";
    await init_vite();
    DatabaseError = class extends Error {
      constructor(message, operation, table, originalError) {
        super(message);
        this.operation = operation;
        this.table = table;
        this.originalError = originalError;
        this.name = "DatabaseError";
      }
    };
    ValidationError = class extends Error {
      constructor(message, fields) {
        super(message);
        this.fields = fields;
        this.name = "ValidationError";
      }
    };
    NotFoundError = class extends Error {
      constructor(message, resourceType, resourceId) {
        super(message);
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.name = "NotFoundError";
      }
    };
    AuthorizationError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "AuthorizationError";
      }
    };
    SyncError = class extends Error {
      constructor(message, operation, endpoint, statusCode) {
        super(message);
        this.operation = operation;
        this.endpoint = endpoint;
        this.statusCode = statusCode;
        this.name = "SyncError";
      }
    };
  }
});

// server/storage.ts
import { eq, and, isNotNull, desc, asc, sql, like, gt, or, inArray, ne } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore, SQLiteStorage, storage;
var init_storage = __esm({
  async "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    await init_utils();
    MemoryStore = createMemoryStore(session);
    SQLiteStorage = class {
      sessionStore;
      constructor() {
        this.sessionStore = new MemoryStore({
          checkPeriod: 864e5
          // prune expired entries every 24h
        });
      }
      // Development helpers
      async resetUsers() {
        return safeDbOperation("resetUsers", "users", async () => {
          await db.delete(users);
        });
      }
      // User management
      async getUser(id) {
        return safeDbOperation("getUser", "users", async () => {
          const [user] = await db.select().from(users).where(eq(users.id, id));
          return user;
        });
      }
      async getUserByUsername(username) {
        return safeDbOperation("getUserByUsername", "users", async () => {
          const [user] = await db.select().from(users).where(eq(users.username, username));
          return user;
        });
      }
      async createUser(userData) {
        return safeDbOperation("createUser", "users", async () => {
          const [user] = await db.insert(users).values(userData).returning();
          return user;
        });
      }
      async updateUser(id, userData) {
        return safeDbOperation("updateUser", "users", async () => {
          const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
          if (!user) {
            throw new NotFoundError(`User with id ${id} not found`, "user", id);
          }
          return user;
        });
      }
      async deleteUser(id) {
        return safeDbOperation("deleteUser", "users", async () => {
          await db.delete(users).where(eq(users.id, id));
          return true;
        });
      }
      async getAllUsers() {
        return safeDbOperation("getAllUsers", "users", async () => {
          return await db.select().from(users).orderBy(users.username);
        });
      }
      // Location management
      async createLocation(locationData) {
        return safeDbOperation("createLocation", "locations", async () => {
          const [location] = await db.insert(locations).values(locationData).returning();
          return location;
        });
      }
      async updateLocation(id, locationData) {
        return safeDbOperation("updateLocation", "locations", async () => {
          const [location] = await db.update(locations).set(locationData).where(eq(locations.id, id)).returning();
          if (!location) {
            throw new NotFoundError(`Location with id ${id} not found`, "location", id);
          }
          return location;
        });
      }
      async deleteLocation(id) {
        return safeDbOperation("deleteLocation", "locations", async () => {
          await db.delete(locations).where(eq(locations.id, id));
          return true;
        });
      }
      async getLocation(id) {
        return safeDbOperation("getLocation", "locations", async () => {
          const [location] = await db.select().from(locations).where(eq(locations.id, id));
          return location;
        });
      }
      async getAllLocations() {
        return safeDbOperation("getAllLocations", "locations", async () => {
          return await db.select().from(locations);
        });
      }
      async getLocationsByOrder() {
        return safeDbOperation("getLocationsByOrder", "locations", async () => {
          return await db.select().from(locations).orderBy(locations.usedOrder);
        });
      }
      // Machine management
      async createMachine(machineData) {
        return safeDbOperation("createMachine", "machines", async () => {
          const [machine] = await db.insert(machines).values(machineData).returning();
          return machine;
        });
      }
      async updateMachine(id, machineData) {
        return safeDbOperation("updateMachine", "machines", async () => {
          const [machine] = await db.update(machines).set(machineData).where(eq(machines.id, id)).returning();
          if (!machine) {
            throw new NotFoundError(`Machine with id ${id} not found`, "machine", id);
          }
          return machine;
        });
      }
      async deleteMachine(id) {
        return safeDbOperation("deleteMachine", "machines", async () => {
          await db.delete(machines).where(eq(machines.id, id));
          return true;
        });
      }
      async getMachine(id) {
        return safeDbOperation("getMachine", "machines", async () => {
          const [machine] = await db.select().from(machines).where(eq(machines.id, id));
          return machine;
        });
      }
      async getMachinesByLocation(locationId) {
        return safeDbOperation("getMachinesByLocation", "machines", async () => {
          return await db.select().from(machines).where(eq(machines.locationId, locationId));
        });
      }
      async getAllMachines() {
        return safeDbOperation("getAllMachines", "machines", async () => {
          return await db.select().from(machines);
        });
      }
      // Machine permissions
      async addMachinePermission(permission) {
        return safeDbOperation("addMachinePermission", "machinePermissions", async () => {
          const [result] = await db.insert(machinePermissions).values(permission).returning();
          return result;
        });
      }
      async removeMachinePermission(userId, machineId) {
        return safeDbOperation("removeMachinePermission", "machinePermissions", async () => {
          await db.delete(machinePermissions).where(
            and(
              eq(machinePermissions.userId, userId),
              eq(machinePermissions.machineId, machineId)
            )
          );
          return true;
        });
      }
      // Machine assignments
      async assignOrderToMachine(assignment) {
        return safeDbOperation("assignOrderToMachine", "machineAssignments", async () => {
          const [machine] = await db.select().from(machines).where(eq(machines.id, assignment.machineId));
          if (!machine) throw new NotFoundError(`Machine with id ${assignment.machineId} not found`, "machine", assignment.machineId);
          if (machine.locationId !== assignment.locationId) {
            throw new DatabaseError(
              "Machine is not in the specified location",
              "assignOrderToMachine",
              "machineAssignments"
            );
          }
          const existing = await db.select().from(machineAssignments).where(and(
            eq(machineAssignments.orderId, assignment.orderId),
            eq(machineAssignments.locationId, assignment.locationId),
            eq(machineAssignments.machineId, assignment.machineId)
          ));
          if (existing.length > 0) {
            const current = existing[0];
            const newQty = assignment.assignedQuantity ?? current.assignedQuantity ?? 0;
            if (newQty !== current.assignedQuantity) {
              const [updated] = await db.update(machineAssignments).set({ assignedQuantity: newQty }).where(and(
                eq(machineAssignments.orderId, assignment.orderId),
                eq(machineAssignments.locationId, assignment.locationId),
                eq(machineAssignments.machineId, assignment.machineId)
              )).returning();
              return updated;
            }
            return current;
          }
          const [result] = await db.insert(machineAssignments).values({
            ...assignment,
            assignedQuantity: assignment.assignedQuantity ?? 0
          }).returning();
          return result;
        });
      }
      async updateMachineAssignmentQuantity(orderId, locationId, machineId, assignedQuantity) {
        return safeDbOperation("updateMachineAssignmentQuantity", "machineAssignments", async () => {
          const [updated] = await db.update(machineAssignments).set({ assignedQuantity }).where(and(
            eq(machineAssignments.orderId, orderId),
            eq(machineAssignments.locationId, locationId),
            eq(machineAssignments.machineId, machineId)
          )).returning();
          return updated;
        });
      }
      async unassignOrderFromMachine(orderId, locationId, machineId) {
        return safeDbOperation("unassignOrderFromMachine", "machineAssignments", async () => {
          await db.delete(machineAssignments).where(and(
            eq(machineAssignments.orderId, orderId),
            eq(machineAssignments.locationId, locationId),
            eq(machineAssignments.machineId, machineId)
          ));
          return true;
        });
      }
      async getAssignmentsForLocation(locationId) {
        return safeDbOperation("getAssignmentsForLocation", "machineAssignments", async () => {
          const results = await db.select({ ma: machineAssignments, o: orders, m: machines }).from(machineAssignments).innerJoin(orders, eq(machineAssignments.orderId, orders.id)).innerJoin(machines, eq(machineAssignments.machineId, machines.id)).where(eq(machineAssignments.locationId, locationId));
          return results.map((r) => ({ ...r.ma, order: r.o, machine: r.m }));
        });
      }
      async getAssignmentsForMachine(machineId) {
        return safeDbOperation("getAssignmentsForMachine", "machineAssignments", async () => {
          const results = await db.select({ ma: machineAssignments, o: orders, l: locations }).from(machineAssignments).innerJoin(orders, eq(machineAssignments.orderId, orders.id)).innerJoin(locations, eq(machineAssignments.locationId, locations.id)).where(eq(machineAssignments.machineId, machineId));
          return results.map((r) => ({ ...r.ma, order: r.o, location: r.l }));
        });
      }
      async getMachinePermissionsForUser(userId) {
        return safeDbOperation("getMachinePermissionsForUser", "machinePermissions", async () => {
          return await db.select().from(machinePermissions).where(eq(machinePermissions.userId, userId));
        });
      }
      async getMachinePermissionsForMachine(machineId) {
        return safeDbOperation("getMachinePermissionsForMachine", "machinePermissions", async () => {
          return await db.select().from(machinePermissions).where(eq(machinePermissions.machineId, machineId));
        });
      }
      async updateMachinePermissionAccessRole(userId, machineId, accessRole) {
        return safeDbOperation("updateMachinePermissionAccessRole", "machinePermissions", async () => {
          const [updated] = await db.update(machinePermissions).set({ accessRole }).where(and(eq(machinePermissions.userId, userId), eq(machinePermissions.machineId, machineId))).returning();
          return updated;
        });
      }
      // Order management
      async createOrder(orderData) {
        return safeDbOperation("createOrder", "orders", async () => {
          const [order] = await db.insert(orders).values(orderData).returning();
          return order;
        });
      }
      async updateOrder(id, orderData) {
        return safeDbOperation("updateOrder", "orders", async () => {
          const [order] = await db.update(orders).set(orderData).where(eq(orders.id, id)).returning();
          if (!order) {
            throw new NotFoundError(`Order with id ${id} not found`, "order", id);
          }
          return order;
        });
      }
      async deleteOrder(id) {
        return safeDbOperation("deleteOrder", "orders", async () => {
          await db.delete(orders).where(eq(orders.id, id));
          return true;
        });
      }
      async getOrder(id) {
        return safeDbOperation("getOrder", "orders", async () => {
          const [order] = await db.select().from(orders).where(eq(orders.id, id));
          return order;
        });
      }
      // Global queue management
      async getGlobalQueue() {
        return safeDbOperation("getGlobalQueue", "orders", async () => {
          const all = await db.select().from(orders).where(eq(orders.isShipped, false));
          const sorted = [...all].sort((a, b) => {
            if (a.rush && !b.rush) return -1;
            if (!a.rush && b.rush) return 1;
            if (a.rush && b.rush) {
              const ar = a.rushSetAt ? new Date(a.rushSetAt).getTime() : 0;
              const br = b.rushSetAt ? new Date(b.rushSetAt).getTime() : 0;
              if (ar !== br) return ar - br;
            }
            const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
            const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
            if (ag !== bg) return ag - bg;
            const ac = new Date(a.createdAt).getTime();
            const bc = new Date(b.createdAt).getTime();
            return ac - bc;
          });
          return sorted;
        });
      }
      async setOrderGlobalQueuePosition(orderId, position) {
        return safeDbOperation("setOrderGlobalQueuePosition", "orders", async () => {
          const allActive = await db.select().from(orders).where(eq(orders.isShipped, false));
          const exists = allActive.some((o) => o.id === orderId);
          if (!exists) {
            const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
            if (!order) throw new NotFoundError(`Order with id ${orderId} not found`, "order", orderId);
          }
          const rushOrders = allActive.filter((o) => o.rush);
          const normalOrders = allActive.filter((o) => !o.rush);
          const sortGroup = (arr) => arr.sort((a, b) => {
            const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
            const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
            if (ag !== bg) return ag - bg;
            const ac = new Date(a.createdAt).getTime();
            const bc = new Date(b.createdAt).getTime();
            return ac - bc;
          });
          sortGroup(rushOrders);
          sortGroup(normalOrders);
          const target = allActive.find((o) => o.id === orderId);
          let workingRush = [...rushOrders];
          let workingNormal = [...normalOrders];
          if (target.rush) {
            workingRush = workingRush.filter((o) => o.id !== orderId);
            const newPos = Math.max(1, Math.min(position, workingRush.length + 1));
            workingRush.splice(newPos - 1, 0, target);
          } else {
            workingNormal = workingNormal.filter((o) => o.id !== orderId);
            const rushCount = workingRush.length;
            const relativePos = Math.max(1, position - rushCount);
            const clamped = Math.max(1, Math.min(relativePos, workingNormal.length + 1));
            workingNormal.splice(clamped - 1, 0, target);
          }
          const finalList = [...workingRush, ...workingNormal];
          for (let i = 0; i < finalList.length; i++) {
            await db.update(orders).set({ globalQueuePosition: i + 1 }).where(eq(orders.id, finalList[i].id));
          }
          return true;
        });
      }
      async setOrderRush(orderId, rushSetAt) {
        return safeDbOperation("setOrderRush", "orders", async () => {
          const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
          if (!existing) throw new NotFoundError(`Order with id ${orderId} not found`, "order", orderId);
          if (existing.rush) return existing;
          const [updated] = await db.update(orders).set({
            rush: true,
            rushSetAt,
            /* ensure it remains in queue */
            globalQueuePosition: existing.globalQueuePosition ?? null
          }).where(eq(orders.id, orderId)).returning();
          await this.reorderGlobalQueue();
          return updated;
        });
      }
      async unsetOrderRush(orderId) {
        return safeDbOperation("unsetOrderRush", "orders", async () => {
          const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
          if (!existing) throw new NotFoundError(`Order with id ${orderId} not found`, "order", orderId);
          if (!existing.rush) return existing;
          const [updated] = await db.update(orders).set({ rush: false, rushSetAt: null }).where(eq(orders.id, orderId)).returning();
          await this.reorderGlobalQueue(orderId);
          return updated;
        });
      }
      // Internal helper to rebuild global queue positions honoring rush precedence.
      async reorderGlobalQueue(unrushedOrderId) {
        const allActive = await db.select().from(orders).where(eq(orders.isShipped, false));
        const rushOrders = allActive.filter((o) => o.rush);
        const normalOrders = allActive.filter((o) => !o.rush);
        rushOrders.sort((a, b) => {
          const ar = a.rushSetAt ? new Date(a.rushSetAt).getTime() : 0;
          const br = b.rushSetAt ? new Date(b.rushSetAt).getTime() : 0;
          if (ar !== br) return ar - br;
          const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
          const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
          return ag - bg;
        });
        normalOrders.sort((a, b) => {
          const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
          const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
          if (ag !== bg) return ag - bg;
          const ac = new Date(a.createdAt).getTime();
          const bc = new Date(b.createdAt).getTime();
          return ac - bc;
        });
        if (unrushedOrderId) {
          const idx = normalOrders.findIndex((o) => o.id === unrushedOrderId);
          if (idx >= 0) normalOrders.push(...normalOrders.splice(idx, 1));
        }
        const finalList = [...rushOrders, ...normalOrders];
        for (let i = 0; i < finalList.length; i++) {
          await db.update(orders).set({ globalQueuePosition: i + 1 }).where(eq(orders.id, finalList[i].id));
        }
      }
      async getOrderWithLocations(id) {
        return safeDbOperation("getOrderWithLocations", "orders", async () => {
          const [order] = await db.select().from(orders).where(eq(orders.id, id));
          if (!order) {
            throw new NotFoundError(`Order with id ${id} not found`, "order", id);
          }
          const orderLocationsData = await db.select({ ol: orderLocations, loc: locations }).from(orderLocations).innerJoin(locations, eq(orderLocations.locationId, locations.id)).where(eq(orderLocations.orderId, id));
          let creator = void 0;
          if (order.createdBy) {
            const [user] = await db.select().from(users).where(eq(users.id, order.createdBy));
            creator = user;
          }
          const auditRecords = await db.select().from(auditTrail).where(eq(auditTrail.orderId, id)).orderBy(desc(auditTrail.createdAt));
          const transformedLocations = orderLocationsData.map((ol) => ({
            ...ol.ol,
            location: ol.loc
          }));
          return {
            ...order,
            locations: transformedLocations,
            createdByUser: creator,
            auditTrail: auditRecords
          };
        });
      }
      async getAllOrders(includeShipped, pagination) {
        return safeDbOperation("getAllOrders", "orders", async () => {
          const page = pagination?.page || 1;
          const pageSize = pagination?.pageSize || 20;
          const offset = (page - 1) * pageSize;
          const whereCondition = includeShipped ? void 0 : eq(orders.isShipped, false);
          const countResult = await db.select({ count: sql`count(*)` }).from(orders).where(whereCondition);
          const totalItems = Number(countResult[0].count ?? 0);
          const totalPages = Math.ceil(totalItems / pageSize);
          const paginatedOrders = await db.select().from(orders).where(whereCondition).orderBy(desc(orders.createdAt)).limit(pageSize).offset(offset);
          const orderIds = paginatedOrders.map((order) => order.id);
          const orderLocationsResult = orderIds.length > 0 ? await db.select({ ol: orderLocations, loc: locations }).from(orderLocations).innerJoin(locations, eq(orderLocations.locationId, locations.id)).where(inArray(orderLocations.orderId, orderIds)) : [];
          const ordersWithLocations = paginatedOrders.map((order) => {
            const locs = orderLocationsResult.filter((row) => row.ol.orderId === order.id).map((row) => ({ ...row.ol, location: row.loc }));
            return {
              ...order,
              locations: locs
            };
          });
          return {
            data: ordersWithLocations,
            pagination: {
              page,
              pageSize,
              totalItems,
              totalPages
            }
          };
        });
      }
      async searchOrders(query, includeShipped, pagination) {
        return safeDbOperation("searchOrders", "orders", async () => {
          const page = pagination?.page || 1;
          const pageSize = pagination?.pageSize || 20;
          const offset = (page - 1) * pageSize;
          const searchPattern = `%${query}%`;
          const searchCondition = or(
            like(orders.orderNumber, searchPattern),
            like(orders.client, searchPattern),
            like(orders.tbfosNumber, searchPattern),
            like(orders.description, searchPattern)
          );
          const whereCondition = includeShipped ? searchCondition : and(searchCondition, eq(orders.isShipped, false));
          const countResult = await db.select({ count: sql`count(*)` }).from(orders).where(whereCondition);
          const totalItems = Number(countResult[0].count);
          const totalPages = Math.ceil(totalItems / pageSize);
          const paginatedOrders = await db.select().from(orders).where(whereCondition).orderBy(desc(orders.createdAt)).limit(pageSize).offset(offset);
          const orderIds = paginatedOrders.map((order) => order.id);
          const orderLocationsResult = orderIds.length > 0 ? await db.select({ ol: orderLocations, loc: locations }).from(orderLocations).innerJoin(locations, eq(orderLocations.locationId, locations.id)).where(inArray(orderLocations.orderId, orderIds)) : [];
          const ordersWithLocations = paginatedOrders.map((order) => {
            const locs = orderLocationsResult.filter((row) => row.ol.orderId === order.id).map((row) => ({ ...row.ol, location: row.loc }));
            return {
              ...order,
              locations: locs
            };
          });
          return {
            data: ordersWithLocations,
            pagination: {
              page,
              pageSize,
              totalItems,
              totalPages
            }
          };
        });
      }
      async markOrderAsShipped(id, quantity) {
        return safeDbOperation("markOrderAsShipped", "orders", async () => {
          const [order] = await db.select().from(orders).where(eq(orders.id, id));
          if (!order) {
            throw new NotFoundError(`Order with id ${id} not found`, "order", id);
          }
          const fullyShipped = quantity >= order.totalQuantity;
          const partiallyShipped = quantity > 0 && quantity < order.totalQuantity;
          const [updatedOrder] = await db.update(orders).set({
            isShipped: fullyShipped,
            partiallyShipped,
            shippedQuantity: quantity
          }).where(eq(orders.id, id)).returning();
          return updatedOrder;
        });
      }
      // Order location management
      async createOrderLocation(orderLocationData) {
        return safeDbOperation("createOrderLocation", "orderLocations", async () => {
          const [orderLocation] = await db.insert(orderLocations).values(orderLocationData).returning();
          return orderLocation;
        });
      }
      async updateOrderLocation(id, data) {
        return safeDbOperation("updateOrderLocation", "orderLocations", async () => {
          const [orderLocation] = await db.update(orderLocations).set(data).where(eq(orderLocations.id, id)).returning();
          if (!orderLocation) {
            throw new NotFoundError(`Order location with id ${id} not found`, "orderLocation", id);
          }
          return orderLocation;
        });
      }
      async deleteOrderLocation(id) {
        return safeDbOperation("deleteOrderLocation", "orderLocations", async () => {
          await db.delete(orderLocations).where(eq(orderLocations.id, id));
          return true;
        });
      }
      async getOrderLocation(id) {
        return safeDbOperation("getOrderLocation", "orderLocations", async () => {
          const [orderLocation] = await db.select().from(orderLocations).where(eq(orderLocations.id, id));
          return orderLocation;
        });
      }
      async getOrderLocationsByOrder(orderId) {
        return safeDbOperation("getOrderLocationsByOrder", "orderLocations", async () => {
          return await db.select().from(orderLocations).where(eq(orderLocations.orderId, orderId));
        });
      }
      async getOrderLocationsByLocation(locationId) {
        return safeDbOperation("getOrderLocationsByLocation", "orderLocations", async () => {
          const results = await db.select({ ol: orderLocations, o: orders }).from(orderLocations).innerJoin(orders, eq(orderLocations.orderId, orders.id)).where(and(eq(orderLocations.locationId, locationId), eq(orders.isShipped, false))).orderBy(asc(orderLocations.queuePosition));
          return results.map((r) => ({
            ...r.ol,
            order: r.o
          }));
        });
      }
      async getOrdersForPrimaryLocation(locationId) {
        return safeDbOperation("getOrdersForPrimaryLocation", "locations", async () => {
          logError(
            `Getting orders for primary location ${locationId}`,
            "storage",
            "info"
          );
          const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
          logError(
            `Location isPrimary: ${location?.isPrimary}`,
            "storage",
            "debug"
          );
          if (!location || !location.isPrimary) {
            logError(
              `Location ${locationId} is not a primary location or does not exist`,
              "storage",
              "info"
            );
            return [];
          }
          const activeOrders = await db.select().from(orders).where(
            and(
              eq(orders.isShipped, false),
              eq(orders.isFinished, false)
            )
          );
          logError(
            `Found ${activeOrders.length} active orders`,
            "storage",
            "debug"
          );
          if (activeOrders.length === 0) {
            return [];
          }
          const orderIds = activeOrders.map((order) => order.id);
          const allOrderLocations = await db.select().from(orderLocations).where(inArray(orderLocations.orderId, orderIds));
          logError(
            `Found ${allOrderLocations.length} order location relationships`,
            "storage",
            "debug"
          );
          const orderLocationStatusMap = /* @__PURE__ */ new Map();
          for (const orderLoc of allOrderLocations) {
            if (orderLoc.locationId === locationId) {
              orderLocationStatusMap.set(orderLoc.orderId, orderLoc.status);
            }
          }
          const ordersNeedingThisLocation = activeOrders.filter((order) => {
            const statusAtLocation = orderLocationStatusMap.get(order.id);
            if (statusAtLocation === void 0) {
              logError(
                `Order ${order.orderNumber} (ID: ${order.id}) needs location ${locationId}: no relationship`,
                "storage",
                "debug"
              );
              return true;
            }
            if (statusAtLocation === "not_started") {
              logError(
                `Order ${order.orderNumber} (ID: ${order.id}) needs location ${locationId}: not started yet`,
                "storage",
                "debug"
              );
              return true;
            }
            logError(
              `Order ${order.orderNumber} (ID: ${order.id}) doesn't need location ${locationId}: status is ${statusAtLocation}`,
              "storage",
              "debug"
            );
            return false;
          });
          logError(
            `Found ${ordersNeedingThisLocation.length} orders that need location ${locationId}`,
            "storage",
            "debug"
          );
          return ordersNeedingThisLocation;
        });
      }
      async startOrderAtLocation(orderId, locationId, userId) {
        return safeDbOperation("startOrderAtLocation", "orderLocations", async () => {
          const now = /* @__PURE__ */ new Date();
          const [updatedOrderLocation] = await db.update(orderLocations).set({
            status: "in_progress",
            startedAt: now,
            queuePosition: null
          }).where(
            and(
              eq(orderLocations.orderId, orderId),
              eq(orderLocations.locationId, locationId)
            )
          ).returning();
          if (updatedOrderLocation) {
            await this.createAuditRecord({
              orderId,
              userId,
              locationId,
              action: "started",
              details: `Started processing at location ID ${locationId}`
            });
            await this.updateQueuePositions(locationId);
            await this.queueForNextLocation(orderId, locationId);
          }
          return updatedOrderLocation;
        });
      }
      async finishOrderAtLocation(orderId, locationId, completedQuantity, userId) {
        return safeDbOperation("finishOrderAtLocation", "orderLocations", async () => {
          const now = /* @__PURE__ */ new Date();
          const [updatedOrderLocation] = await db.update(orderLocations).set({
            status: "done",
            completedAt: now,
            completedQuantity,
            queuePosition: null
          }).where(
            and(
              eq(orderLocations.orderId, orderId),
              eq(orderLocations.locationId, locationId)
            )
          ).returning();
          if (updatedOrderLocation) {
            await this.createAuditRecord({
              orderId,
              userId,
              locationId,
              action: "finished",
              details: `Completed processing ${completedQuantity} units at location ID ${locationId}`
            });
            await this.updateQueuePositions(locationId);
            await this.queueForNextLocation(orderId, locationId);
            await this.checkAllLocationsDone(orderId);
          }
          return updatedOrderLocation;
        });
      }
      async pauseOrderAtLocation(orderId, locationId, userId) {
        return safeDbOperation("pauseOrderAtLocation", "orderLocations", async () => {
          const [updatedOrderLocation] = await db.update(orderLocations).set({
            status: "paused"
          }).where(
            and(
              eq(orderLocations.orderId, orderId),
              eq(orderLocations.locationId, locationId)
            )
          ).returning();
          if (updatedOrderLocation) {
            await this.createAuditRecord({
              orderId,
              userId,
              locationId,
              action: "paused",
              details: `Paused processing at location ID ${locationId}`
            });
          }
          return updatedOrderLocation;
        });
      }
      async updateOrderLocationQuantity(orderId, locationId, completedQuantity, userId) {
        return safeDbOperation("updateOrderLocationQuantity", "orderLocations", async () => {
          const [updatedOrderLocation] = await db.update(orderLocations).set({
            completedQuantity
          }).where(
            and(
              eq(orderLocations.orderId, orderId),
              eq(orderLocations.locationId, locationId)
            )
          ).returning();
          if (updatedOrderLocation) {
            await this.createAuditRecord({
              orderId,
              userId,
              locationId,
              action: "updated_quantity",
              details: `Updated completed quantity to ${completedQuantity} at location ID ${locationId}`
            });
          }
          return updatedOrderLocation;
        });
      }
      async getLocationQueue(locationId) {
        return safeDbOperation("getLocationQueue", "orderLocations", async () => {
          const [loc] = await db.select().from(locations).where(eq(locations.id, locationId));
          if (loc && loc.isPrimary && !loc.skipAutoQueue) {
            const candidates = await db.select({ ol: orderLocations, o: orders }).from(orderLocations).innerJoin(orders, eq(orderLocations.orderId, orders.id)).where(
              and(
                eq(orderLocations.locationId, locationId),
                eq(orderLocations.status, "not_started"),
                eq(orders.isShipped, false),
                isNotNull(orders.globalQueuePosition)
              )
            );
            if (candidates.length > 0) {
              const [queueResult] = await db.select({ maxQueue: sql`MAX(${orderLocations.queuePosition})` }).from(orderLocations).where(
                and(
                  eq(orderLocations.locationId, locationId),
                  eq(orderLocations.status, "in_queue")
                )
              );
              let nextQueuePosition = (queueResult?.maxQueue ?? 0) + 1;
              for (const c of candidates) {
                await db.update(orderLocations).set({ status: "in_queue", queuePosition: nextQueuePosition++ }).where(eq(orderLocations.id, c.ol.id));
              }
              await this.updateQueuePositions(locationId);
            }
          }
          const results = await db.select({
            orderLocation: orderLocations,
            order: orders
          }).from(orderLocations).where(
            and(
              eq(orderLocations.locationId, locationId),
              eq(orderLocations.status, "in_queue")
            )
          ).innerJoin(orders, eq(orderLocations.orderId, orders.id)).orderBy(asc(orderLocations.queuePosition));
          return results.filter((item) => !item.order.isShipped).map((item) => ({
            ...item.orderLocation,
            order: item.order
          }));
        });
      }
      async updateQueuePositions(locationId) {
        return safeDbOperation("updateQueuePositions", "orderLocations", async () => {
          const results = await db.select({ ol: orderLocations, o: orders }).from(orderLocations).innerJoin(orders, eq(orderLocations.orderId, orders.id)).where(
            and(
              eq(orderLocations.locationId, locationId),
              eq(orderLocations.status, "in_queue"),
              eq(orders.isShipped, false)
            )
          );
          const sorted = [...results].sort((a, b) => {
            if (a.o.rush && !b.o.rush) return -1;
            if (!a.o.rush && b.o.rush) return 1;
            if (a.o.rush && b.o.rush) {
              const ar = a.o.rushSetAt ? new Date(a.o.rushSetAt).getTime() : 0;
              const br = b.o.rushSetAt ? new Date(b.o.rushSetAt).getTime() : 0;
              if (ar !== br) return ar - br;
            }
            const ag = a.o.globalQueuePosition ?? Number.POSITIVE_INFINITY;
            const bg = b.o.globalQueuePosition ?? Number.POSITIVE_INFINITY;
            if (ag !== bg) return ag - bg;
            const aq = a.ol.queuePosition ?? Number.POSITIVE_INFINITY;
            const bq = b.ol.queuePosition ?? Number.POSITIVE_INFINITY;
            if (aq !== bq) return aq - bq;
            const ac = new Date(a.o.createdAt).getTime();
            const bc = new Date(b.o.createdAt).getTime();
            return bc - ac;
          });
          for (let i = 0; i < sorted.length; i++) {
            await db.update(orderLocations).set({ queuePosition: i + 1 }).where(eq(orderLocations.id, sorted[i].ol.id));
          }
          return true;
        });
      }
      async recalcAllLocationQueues() {
        return safeDbOperation("recalcAllLocationQueues", "orderLocations", async () => {
          const locs = await db.select().from(locations);
          for (const loc of locs) {
            if (loc.isPrimary) {
              const candidates = await db.select({ ol: orderLocations, o: orders }).from(orderLocations).innerJoin(orders, eq(orderLocations.orderId, orders.id)).where(
                and(
                  eq(orderLocations.locationId, loc.id),
                  eq(orderLocations.status, "not_started"),
                  eq(orders.isShipped, false),
                  isNotNull(orders.globalQueuePosition)
                )
              );
              for (const c of candidates) {
                await db.update(orderLocations).set({ status: "in_queue" }).where(eq(orderLocations.id, c.ol.id));
              }
            }
            await this.updateQueuePositions(loc.id);
          }
          return true;
        });
      }
      // Helper method to queue an order for the next location
      async queueForNextLocation(orderId, currentLocationId) {
        return safeDbOperation("queueForNextLocation", "orderLocations", async () => {
          const [currentLocation] = await db.select().from(locations).where(eq(locations.id, currentLocationId));
          if (!currentLocation) return;
          const [nextLocation] = await db.select().from(locations).where(gt(locations.usedOrder, currentLocation.usedOrder)).orderBy(asc(locations.usedOrder));
          if (!nextLocation) return;
          const [existingOrderLocation] = await db.select().from(orderLocations).where(
            and(
              eq(orderLocations.orderId, orderId),
              eq(orderLocations.locationId, nextLocation.id)
            )
          );
          if (existingOrderLocation) {
            if (existingOrderLocation.status === "not_started") {
              const [queueResult] = await db.select({ maxQueue: sql`MAX(queue_position)` }).from(orderLocations).where(
                and(
                  eq(orderLocations.locationId, nextLocation.id),
                  eq(orderLocations.status, "in_queue")
                )
              );
              const nextQueuePosition = (queueResult?.maxQueue ?? 0) + 1;
              await db.update(orderLocations).set({
                status: "in_queue",
                queuePosition: nextQueuePosition
              }).where(eq(orderLocations.id, existingOrderLocation.id));
            }
          } else {
            const [queueResult] = await db.select({ maxQueue: sql`MAX(queue_position)` }).from(orderLocations).where(
              and(
                eq(orderLocations.locationId, nextLocation.id),
                eq(orderLocations.status, "in_queue")
              )
            );
            const nextQueuePosition = (queueResult?.maxQueue ?? 0) + 1;
            await db.insert(orderLocations).values({
              orderId,
              locationId: nextLocation.id,
              status: "in_queue",
              queuePosition: nextQueuePosition,
              completedQuantity: 0
            });
          }
        });
      }
      // Helper method to check if all locations for an order are done
      async checkAllLocationsDone(orderId) {
        return safeDbOperation("checkAllLocationsDone", "orderLocations", async () => {
          const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
          if (!order) return;
          const orderLocationsData = await db.select().from(orderLocations).where(eq(orderLocations.orderId, orderId));
          const allDone = orderLocationsData.every((ol) => ol.status === "done");
          if (allDone && !order.isFinished) {
            await db.update(orders).set({ isFinished: true }).where(eq(orders.id, orderId));
          }
        });
      }
      // Audit trail
      async createAuditRecord(auditData) {
        return safeDbOperation("createAuditRecord", "auditTrail", async () => {
          const [audit] = await db.insert(auditTrail).values(auditData).returning();
          return audit;
        });
      }
      async getAuditTrailForOrder(orderId) {
        return safeDbOperation("getAuditTrailForOrder", "auditTrail", async () => {
          return await db.select().from(auditTrail).where(eq(auditTrail.orderId, orderId)).orderBy(desc(auditTrail.createdAt));
        });
      }
      async getAllAuditTrail(limitOrPagination) {
        return safeDbOperation("getAllAuditTrail", "auditTrail", async () => {
          if (typeof limitOrPagination === "number") {
            const limit = limitOrPagination;
            const results = await db.select().from(auditTrail).innerJoin(orders, eq(auditTrail.orderId, orders.id)).leftJoin(users, eq(auditTrail.userId, users.id)).leftJoin(locations, eq(auditTrail.locationId, locations.id)).orderBy(desc(auditTrail.createdAt)).limit(limit);
            return results.map((r) => ({
              ...r.audit_trail,
              order: r.orders,
              user: r.users ?? void 0,
              location: r.locations ?? void 0
            }));
          } else {
            const pagination = limitOrPagination || { page: 1, pageSize: 100 };
            const page = pagination?.page || 1;
            const pageSize = pagination?.pageSize || 100;
            const offset = (page - 1) * pageSize;
            const [countResult] = await db.select({ count: sql`count(*)` }).from(auditTrail);
            const totalItems = Number(countResult?.count || 0);
            const totalPages = Math.ceil(totalItems / pageSize);
            const results = await db.select().from(auditTrail).innerJoin(orders, eq(auditTrail.orderId, orders.id)).leftJoin(users, eq(auditTrail.userId, users.id)).leftJoin(locations, eq(auditTrail.locationId, locations.id)).orderBy(desc(auditTrail.createdAt)).limit(pageSize).offset(offset);
            const data = results.map((r) => ({
              ...r.audit_trail,
              order: r.orders,
              user: r.users ?? void 0,
              location: r.locations ?? void 0
            }));
            return {
              data,
              pagination: {
                page,
                pageSize,
                totalItems,
                totalPages
              }
            };
          }
        });
      }
      // Help requests
      async createHelpRequest(helpRequestData) {
        return safeDbOperation("createHelpRequest", "helpRequests", async () => {
          const [helpRequest] = await db.insert(helpRequests).values(helpRequestData).returning();
          return helpRequest;
        });
      }
      async resolveHelpRequest(id) {
        return safeDbOperation("resolveHelpRequest", "helpRequests", async () => {
          const now = /* @__PURE__ */ new Date();
          const [helpRequest] = await db.update(helpRequests).set({
            isResolved: true,
            resolvedAt: now
          }).where(eq(helpRequests.id, id)).returning();
          return helpRequest;
        });
      }
      async getActiveHelpRequests() {
        return safeDbOperation("getActiveHelpRequests", "helpRequests", async () => {
          const results = await db.select({ hr: helpRequests, o: orders, l: locations, u: users }).from(helpRequests).innerJoin(orders, eq(helpRequests.orderId, orders.id)).innerJoin(locations, eq(helpRequests.locationId, locations.id)).innerJoin(users, eq(helpRequests.userId, users.id)).where(eq(helpRequests.isResolved, false)).orderBy(desc(helpRequests.createdAt));
          return results.map((r) => ({
            ...r.hr,
            order: r.o,
            location: r.l,
            user: r.u
          }));
        });
      }
      // Email settings
      async addEmailSetting(emailSettingData) {
        return safeDbOperation("addEmailSetting", "emailSettings", async () => {
          const [emailSetting] = await db.insert(emailSettings).values(emailSettingData).returning();
          return emailSetting;
        });
      }
      async updateEmailSetting(id, data) {
        return safeDbOperation("updateEmailSetting", "emailSettings", async () => {
          const [emailSetting] = await db.update(emailSettings).set(data).where(eq(emailSettings.id, id)).returning();
          if (!emailSetting) {
            throw new NotFoundError(`Email setting with id ${id} not found`, "emailSetting", id);
          }
          return emailSetting;
        });
      }
      async deleteEmailSetting(id) {
        return safeDbOperation("deleteEmailSetting", "emailSettings", async () => {
          await db.delete(emailSettings).where(eq(emailSettings.id, id));
          return true;
        });
      }
      async getEmailsForShipping() {
        return safeDbOperation("getEmailsForShipping", "emailSettings", async () => {
          return await db.select().from(emailSettings).where(eq(emailSettings.forShipping, true));
        });
      }
      async getEmailsForHelp() {
        return safeDbOperation("getEmailsForHelp", "emailSettings", async () => {
          return await db.select().from(emailSettings).where(eq(emailSettings.forHelp, true));
        });
      }
      async getAllEmailSettings() {
        return safeDbOperation("getAllEmailSettings", "emailSettings", async () => {
          return await db.select().from(emailSettings);
        });
      }
      // PDF settings
      async getPdfSettings() {
        return safeDbOperation("getPdfSettings", "pdfSettings", async () => {
          const [settings] = await db.select().from(pdfSettings).limit(1);
          return settings;
        });
      }
      async updatePdfSettings(data) {
        return safeDbOperation("updatePdfSettings", "pdfSettings", async () => {
          const existing = await this.getPdfSettings();
          if (existing) {
            const [updated] = await db.update(pdfSettings).set(data).where(eq(pdfSettings.id, existing.id)).returning();
            return updated;
          } else {
            const [created] = await db.insert(pdfSettings).values(data).returning();
            return created;
          }
        });
      }
      // Laser System - RFID Card Management
      async getRfidCardByCardId(cardId) {
        return safeDbOperation("getRfidCardByCardId", "rfidCards", async () => {
          const result = await db.select({
            rfidCard: rfidCards,
            user: users
          }).from(rfidCards).innerJoin(users, eq(rfidCards.userId, users.id)).where(eq(rfidCards.cardId, cardId));
          if (result.length === 0) {
            return void 0;
          }
          return {
            ...result[0].rfidCard,
            user: result[0].user
          };
        });
      }
      async createRfidCard(rfidCard) {
        return safeDbOperation("createRfidCard", "rfidCards", async () => {
          const [result] = await db.insert(rfidCards).values(rfidCard).returning();
          return result;
        });
      }
      async updateRfidCard(cardId, data) {
        return safeDbOperation("updateRfidCard", "rfidCards", async () => {
          const [result] = await db.update(rfidCards).set(data).where(eq(rfidCards.cardId, cardId)).returning();
          if (!result) {
            throw new NotFoundError(`RFID card with id ${cardId} not found`, "rfidCard", cardId);
          }
          return result;
        });
      }
      async deleteRfidCard(cardId) {
        return safeDbOperation("deleteRfidCard", "rfidCards", async () => {
          await db.delete(rfidCards).where(eq(rfidCards.cardId, cardId));
          return true;
        });
      }
      async getAllRfidCards() {
        return safeDbOperation("getAllRfidCards", "rfidCards", async () => {
          const results = await db.select({
            rfidCard: rfidCards,
            user: users
          }).from(rfidCards).innerJoin(users, eq(rfidCards.userId, users.id));
          return results.map((r) => ({
            ...r.rfidCard,
            user: r.user
          }));
        });
      }
      // Laser System - Access Levels
      async getAccessLevel(userId, machineId) {
        return safeDbOperation("getAccessLevel", "accessLevels", async () => {
          const [result] = await db.select().from(accessLevels).where(
            and(
              eq(accessLevels.userId, userId),
              eq(accessLevels.machineId, machineId)
            )
          );
          return result;
        });
      }
      async createAccessLevel(accessLevel) {
        return safeDbOperation("createAccessLevel", "accessLevels", async () => {
          const [result] = await db.insert(accessLevels).values(accessLevel).returning();
          return result;
        });
      }
      async updateAccessLevel(id, data) {
        return safeDbOperation("updateAccessLevel", "accessLevels", async () => {
          const [result] = await db.update(accessLevels).set(data).where(eq(accessLevels.id, id)).returning();
          if (!result) {
            throw new NotFoundError(`Access level with id ${id} not found`, "accessLevel", id);
          }
          return result;
        });
      }
      async deleteAccessLevel(id) {
        return safeDbOperation("deleteAccessLevel", "accessLevels", async () => {
          await db.delete(accessLevels).where(eq(accessLevels.id, id));
          return true;
        });
      }
      async getAllAccessLevels() {
        return safeDbOperation("getAllAccessLevels", "accessLevels", async () => {
          const results = await db.select({
            accessLevel: accessLevels,
            user: users
          }).from(accessLevels).innerJoin(users, eq(accessLevels.userId, users.id));
          return results.map((r) => ({
            ...r.accessLevel,
            user: r.user
          }));
        });
      }
      // Laser System - Access Logs
      async createAccessLog(accessLog) {
        return safeDbOperation("createAccessLog", "accessLogs", async () => {
          const [result] = await db.insert(accessLogs).values(accessLog).returning();
          return result;
        });
      }
      async getAccessLogsByUser(userId) {
        return safeDbOperation("getAccessLogsByUser", "accessLogs", async () => {
          return await db.select().from(accessLogs).where(eq(accessLogs.userId, userId));
        });
      }
      async getAccessLogsByMachine(machineId) {
        return safeDbOperation("getAccessLogsByMachine", "accessLogs", async () => {
          return await db.select().from(accessLogs).where(eq(accessLogs.machineId, machineId));
        });
      }
      async getRecentAccessLogs(limitOrPagination) {
        return safeDbOperation("getRecentAccessLogs", "accessLogs", async () => {
          if (typeof limitOrPagination === "number") {
            const limit = limitOrPagination;
            const results = await db.select({
              accessLog: accessLogs,
              user: users
            }).from(accessLogs).innerJoin(users, eq(accessLogs.userId, users.id)).orderBy(desc(accessLogs.timestamp)).limit(limit);
            return results.map((r) => ({
              ...r.accessLog,
              user: r.user
            }));
          } else {
            const pagination = limitOrPagination;
            const [countResult] = await db.select({ count: sql`count(*)` }).from(accessLogs);
            const totalItems = countResult?.count || 0;
            const pageSize = pagination?.pageSize || 50;
            const totalPages = Math.ceil(totalItems / pageSize);
            const currentPage = pagination?.page || 1;
            const results = await db.select({
              accessLog: accessLogs,
              user: users
            }).from(accessLogs).innerJoin(users, eq(accessLogs.userId, users.id)).orderBy(desc(accessLogs.timestamp)).limit(pageSize).offset((currentPage - 1) * pageSize);
            const data = results.map((r) => ({
              ...r.accessLog,
              user: r.user
            }));
            return {
              data,
              pagination: {
                page: currentPage,
                pageSize,
                totalItems,
                totalPages
              }
            };
          }
        });
      }
      // Machine Alerts (Bidirectional communication)
      async createMachineAlert(alert) {
        return safeDbOperation("createMachineAlert", "machineAlerts", async () => {
          const [result] = await db.insert(machineAlerts).values(alert).returning();
          return result;
        });
      }
      async getMachineAlert(id) {
        return safeDbOperation("getMachineAlert", "machineAlerts", async () => {
          const [result] = await db.select().from(machineAlerts).where(eq(machineAlerts.id, id));
          return result;
        });
      }
      async updateMachineAlert(id, data) {
        return safeDbOperation("updateMachineAlert", "machineAlerts", async () => {
          const [result] = await db.update(machineAlerts).set(data).where(eq(machineAlerts.id, id)).returning();
          if (!result) {
            throw new NotFoundError(`Machine alert with id ${id} not found`, "machineAlert", id);
          }
          return result;
        });
      }
      async getPendingMachineAlerts() {
        return safeDbOperation("getPendingMachineAlerts", "machineAlerts", async () => {
          const results = await db.select({
            machineAlert: machineAlerts,
            user: users
          }).from(machineAlerts).where(ne(machineAlerts.status, "resolved")).leftJoin(users, eq(machineAlerts.senderId, users.id));
          return results.map((r) => ({
            ...r.machineAlert,
            sender: r.user ?? void 0
          }));
        });
      }
      async getMachineAlertsByMachine(machineId) {
        return safeDbOperation("getMachineAlertsByMachine", "machineAlerts", async () => {
          return await db.select().from(machineAlerts).where(eq(machineAlerts.machineId, machineId));
        });
      }
      async getAllMachineAlerts() {
        return safeDbOperation("getAllMachineAlerts", "machineAlerts", async () => {
          const results = await db.select({ machineAlert: machineAlerts, user: users }).from(machineAlerts).leftJoin(users, eq(machineAlerts.senderId, users.id)).orderBy(desc(machineAlerts.createdAt));
          return results.map((r) => ({ ...r.machineAlert, sender: r.user ?? void 0 }));
        });
      }
      async resolveMachineAlert(id, userId) {
        return safeDbOperation("resolveMachineAlert", "machineAlerts", async () => {
          const now = /* @__PURE__ */ new Date();
          const [result] = await db.update(machineAlerts).set({
            status: "resolved",
            resolvedAt: now,
            resolvedById: userId
          }).where(eq(machineAlerts.id, id)).returning();
          return result;
        });
      }
      async acknowledgeMachineAlert(id) {
        return safeDbOperation("acknowledgeMachineAlert", "machineAlerts", async () => {
          const [result] = await db.update(machineAlerts).set({
            status: "acknowledged"
          }).where(eq(machineAlerts.id, id)).returning();
          return result;
        });
      }
      // Help Requests history
      async getAllHelpRequests() {
        return safeDbOperation("getAllHelpRequests", "helpRequests", async () => {
          const rows = await db.select({ hr: helpRequests, o: orders, l: locations, u: users }).from(helpRequests).innerJoin(orders, eq(helpRequests.orderId, orders.id)).innerJoin(locations, eq(helpRequests.locationId, locations.id)).innerJoin(users, eq(helpRequests.userId, users.id)).orderBy(desc(helpRequests.createdAt));
          return rows.map((r) => ({ ...r.hr, order: r.o, location: r.l, user: r.u }));
        });
      }
      // API Configuration
      async getApiConfig() {
        return safeDbOperation("getApiConfig", "apiConfigs", async () => {
          const [result] = await db.select().from(apiConfigs).limit(1);
          return result;
        });
      }
      async updateApiConfig(config) {
        return safeDbOperation("updateApiConfig", "apiConfigs", async () => {
          const existingConfig = await db.select().from(apiConfigs).limit(1);
          if (existingConfig && existingConfig.length > 0) {
            const [updatedConfig] = await db.update(apiConfigs).set({
              ...config,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(apiConfigs.id, existingConfig[0].id)).returning();
            return updatedConfig;
          } else {
            const [newConfig] = await db.insert(apiConfigs).values({
              ...config,
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date()
            }).returning();
            return newConfig;
          }
        });
      }
    };
    storage = new SQLiteStorage();
  }
});

// server/sync.ts
var sync_exports = {};
__export(sync_exports, {
  syncManager: () => syncManager
});
import fetch2 from "node-fetch";
async function withRetry(fn, retries = 3, delay = 1e3, retryCondition) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (!retryCondition || retryCondition(error))) {
      logError(`Retrying operation after error: ${error}. Retries left: ${retries}`, "sync", "warn");
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2, retryCondition);
    }
    throw error;
  }
}
var SyncManager, syncManager;
var init_sync = __esm({
  async "server/sync.ts"() {
    "use strict";
    await init_storage();
    await init_utils();
    SyncManager = class {
      syncErrors = [];
      isSyncing = false;
      lastSyncTime = null;
      syncIntervalId = null;
      maxRetries = 3;
      async initialize() {
        logError("Initializing sync manager", "sync", "info");
        try {
          const config = await storage.getApiConfig();
          if (config && config.syncEnabled) {
            this.startSync(config.syncInterval);
          }
        } catch (error) {
          logError(`Error initializing sync manager: ${error}`, "sync", "error");
        }
      }
      startSync(intervalMinutes) {
        if (this.syncIntervalId) {
          clearInterval(this.syncIntervalId);
        }
        logError(`Starting sync with interval of ${intervalMinutes} minutes`, "sync", "info");
        this.performSync().catch((error) => {
          logError(`Error during initial sync: ${error}`, "sync", "error");
        });
        const intervalMs = intervalMinutes * 60 * 1e3;
        this.syncIntervalId = setInterval(() => {
          this.performSync().catch((error) => {
            logError(`Error during scheduled sync: ${error}`, "sync", "error");
          });
        }, intervalMs);
      }
      stopSync() {
        if (this.syncIntervalId) {
          clearInterval(this.syncIntervalId);
          this.syncIntervalId = null;
          logError("Sync stopped", "sync", "info");
        }
      }
      async performSync() {
        if (this.isSyncing) {
          logError("Sync already in progress, skipping", "sync", "info");
          return;
        }
        this.isSyncing = true;
        try {
          logError("Starting sync process", "sync", "info");
          const config = await storage.getApiConfig();
          if (!config || !config.syncEnabled) {
            logError("Sync is disabled or no config found", "sync", "info");
            this.isSyncing = false;
            return;
          }
          if (!config.shopMonitorApiKey || !config.shopMonitorApiUrl) {
            this.addSyncError({
              timestamp: /* @__PURE__ */ new Date(),
              message: "Missing API key or URL in configuration",
              endpoint: "N/A"
            });
            logError("Missing API key or URL, cannot sync", "sync", "error");
            this.isSyncing = false;
            return;
          }
          if (config.pushUserData) {
            await withRetry(
              () => this.pushUsers(config.shopMonitorApiUrl, config.shopMonitorApiKey),
              this.maxRetries
            );
          }
          if (config.pushLocationData) {
            await withRetry(
              () => this.pushLocations(config.shopMonitorApiUrl, config.shopMonitorApiKey),
              this.maxRetries
            );
          }
          if (config.pushMachineData) {
            await withRetry(
              () => this.pushMachines(config.shopMonitorApiUrl, config.shopMonitorApiKey),
              this.maxRetries
            );
          }
          if (config.pullAccessLogs) {
            await withRetry(
              () => this.pullAccessLogs(config.shopMonitorApiUrl, config.shopMonitorApiKey),
              this.maxRetries
            );
          }
          if (config.alertsEnabled) {
            await withRetry(
              () => this.pullAlerts(config.shopMonitorApiUrl, config.shopMonitorApiKey),
              this.maxRetries
            );
          }
          this.lastSyncTime = /* @__PURE__ */ new Date();
          logError(`Sync completed successfully at ${this.lastSyncTime.toISOString()}`, "sync", "info");
        } catch (error) {
          this.addSyncError({
            timestamp: /* @__PURE__ */ new Date(),
            message: `Unhandled error during sync: ${error}`,
            endpoint: "general"
          });
          logError(`Unhandled error during sync: ${error}`, "sync", "error");
        } finally {
          this.isSyncing = false;
        }
      }
      async pushUsers(apiUrl, apiKey) {
        try {
          logError("Pushing users to ShopMonitor", "sync", "info");
          const users2 = await storage.getAllUsers();
          const sanitizedUsers = users2.map((user) => {
            const { password, ...safeUser } = user;
            return safeUser;
          });
          const response = await fetch2(`${apiUrl}/api/sync/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey
            },
            body: JSON.stringify(sanitizedUsers)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new SyncError(
              `HTTP error ${response.status}: ${errorText}`,
              "pushUsers",
              `${apiUrl}/api/sync/users`,
              response.status
            );
          }
          logError(`Successfully pushed ${sanitizedUsers.length} users`, "sync", "info");
        } catch (error) {
          this.addSyncError({
            timestamp: /* @__PURE__ */ new Date(),
            message: `Error pushing users: ${error}`,
            endpoint: `${apiUrl}/api/sync/users`
          });
          logError(`Error pushing users: ${error}`, "sync", "error");
          throw error;
        }
      }
      async pushLocations(apiUrl, apiKey) {
        try {
          logError("Pushing locations to ShopMonitor", "sync", "info");
          const locations2 = await storage.getAllLocations();
          const response = await fetch2(`${apiUrl}/api/sync/locations`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey
            },
            body: JSON.stringify(locations2)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new SyncError(
              `HTTP error ${response.status}: ${errorText}`,
              "pushLocations",
              `${apiUrl}/api/sync/locations`,
              response.status
            );
          }
          logError(`Successfully pushed ${locations2.length} locations`, "sync", "info");
        } catch (error) {
          this.addSyncError({
            timestamp: /* @__PURE__ */ new Date(),
            message: `Error pushing locations: ${error}`,
            endpoint: `${apiUrl}/api/sync/locations`
          });
          logError(`Error pushing locations: ${error}`, "sync", "error");
          throw error;
        }
      }
      async pushMachines(apiUrl, apiKey) {
        try {
          logError("Pushing machines to ShopMonitor", "sync", "info");
          const machines2 = await storage.getAllMachines();
          const response = await fetch2(`${apiUrl}/api/sync/machines`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey
            },
            body: JSON.stringify(machines2)
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new SyncError(
              `HTTP error ${response.status}: ${errorText}`,
              "pushMachines",
              `${apiUrl}/api/sync/machines`,
              response.status
            );
          }
          logError(`Successfully pushed ${machines2.length} machines`, "sync", "info");
        } catch (error) {
          this.addSyncError({
            timestamp: /* @__PURE__ */ new Date(),
            message: `Error pushing machines: ${error}`,
            endpoint: `${apiUrl}/api/sync/machines`
          });
          logError(`Error pushing machines: ${error}`, "sync", "error");
          throw error;
        }
      }
      async pullAccessLogs(apiUrl, apiKey) {
        try {
          logError("Pulling access logs from ShopMonitor", "sync", "info");
          const recentLogs = await storage.getRecentAccessLogs(1);
          const lastTimestamp = recentLogs.length > 0 ? recentLogs[0].timestamp.toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
          const url = `${apiUrl}/api/sync/access-logs?since=${encodeURIComponent(lastTimestamp)}`;
          logError(`Fetching logs since: ${lastTimestamp}`, "sync", "info");
          const response = await fetch2(url, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "x-api-key": apiKey
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new SyncError(
              `HTTP error ${response.status}: ${errorText}`,
              "pullAccessLogs",
              url,
              response.status
            );
          }
          let accessLogs2;
          try {
            accessLogs2 = await response.json();
          } catch (parseError) {
            throw new SyncError(
              `Error parsing JSON response: ${parseError}`,
              "pullAccessLogs",
              url
            );
          }
          logError(`Fetched ${accessLogs2.length} access logs to import`, "sync", "info");
          if (!Array.isArray(accessLogs2)) {
            throw new SyncError(
              `Invalid response format, expected array but got: ${typeof accessLogs2}`,
              "pullAccessLogs",
              url
            );
          }
          const batchSize = 50;
          let importedCount = 0;
          let errorCount = 0;
          for (let i = 0; i < accessLogs2.length; i += batchSize) {
            const batch = accessLogs2.slice(i, i + batchSize);
            for (const log2 of batch) {
              try {
                if (!log2.machineId || !log2.userId && !log2.cardId) {
                  logError(
                    `Skipping invalid log entry: missing required fields. machineId: ${log2.machineId}, userId: ${log2.userId}, cardId: ${log2.cardId}`,
                    "sync",
                    "warn"
                  );
                  errorCount++;
                  continue;
                }
                if (typeof log2.timestamp === "string") {
                  log2.timestamp = new Date(log2.timestamp);
                } else if (typeof log2.timestamp === "number") {
                  log2.timestamp = new Date(log2.timestamp);
                } else if (!log2.timestamp) {
                  log2.timestamp = /* @__PURE__ */ new Date();
                }
                await withRetry(() => storage.createAccessLog(log2), 3, 500);
                importedCount++;
              } catch (err) {
                errorCount++;
                logError(`Error importing access log: ${err}`, "sync", "error");
              }
            }
            if (i + batchSize < accessLogs2.length) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
          logError(`Successfully imported ${importedCount} access logs. Errors: ${errorCount}`, "sync", "info");
          if (errorCount > 0) {
            this.addSyncError({
              timestamp: /* @__PURE__ */ new Date(),
              message: `Completed access log sync with ${errorCount} errors out of ${accessLogs2.length} records`,
              endpoint: url
            });
          }
        } catch (error) {
          this.addSyncError({
            timestamp: /* @__PURE__ */ new Date(),
            message: `Error pulling access logs: ${error}`,
            endpoint: `${apiUrl}/api/sync/access-logs`
          });
          logError(`Error pulling access logs: ${error}`, "sync", "error");
          throw error;
        }
      }
      async pullAlerts(apiUrl, apiKey) {
        try {
          logError("Pulling alerts from ShopMonitor", "sync", "info");
          const response = await fetch2(`${apiUrl}/api/sync/alerts`, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "x-api-key": apiKey
            }
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new SyncError(
              `HTTP error ${response.status}: ${errorText}`,
              "pullAlerts",
              `${apiUrl}/api/sync/alerts`,
              response.status
            );
          }
          let alerts;
          try {
            alerts = await response.json();
          } catch (parseError) {
            throw new SyncError(
              `Error parsing JSON response: ${parseError}`,
              "pullAlerts",
              `${apiUrl}/api/sync/alerts`
            );
          }
          if (!Array.isArray(alerts)) {
            throw new SyncError(
              `Invalid response format, expected array but got: ${typeof alerts}`,
              "pullAlerts",
              `${apiUrl}/api/sync/alerts`
            );
          }
          logError(`Fetched ${alerts.length} alerts to import`, "sync", "info");
          let importedCount = 0;
          let errorCount = 0;
          for (const alert of alerts) {
            try {
              await storage.createMachineAlert({
                ...alert,
                origin: "machine"
              });
              importedCount++;
            } catch (err) {
              errorCount++;
              logError(`Error importing alert: ${err}`, "sync", "error");
            }
          }
          await fetch2(`${apiUrl}/api/sync/alerts/acknowledge`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey
            }
          });
          logError(`Successfully imported ${importedCount} alerts. Errors: ${errorCount}`, "sync", "info");
          if (errorCount > 0) {
            this.addSyncError({
              timestamp: /* @__PURE__ */ new Date(),
              message: `Completed alert sync with ${errorCount} errors out of ${alerts.length} records`,
              endpoint: `${apiUrl}/api/sync/alerts`
            });
          }
        } catch (error) {
          this.addSyncError({
            timestamp: /* @__PURE__ */ new Date(),
            message: `Error pulling alerts: ${error}`,
            endpoint: `${apiUrl}/api/sync/alerts`
          });
          logError(`Error pulling alerts: ${error}`, "sync", "error");
          throw error;
        }
      }
      addSyncError(error) {
        this.syncErrors.push(error);
        if (this.syncErrors.length > 100) {
          this.syncErrors.shift();
        }
      }
      getLastSyncTime() {
        return this.lastSyncTime;
      }
      getSyncErrors() {
        return [...this.syncErrors];
      }
      getStatus() {
        return {
          isSyncing: this.isSyncing,
          lastSyncTime: this.lastSyncTime,
          syncErrors: this.getSyncErrors()
        };
      }
    };
    syncManager = new SyncManager();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
await init_storage();
import { createServer } from "http";

// server/auth.ts
await init_storage();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
async function ensureDefaultAdmin() {
  try {
    const users2 = await storage.getAllUsers();
    if (users2.length === 0) {
      console.log("No users found. Creating default admin user...");
      await storage.createUser({
        username: "admin",
        password: await hashPassword("Pigfloors"),
        fullName: "Admin User",
        role: "admin",
        email: "",
        rfidNumber: ""
      });
      console.log("Default admin user created successfully.");
    }
  } catch (error) {
    console.error("Error creating default admin user:", error);
  }
}
async function setupAuth(app2) {
  await ensureDefaultAdmin();
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "shop-workshop-management-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser({
        ...req.body,
        role: "shop",
        active: 1,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}

// server/routes.ts
init_db();
init_schema();
await init_utils();
import { z as z2 } from "zod";
import { eq as eq2, and as and2 } from "drizzle-orm";
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    message: "Unauthorized: Authentication required",
    errorType: "auth_error"
  });
};
var roleRank = { shop: 1, office: 2, manager: 3, admin: 4 };
var isRoleAtLeast = (minRole) => (req, res, next) => {
  if (req.isAuthenticated() && roleRank[req.user.role] >= roleRank[minRole]) return next();
  res.status(403).json({ message: `Forbidden: ${minRole} role required`, errorType: "permission_error" });
};
var isAdmin = isRoleAtLeast("admin");
var apiErrorHandler = (err, req, res, next) => {
  const errorResponse = formatErrorResponse(err);
  logError(err, "api");
  res.status(errorResponse.statusCode).json({
    message: errorResponse.message,
    errorType: errorResponse.errorType,
    details: errorResponse.details
  });
};
async function registerRoutes(app2) {
  await setupAuth(app2);
  app2.use(apiErrorHandler);
  app2.get("/api/health", (_req, res) => {
    res.json({ message: "ShopTracker API is running" });
  });
  app2.post("/api/dev/reset-users", async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "development") {
        throw new ValidationError("This endpoint is only available in development mode");
      }
      await storage.resetUsers();
      await setupAuth(app2);
      res.json({ message: "Users table reset, default admin recreated" });
    } catch (error) {
      next(error);
    }
  });
  await setupAuth(app2);
  app2.post("/api/auth", async (req, res, next) => {
    try {
      const authRequest = laserAuthRequestSchema.parse(req.body);
      const { card_id, machine_id } = authRequest;
      const rfidCard = await storage.getRfidCardByCardId(card_id);
      if (!rfidCard) {
        await storage.createAccessLog({
          userId: null,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: false,
          reason: "Card not registered",
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.json({
          success: false,
          message: "Access denied: Card not registered",
          machine_id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (!rfidCard.user) {
        await storage.createAccessLog({
          userId: null,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: false,
          reason: "Card not associated with user",
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.json({
          success: false,
          message: "Access denied: Card not associated with user",
          machine_id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const accessLevel = await storage.getAccessLevel(rfidCard.user.id, machine_id);
      if (rfidCard.user.role === "admin" || accessLevel) {
        await storage.createAccessLog({
          userId: rfidCard.user.id,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: true,
          reason: rfidCard.user.role === "admin" ? "Admin access" : "Authorized access",
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.json({
          success: true,
          user: {
            id: rfidCard.user.id,
            username: rfidCard.user.username,
            fullName: rfidCard.user.fullName,
            role: rfidCard.user.role
          },
          access_level: rfidCard.user.role === "admin" ? "admin" : accessLevel?.accessLevel || "user",
          machine_id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        await storage.createAccessLog({
          userId: rfidCard.user.id,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: false,
          reason: "No access level for this machine",
          timestamp: /* @__PURE__ */ new Date()
        });
        return res.json({
          success: false,
          message: "Access denied: Not authorized for this machine",
          machine_id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (error) {
      console.error("Laser auth error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request format",
          errorType: "validation_error",
          errors: error.errors
        });
      }
      next(error);
    }
  });
  app2.get("/api/users", isRoleAtLeast("manager"), async (req, res, next) => {
    try {
      const users2 = await storage.getAllUsers();
      const usersWithoutPasswords = users2.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/users/:id", isRoleAtLeast("manager"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid user ID format", ["id"]);
      }
      const userData = req.body;
      if (userData.role && roleRank[userData.role] > roleRank[req.user.role]) {
        return res.status(403).json({ message: "Cannot assign a role higher than your own" });
      }
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        throw new NotFoundError(`User with ID ${id} not found`, "user", id);
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/users/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid user ID format", ["id"]);
      }
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/users", isRoleAtLeast("manager"), async (req, res, next) => {
    try {
      const data = req.body;
      if (!data.username || !data.password || !data.fullName) {
        return res.status(400).json({ message: "username, fullName, and password are required" });
      }
      const callerRole = req.user.role;
      let role = data.role || "shop";
      if (roleRank[role] > roleRank[callerRole]) role = callerRole;
      const userToCreate = { ...data, role, password: await hashPassword(data.password) };
      const created = await storage.createUser(userToCreate);
      const { password, ...safeUser } = created;
      res.status(201).json(safeUser);
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/user/notification-preferences", isAuthenticated, async (req, res, next) => {
    try {
      const preferencesData = notificationPreferencesSchema.parse(req.body);
      if (!req.user?.id) {
        throw new ValidationError("User ID not available in request");
      }
      const userUpdateData = {
        enableSoundNotifications: preferencesData.enableSoundNotifications ? 1 : 0,
        enableVisualNotifications: preferencesData.enableVisualNotifications ? 1 : 0,
        notificationSound: preferencesData.notificationSound,
        orderCompletedNotifications: preferencesData.orderCompletedNotifications ? 1 : 0,
        orderStartedNotifications: preferencesData.orderStartedNotifications ? 1 : 0,
        helpRequestNotifications: preferencesData.helpRequestNotifications ? 1 : 0
      };
      const updatedUser = await storage.updateUser(req.user.id, userUpdateData);
      if (!updatedUser) {
        throw new NotFoundError(`User with ID ${req.user.id} not found`, "user", req.user.id);
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid notification preferences data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.post("/api/user/notifications/seen", isAuthenticated, async (req, res, next) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const updated = await storage.updateUser(req.user.id, { notificationsLastSeenAt: now });
      if (!updated) {
        throw new NotFoundError(`User with ID ${req.user.id} not found`, "user", req.user.id);
      }
      res.json({ ok: true, notificationsLastSeenAt: now });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/locations", isAuthenticated, async (req, res, next) => {
    try {
      const locations2 = await storage.getLocationsByOrder();
      res.json(locations2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/locations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid location ID format", ["id"]);
      }
      const location = await storage.getLocation(id);
      if (!location) {
        throw new NotFoundError(`Location with ID ${id} not found`, "location", id);
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      next(error);
    }
  });
  app2.post("/api/locations", isAdmin, async (req, res, next) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid location data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/locations/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid location ID format", ["id"]);
      }
      const locationData = req.body;
      const updatedLocation = await storage.updateLocation(id, locationData);
      if (!updatedLocation) {
        throw new NotFoundError(`Location with ID ${id} not found`, "location", id);
      }
      res.json(updatedLocation);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/locations/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid location ID format", ["id"]);
      }
      await storage.deleteLocation(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/machines", isAuthenticated, async (req, res, next) => {
    try {
      const machines2 = await storage.getAllMachines();
      res.json(machines2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/machines/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      const machines2 = await storage.getMachinesByLocation(locationId);
      res.json(machines2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/machines/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid machine ID format", ["id"]);
      }
      const machine = await storage.getMachine(id);
      if (!machine) {
        throw new NotFoundError(`Machine with ID ${id} not found`, "machine", id);
      }
      res.json(machine);
    } catch (error) {
      console.error("Error fetching machine:", error);
      next(error);
    }
  });
  app2.post("/api/machines", isAdmin, async (req, res, next) => {
    try {
      const machineData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(machineData);
      res.status(201).json(machine);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid machine data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/machines/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid machine ID format", ["id"]);
      }
      const machineData = req.body;
      const updatedMachine = await storage.updateMachine(id, machineData);
      if (!updatedMachine) {
        throw new NotFoundError(`Machine with ID ${id} not found`, "machine", id);
      }
      res.json(updatedMachine);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/machines/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid machine ID format", ["id"]);
      }
      await storage.deleteMachine(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/machine-permissions", isAdmin, async (req, res, next) => {
    try {
      const permissionData = insertMachinePermissionSchema.parse(req.body);
      const permission = await storage.addMachinePermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid permission data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.get("/api/assignments/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      const assignments = await storage.getAssignmentsForLocation(locationId);
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/assignments/machine/:machineId", isAuthenticated, async (req, res, next) => {
    try {
      const machineId = parseInt(req.params.machineId);
      if (isNaN(machineId)) {
        throw new ValidationError("Invalid machine ID format", ["machineId"]);
      }
      const assignments = await storage.getAssignmentsForMachine(machineId);
      res.json(assignments);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/assignments", isAuthenticated, async (req, res, next) => {
    try {
      const data = insertMachineAssignmentSchema.parse(req.body);
      const result = await storage.assignOrderToMachine(data);
      await storage.createAuditRecord({
        orderId: data.orderId,
        userId: req.user.id,
        locationId: data.locationId,
        action: "assigned_to_machine",
        details: `Assigned to machine ${data.machineId}${typeof data.assignedQuantity === "number" ? ` qty=${data.assignedQuantity}` : ""}`
      });
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid assignment data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/assignments", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.body.orderId);
      const locationId = parseInt(req.body.locationId);
      const machineId = parseInt(req.body.machineId);
      const assignedQuantity = parseInt(req.body.assignedQuantity ?? "0");
      if ([orderId, locationId, machineId].some((n) => isNaN(n))) {
        throw new ValidationError("Invalid order/location/machine ID", ["orderId", "locationId", "machineId"]);
      }
      const updated = await storage.updateMachineAssignmentQuantity(orderId, locationId, machineId, assignedQuantity);
      if (!updated) {
        throw new NotFoundError(`Assignment not found for order ${orderId}, location ${locationId}, machine ${machineId}`, "machine_assignment", `${orderId}-${locationId}-${machineId}`);
      }
      await storage.createAuditRecord({
        orderId,
        userId: req.user.id,
        locationId,
        action: "assignment_quantity_updated",
        details: `Machine ${machineId} qty=${assignedQuantity}`
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/assignments", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.body.orderId);
      const locationId = parseInt(req.body.locationId);
      const machineId = parseInt(req.body.machineId);
      if ([orderId, locationId, machineId].some((n) => isNaN(n))) {
        throw new ValidationError("Invalid order/location/machine ID", ["orderId", "locationId", "machineId"]);
      }
      await storage.unassignOrderFromMachine(orderId, locationId, machineId);
      await storage.createAuditRecord({
        orderId,
        userId: req.user.id,
        locationId,
        action: "unassigned_from_machine",
        details: `Unassigned from machine ${machineId}`
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/queue/location/:locationId/reorder", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const orderId = parseInt(req.body.orderId);
      const position = parseInt(req.body.position);
      if ([locationId, orderId, position].some((n) => isNaN(n)) || position < 1) {
        throw new ValidationError("Invalid reorder payload", ["locationId", "orderId", "position"]);
      }
      const queue = await storage.getLocationQueue(locationId);
      const target = queue.find((q) => q.orderId === orderId);
      if (!target) {
        throw new NotFoundError(`Order ${orderId} not found in location ${locationId} queue`, "order_location", `${orderId}-${locationId}`);
      }
      const rushItems = queue.filter((q) => q.order.rush);
      const targetIsRush = target.order.rush;
      if (!targetIsRush && rushItems.length > 0) {
        const maxRushIndex = queue.reduce((idx, item, i) => item.order.rush ? i : idx, -1);
        const minAllowed = maxRushIndex + 2;
        if (position <= minAllowed - 1) {
          return res.status(400).json({
            message: "Cannot move non-rush order ahead of rush orders",
            errorType: "validation_error",
            minAllowedPosition: minAllowed
          });
        }
      }
      const without = queue.filter((q) => q.orderId !== orderId);
      const clampPos = Math.max(1, Math.min(position, without.length + 1));
      const newList = [...without.slice(0, clampPos - 1), target, ...without.slice(clampPos - 1)];
      for (let i = 0; i < newList.length; i++) {
        await storage.updateOrderLocation(newList[i].id, { queuePosition: i + 1 });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/machine-permissions/:userId/:machineId", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const machineId = parseInt(req.params.machineId);
      if (isNaN(userId) || isNaN(machineId)) {
        throw new ValidationError("Invalid user ID or machine ID format", ["userId", "machineId"]);
      }
      await storage.removeMachinePermission(userId, machineId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/machine-permissions/machine/:machineId", isRoleAtLeast("manager"), async (req, res, next) => {
    try {
      const machineId = parseInt(req.params.machineId);
      if (isNaN(machineId)) {
        throw new ValidationError("Invalid machine ID format", ["machineId"]);
      }
      const permissions = await storage.getMachinePermissionsForMachine(machineId);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/machine-permissions/:userId/:machineId", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const machineId = parseInt(req.params.machineId);
      const { accessRole } = req.body;
      if (isNaN(userId) || isNaN(machineId)) {
        throw new ValidationError("Invalid user ID or machine ID format", ["userId", "machineId"]);
      }
      if (accessRole !== "operator" && accessRole !== "admin") {
        throw new ValidationError("Invalid accessRole; must be 'operator' or 'admin'", ["accessRole"]);
      }
      const updated = await storage.updateMachinePermissionAccessRole(userId, machineId, accessRole);
      if (!updated) {
        throw new NotFoundError(`Permission not found for user ${userId} and machine ${machineId}`, "machine_permission", `${userId}:${machineId}`);
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/machine-permissions/user/:userId", isAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        throw new ValidationError("Invalid user ID format", ["userId"]);
      }
      const permissions = await storage.getMachinePermissionsForUser(userId);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/orders", isAuthenticated, async (req, res, next) => {
    try {
      const includeShipped = req.query.includeShipped === "true";
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 20;
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      const paginationOptions = { page, pageSize };
      const paginatedOrders = await storage.getAllOrders(includeShipped, paginationOptions);
      res.json(paginatedOrders);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/orders/search", isAuthenticated, async (req, res, next) => {
    try {
      const query = req.query.q || "";
      const includeShipped = req.query.includeShipped === "true";
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 20;
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      const paginationOptions = { page, pageSize };
      const paginatedOrders = await storage.searchOrders(query, includeShipped, paginationOptions);
      res.json(paginatedOrders);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/queue/global", isAuthenticated, async (_req, res, next) => {
    try {
      const queue = await storage.getGlobalQueue();
      res.json(queue);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/orders/:orderId/rush", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const now = /* @__PURE__ */ new Date();
      const updated = await storage.setOrderRush(orderId, now);
      await storage.recalcAllLocationQueues();
      await storage.createAuditRecord({
        orderId,
        userId: req.user.id,
        action: "rush",
        details: `Order marked RUSH at ${now.toISOString()}`
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/orders/:orderId/unrush", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const updated = await storage.unsetOrderRush(orderId);
      await storage.recalcAllLocationQueues();
      await storage.createAuditRecord({
        orderId,
        userId: req.user.id,
        action: "unrush",
        details: "Order rush cleared"
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/queue/global/:orderId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const position = parseInt(req.body.position ?? "0");
      if (!position || position < 1) {
        throw new ValidationError("Position must be a positive integer", ["position"]);
      }
      const currentQueue = await storage.getGlobalQueue();
      const target = currentQueue.find((o) => o.id === orderId);
      if (!target) {
        throw new NotFoundError(`Order with ID ${orderId} not found in active queue`, "order", orderId);
      }
      const rushBlockEnd = (() => {
        let lastRushIdx = -1;
        currentQueue.forEach((o, idx) => {
          if (o.rush) lastRushIdx = idx;
        });
        return lastRushIdx;
      })();
      if (!target.rush && rushBlockEnd >= 0 && position <= rushBlockEnd + 1) {
        return res.status(400).json({
          message: "Cannot move non-rush order ahead of rush orders",
          errorType: "validation_error",
          minAllowedPosition: rushBlockEnd + 2
        });
      }
      const ok = await storage.setOrderGlobalQueuePosition(orderId, position);
      await storage.recalcAllLocationQueues();
      await storage.createAuditRecord({
        orderId,
        userId: req.user.id,
        action: "global_queue_set",
        details: `Set global queue position to ${position}`
      });
      res.json({ success: ok });
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/orders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      const order = await storage.getOrderWithLocations(id);
      if (!order) {
        throw new NotFoundError(`Order with ID ${id} not found`, "order", id);
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/orders", isAuthenticated, async (req, res, next) => {
    try {
      const selectedLocationIds = req.body.selectedLocationIds || [];
      const orderFormData = {
        ...req.body,
        // Convert timestamp to Date object if needed
        dueDate: typeof req.body.dueDate === "number" ? new Date(req.body.dueDate * 1e3) : req.body.dueDate,
        createdBy: req.user.id
      };
      const orderData = insertOrderSchema.parse(orderFormData);
      const order = await storage.createOrder(orderData);
      if (selectedLocationIds.length > 0) {
        for (const locationId of selectedLocationIds) {
          await storage.createOrderLocation({
            orderId: order.id,
            locationId,
            status: "not_started",
            completedQuantity: 0
          });
        }
      } else {
        const locations2 = await storage.getLocationsByOrder();
        for (const location of locations2) {
          await storage.createOrderLocation({
            orderId: order.id,
            locationId: location.id,
            status: "not_started",
            completedQuantity: 0
          });
        }
      }
      await storage.createAuditRecord({
        orderId: order.id,
        userId: req.user.id,
        action: "created",
        details: `Order ${order.orderNumber} created`
      });
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid order data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/orders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      const orderFormData = {
        ...req.body,
        // Convert timestamp to Date object if needed
        dueDate: typeof req.body.dueDate === "number" ? new Date(req.body.dueDate * 1e3) : req.body.dueDate
      };
      const updatedOrder = await storage.updateOrder(id, orderFormData);
      if (!updatedOrder) {
        throw new NotFoundError(`Order with ID ${id} not found`, "order", id);
      }
      await storage.createAuditRecord({
        orderId: id,
        userId: req.user.id,
        action: "updated",
        details: `Order ${updatedOrder.orderNumber} updated`
      });
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/orders/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      await storage.deleteOrder(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/orders/:id/ship", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      const quantity = parseInt(req.body.quantity || "0");
      const updatedOrder = await storage.markOrderAsShipped(id, quantity);
      if (!updatedOrder) {
        throw new NotFoundError(`Order with ID ${id} not found`, "order", id);
      }
      await storage.createAuditRecord({
        orderId: id,
        userId: req.user.id,
        action: "shipped",
        details: `Shipped ${quantity} units of order ${updatedOrder.orderNumber}`
      });
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/order-locations/order/:orderId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const orderLocations2 = await storage.getOrderLocationsByOrder(orderId);
      res.json(orderLocations2);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/order-locations", isAuthenticated, async (req, res, next) => {
    try {
      const orderLocationData = insertOrderLocationSchema.parse(req.body);
      const orderLocation = await storage.createOrderLocation(orderLocationData);
      res.status(201).json(orderLocation);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid order location data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.delete("/api/order-locations/:orderId/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      const orderLocations2 = await storage.getOrderLocationsByOrder(orderId);
      const locationToDelete = orderLocations2.find((ol) => ol.locationId === locationId);
      if (!locationToDelete) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, "order_location", `${orderId}-${locationId}`);
      }
      await storage.deleteOrderLocation(locationToDelete.id);
      await storage.createAuditRecord({
        orderId,
        userId: req.user?.id || 0,
        locationId,
        action: "location_removed",
        details: `Location removed from order`
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order location:", error);
      next(error);
    }
  });
  app2.get("/api/order-locations/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      const orderLocations2 = await storage.getOrderLocationsByLocation(locationId);
      res.json(orderLocations2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/primary-location-orders/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      const orders2 = await storage.getOrdersForPrimaryLocation(locationId);
      res.json(orders2);
    } catch (error) {
      console.error("Error fetching primary location orders:", error);
      next(error);
    }
  });
  app2.get("/api/queue/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      const queue = await storage.getLocationQueue(locationId);
      res.json(queue);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/queue/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      const { orderId } = req.body;
      if (!orderId) {
        throw new ValidationError("Order ID is required", ["orderId"]);
      }
      const queue = await storage.getLocationQueue(locationId);
      const orderAlreadyInQueue = queue.some((item) => item.orderId === orderId);
      if (orderAlreadyInQueue) {
        throw new ValidationError("Order is already in queue", ["orderId"]);
      }
      let orderLocation = await db.select().from(orderLocations).where(
        and2(
          eq2(orderLocations.locationId, locationId),
          eq2(orderLocations.orderId, orderId)
        )
      ).then((results) => results[0]);
      if (orderLocation) {
        const maxQueuePosition = queue.length > 0 ? Math.max(...queue.map((item) => item.queuePosition || 0)) : 0;
        await db.update(orderLocations).set({
          status: "in_queue",
          queuePosition: maxQueuePosition + 1
        }).where(eq2(orderLocations.id, orderLocation.id));
        orderLocation = await db.select().from(orderLocations).where(eq2(orderLocations.id, orderLocation.id)).then((results) => results[0]);
      } else {
        const maxQueuePosition = queue.length > 0 ? Math.max(...queue.map((item) => item.queuePosition || 0)) : 0;
        orderLocation = await storage.createOrderLocation({
          orderId,
          locationId,
          status: "in_queue",
          completedQuantity: 0,
          queuePosition: maxQueuePosition + 1
        });
      }
      await storage.createAuditRecord({
        orderId,
        userId: req.user.id,
        locationId,
        action: "queued",
        details: "Order queued for processing"
      });
      res.status(201).json(orderLocation);
    } catch (error) {
      console.error("Error adding to queue:", error);
      next(error);
    }
  });
  app2.post("/api/order-locations/:orderId/:locationId/start", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      const updatedOrderLocation = await storage.startOrderAtLocation(orderId, locationId, req.user.id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, "order_location", `${orderId}-${locationId}`);
      }
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/order-locations/:orderId/:locationId/finish", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      const completedQuantity = parseInt(req.body.completedQuantity || "0");
      const updatedOrderLocation = await storage.finishOrderAtLocation(orderId, locationId, completedQuantity, req.user.id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, "order_location", `${orderId}-${locationId}`);
      }
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/order-locations/:orderId/:locationId/pause", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      const updatedOrderLocation = await storage.pauseOrderAtLocation(orderId, locationId, req.user.id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, "order_location", `${orderId}-${locationId}`);
      }
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/order-locations/:orderId/:locationId/update-quantity", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      const completedQuantity = parseInt(req.body.completedQuantity || "0");
      const updatedOrderLocation = await storage.updateOrderLocationQuantity(orderId, locationId, completedQuantity, req.user.id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, "order_location", `${orderId}-${locationId}`);
      }
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/audit-trail", isAdmin, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 50;
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      const paginationOptions = { page, pageSize };
      const paginatedAuditTrail = await storage.getAllAuditTrail(paginationOptions);
      res.json(paginatedAuditTrail);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/audit-trail/order/:orderId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const auditTrail2 = await storage.getAuditTrailForOrder(orderId);
      res.json(auditTrail2);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/help-requests", isAuthenticated, async (req, res, next) => {
    try {
      const helpRequestData = insertHelpRequestSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const helpRequest = await storage.createHelpRequest(helpRequestData);
      await storage.createAuditRecord({
        orderId: helpRequestData.orderId,
        userId: req.user.id,
        locationId: helpRequestData.locationId,
        action: "help_requested",
        details: helpRequestData.notes || "Help requested"
      });
      res.status(201).json(helpRequest);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid help request data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.post("/api/help-requests/:id/resolve", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid help request ID format", ["id"]);
      }
      const resolvedHelpRequest = await storage.resolveHelpRequest(id);
      if (!resolvedHelpRequest) {
        throw new NotFoundError(`Help request with ID ${id} not found`, "help_request", id);
      }
      res.json(resolvedHelpRequest);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/help-requests/active", isAuthenticated, async (req, res, next) => {
    try {
      const helpRequests2 = await storage.getActiveHelpRequests();
      res.json(helpRequests2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/help-requests/all", isAuthenticated, async (_req, res, next) => {
    try {
      const helpRequests2 = await storage.getAllHelpRequests();
      res.json(helpRequests2);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/email-settings", isAdmin, async (req, res, next) => {
    try {
      const emailSettings2 = await storage.getAllEmailSettings();
      res.json(emailSettings2);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/email-settings", isAdmin, async (req, res, next) => {
    try {
      const emailSettingData = insertEmailSettingSchema.parse(req.body);
      const emailSetting = await storage.addEmailSetting(emailSettingData);
      res.status(201).json(emailSetting);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid email setting data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/email-settings/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid email setting ID format", ["id"]);
      }
      const emailSettingData = req.body;
      const updatedEmailSetting = await storage.updateEmailSetting(id, emailSettingData);
      if (!updatedEmailSetting) {
        throw new NotFoundError(`Email setting with ID ${id} not found`, "email_setting", id);
      }
      res.json(updatedEmailSetting);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/email-settings/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid email setting ID format", ["id"]);
      }
      await storage.deleteEmailSetting(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/pdf-settings", isAuthenticated, async (req, res, next) => {
    try {
      const pdfSettings2 = await storage.getPdfSettings();
      res.json(pdfSettings2 || { pdfPrefix: "", pdfPostfix: ".pdf" });
    } catch (error) {
      next(error);
    }
  });
  app2.put("/api/pdf-settings", isAdmin, async (req, res, next) => {
    try {
      const pdfSettingData = insertPdfSettingSchema.parse(req.body);
      const updatedPdfSetting = await storage.updatePdfSettings(pdfSettingData);
      res.json(updatedPdfSetting);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid PDF setting data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.get("/api/rfid-cards", isAdmin, async (req, res, next) => {
    try {
      const cards = await storage.getAllRfidCards();
      res.json(cards);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/rfid-cards", isAdmin, async (req, res, next) => {
    try {
      const cardData = insertRfidCardSchema.parse(req.body);
      const card = await storage.createRfidCard(cardData);
      res.status(201).json(card);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid RFID card data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/rfid-cards/:cardId", isAdmin, async (req, res, next) => {
    try {
      const cardId = req.params.cardId;
      const cardData = req.body;
      const updatedCard = await storage.updateRfidCard(cardId, cardData);
      if (!updatedCard) {
        throw new NotFoundError(`RFID card with ID ${cardId} not found`, "rfid_card", cardId);
      }
      res.json(updatedCard);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/rfid-cards/:cardId", isAdmin, async (req, res, next) => {
    try {
      const cardId = req.params.cardId;
      await storage.deleteRfidCard(cardId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/access-levels", isAdmin, async (req, res, next) => {
    try {
      const accessLevels2 = await storage.getAllAccessLevels();
      res.json(accessLevels2);
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/access-levels", isAdmin, async (req, res, next) => {
    try {
      const accessLevelData = insertAccessLevelSchema.parse(req.body);
      const accessLevel = await storage.createAccessLevel(accessLevelData);
      res.status(201).json(accessLevel);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid access level data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  app2.put("/api/access-levels/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid access level ID format", ["id"]);
      }
      const accessLevelData = req.body;
      const updatedAccessLevel = await storage.updateAccessLevel(id, accessLevelData);
      if (!updatedAccessLevel) {
        throw new NotFoundError(`Access level with ID ${id} not found`, "access_level", id);
      }
      res.json(updatedAccessLevel);
    } catch (error) {
      next(error);
    }
  });
  app2.delete("/api/access-levels/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid access level ID format", ["id"]);
      }
      await storage.deleteAccessLevel(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/access-logs/recent", isAdmin, async (req, res, next) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 50;
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      const paginationOptions = { page, pageSize };
      const paginatedLogs = await storage.getRecentAccessLogs(paginationOptions);
      res.json(paginatedLogs);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/alerts/pending/count", isAuthenticated, async (req, res, next) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json({ count: alerts.length });
    } catch (error) {
      console.error("Error fetching pending alert count:", error);
      next(error);
    }
  });
  app2.get("/api/alerts", isAuthenticated, async (req, res, next) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      next(error);
    }
  });
  app2.get("/api/alerts/for-user", isAuthenticated, async (req, res, next) => {
    try {
      const role = req.user.role;
      if (["admin", "manager"].includes(role)) {
        const alerts = await storage.getPendingMachineAlerts();
        return res.json(alerts);
      }
      const perms = await storage.getMachinePermissionsForUser(req.user.id);
      const ids = new Set(perms.map((p) => p.machineId.toString()));
      const all = await storage.getPendingMachineAlerts();
      const scoped = all.filter((a) => ids.has(a.machineId.toString()));
      res.json(scoped);
    } catch (error) {
      next(error);
    }
  });
  app2.get("/api/alerts/all", isAuthenticated, async (_req, res, next) => {
    try {
      const alerts = await storage.getAllMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alert history:", error);
      next(error);
    }
  });
  app2.get("/api/alerts/machine/:machineId", isAuthenticated, async (req, res, next) => {
    try {
      const machineId = req.params.machineId;
      const alerts = await storage.getMachineAlertsByMachine(machineId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching machine alerts:", error);
      next(error);
    }
  });
  app2.post("/api/alerts", isAuthenticated, async (req, res, next) => {
    try {
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        senderId: req.user.id,
        origin: "system"
      });
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid alert data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      console.error("Error creating alert:", error);
      next(error);
    }
  });
  app2.post("/api/alerts/:id/resolve", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      const alert = await storage.resolveMachineAlert(id, req.user.id);
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, "alert", id);
      }
      res.json(alert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      next(error);
    }
  });
  app2.post("/api/alerts/:id/acknowledge", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      const alert = await storage.acknowledgeMachineAlert(id);
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, "alert", id);
      }
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      next(error);
    }
  });
  app2.get("/api/machine-alerts/pending", isAuthenticated, async (req, res, next) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching pending machine alerts:", error);
      next(error);
    }
  });
  app2.get("/api/machine-alerts/machine/:machineId", isAuthenticated, async (req, res, next) => {
    try {
      const machineId = req.params.machineId;
      const alerts = await storage.getMachineAlertsByMachine(machineId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching machine alerts:", error);
      next(error);
    }
  });
  app2.post("/api/machine-alerts", isAuthenticated, async (req, res, next) => {
    try {
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        senderId: req.user.id,
        origin: "system"
      });
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid alert data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      console.error("Error creating machine alert:", error);
      next(error);
    }
  });
  app2.post("/api/machine-alerts/resolve/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      const alert = await storage.resolveMachineAlert(id, req.user.id);
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, "alert", id);
      }
      res.json(alert);
    } catch (error) {
      console.error("Error resolving machine alert:", error);
      next(error);
    }
  });
  app2.post("/api/machine-alerts/acknowledge/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      const alert = await storage.acknowledgeMachineAlert(id);
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, "alert", id);
      }
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging machine alert:", error);
      next(error);
    }
  });
  app2.post("/api/external/machine-alert", async (req, res, next) => {
    try {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey) {
        throw new ValidationError("API key is required", ["x-api-key"]);
      }
      const config = await storage.getApiConfig();
      if (!config || config.shopMonitorApiKey !== apiKey) {
        throw new ValidationError("Invalid API key", ["x-api-key"]);
      }
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        origin: "machine"
      });
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json({
        success: true,
        alert_id: alert.id,
        message: "Alert received successfully"
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const validationError = new ValidationError(
          "Invalid alert data",
          error.errors.map((e) => e.path.join("."))
        );
        return next(validationError);
      }
      console.error("Error processing external machine alert:", error);
      next(error);
    }
  });
  app2.get("/api/api-config", isAdmin, async (req, res, next) => {
    try {
      const config = await storage.getApiConfig();
      if (!config) {
        return res.json({
          shopMonitorApiKey: "",
          shopMonitorApiUrl: "",
          syncEnabled: false,
          syncInterval: 60
        });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching API config:", error);
      next(error);
    }
  });
  app2.post("/api/api-config", isAdmin, async (req, res, next) => {
    try {
      const configData = req.body;
      const updatedConfig = await storage.updateApiConfig(configData);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating API config:", error);
      next(error);
    }
  });
  app2.post("/api/api-config/test", isAdmin, async (req, res, next) => {
    try {
      const { shopMonitorApiUrl, shopMonitorApiKey } = req.body;
      if (!shopMonitorApiUrl || !shopMonitorApiKey) {
        throw new ValidationError("API URL and API Key are required", ["shopMonitorApiUrl", "shopMonitorApiKey"]);
      }
      try {
        const response = await fetch(`${shopMonitorApiUrl}/api/ping`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "x-api-key": shopMonitorApiKey
          }
        });
        if (response.ok) {
          const data = await response.json();
          res.json({
            success: true,
            message: "Connection to ShopMonitor API successful",
            data
          });
        } else {
          const errorText = await response.text();
          throw new ValidationError(`Failed to connect to ShopMonitor API: ${response.status} ${errorText}`, ["shopMonitorApiUrl", "shopMonitorApiKey"]);
        }
      } catch (fetchError) {
        throw new ValidationError(`Connection failed: ${fetchError.message}`, ["shopMonitorApiUrl", "shopMonitorApiKey"]);
      }
    } catch (error) {
      console.error("Error testing API connection:", error);
      next(error);
    }
  });
  app2.get("/api/sync/status", isAdmin, async (req, res, next) => {
    try {
      const { syncManager: syncManager2 } = await init_sync().then(() => sync_exports);
      res.json(syncManager2.getStatus());
    } catch (error) {
      console.error("Error getting sync status:", error);
      next(error);
    }
  });
  app2.post("/api/sync/start", isAdmin, async (req, res, next) => {
    try {
      const { syncManager: syncManager2 } = await init_sync().then(() => sync_exports);
      const config = await storage.getApiConfig();
      if (!config) {
        throw new ValidationError("No API configuration found", ["apiConfig"]);
      }
      if (!config.syncEnabled) {
        await storage.updateApiConfig({
          ...config,
          syncEnabled: true
        });
      }
      syncManager2.startSync(config.syncInterval || 5);
      res.json({
        success: true,
        message: "Sync process started"
      });
    } catch (error) {
      console.error("Error starting sync:", error);
      next(error);
    }
  });
  app2.post("/api/sync/stop", isAdmin, async (req, res, next) => {
    try {
      const { syncManager: syncManager2 } = await init_sync().then(() => sync_exports);
      const config = await storage.getApiConfig();
      if (config) {
        await storage.updateApiConfig({
          ...config,
          syncEnabled: false
        });
      }
      syncManager2.stopSync();
      res.json({
        success: true,
        message: "Sync process stopped"
      });
    } catch (error) {
      console.error("Error stopping sync:", error);
      next(error);
    }
  });
  app2.post("/api/sync/now", isAdmin, async (req, res, next) => {
    try {
      const { syncManager: syncManager2 } = await init_sync().then(() => sync_exports);
      await syncManager2.performSync();
      res.json({
        success: true,
        message: "Sync process triggered",
        lastSyncTime: syncManager2.getLastSyncTime()
      });
    } catch (error) {
      console.error("Error triggering sync:", error);
      next(error);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
await init_vite();

// server/db-migration.ts
init_db();
import { sql as sql2 } from "drizzle-orm";
async function runMigrations() {
  try {
    console.log("Creating tables if they do not exist...");
    await db.run(sql2`
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
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN enable_sound_notifications INTEGER DEFAULT 1;`);
      console.log("Added enable_sound_notifications column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN enable_visual_notifications INTEGER DEFAULT 1;`);
      console.log("Added enable_visual_notifications column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN notification_sound TEXT DEFAULT 'default';`);
      console.log("Added notification_sound column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN order_completed_notifications INTEGER DEFAULT 1;`);
      console.log("Added order_completed_notifications column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN order_started_notifications INTEGER DEFAULT 1;`);
      console.log("Added order_started_notifications column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN help_request_notifications INTEGER DEFAULT 1;`);
      console.log("Added help_request_notifications column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN notifications_last_seen_at TIMESTAMP;`);
      console.log("Added notifications_last_seen_at column to users table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;`);
      console.log("Added active column to users table");
    } catch (error) {
    }
    await db.run(sql2`
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
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        machine_id TEXT NOT NULL UNIQUE,
        location_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS machine_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        machine_id INTEGER NOT NULL,
        access_role TEXT NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await db.run(sql2`ALTER TABLE machine_permissions ADD COLUMN access_role TEXT NOT NULL DEFAULT 'operator';`);
      console.log("Added access_role column to machine_permissions table");
    } catch (error) {
    }
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS machine_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        machine_id INTEGER NOT NULL,
        assigned_quantity INTEGER NOT NULL DEFAULT 0,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await db.run(sql2`ALTER TABLE machine_assignments ADD COLUMN assigned_quantity INTEGER NOT NULL DEFAULT 0;`);
      console.log("Added assigned_quantity column to machine_assignments table");
    } catch (error) {
    }
    await db.run(sql2`
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
    try {
      await db.run(sql2`ALTER TABLE orders ADD COLUMN global_queue_position INTEGER;`);
      console.log("Added global_queue_position column to orders table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE orders ADD COLUMN rush INTEGER NOT NULL DEFAULT 0;`);
      console.log("Added rush column to orders table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE orders ADD COLUMN rush_set_at TIMESTAMP;`);
      console.log("Added rush_set_at column to orders table");
    } catch (error) {
    }
    await db.run(sql2`
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
    await db.run(sql2`
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
    await db.run(sql2`
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
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS email_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        for_shipping INTEGER NOT NULL DEFAULT 1,
        for_help INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS pdf_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pdf_prefix TEXT NOT NULL DEFAULT '',
        pdf_postfix TEXT NOT NULL DEFAULT '.pdf',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS rfid_cards (
        card_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.run(sql2`
      CREATE TABLE IF NOT EXISTS access_levels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        machine_id TEXT NOT NULL,
        access_level TEXT NOT NULL DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.run(sql2`
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
    await db.run(sql2`
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
    try {
      await db.run(sql2`ALTER TABLE api_configs ADD COLUMN alerts_enabled INTEGER NOT NULL DEFAULT 1;`);
      console.log("Added alerts_enabled column to api_configs table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE api_configs ADD COLUMN push_user_data INTEGER NOT NULL DEFAULT 1;`);
      console.log("Added push_user_data column to api_configs table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE api_configs ADD COLUMN push_location_data INTEGER NOT NULL DEFAULT 1;`);
      console.log("Added push_location_data column to api_configs table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE api_configs ADD COLUMN push_machine_data INTEGER NOT NULL DEFAULT 1;`);
      console.log("Added push_machine_data column to api_configs table");
    } catch (error) {
    }
    try {
      await db.run(sql2`ALTER TABLE api_configs ADD COLUMN pull_access_logs INTEGER NOT NULL DEFAULT 1;`);
      console.log("Added pull_access_logs column to api_configs table");
    } catch (error) {
    }
    await db.run(sql2`
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
    console.log("All tables created successfully.");
    return true;
  } catch (error) {
    console.error("Error creating tables:", error);
    return false;
  }
}
async function addDatabaseIndexes() {
  try {
    console.log("Adding database indexes for performance optimization...");
    console.log("Adding indexes to orders table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_orders_is_shipped ON orders(is_shipped);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_orders_is_finished ON orders(is_finished);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_orders_search ON orders(order_number, client, tbfos_number, description);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_orders_global_queue_position ON orders(global_queue_position);`);
    console.log("Adding indexes to order_locations table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_order_locations_order_location ON order_locations(order_id, location_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_order_locations_location_id ON order_locations(location_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_order_locations_status ON order_locations(status);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_order_locations_location_status ON order_locations(location_id, status);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_order_locations_queue_position ON order_locations(queue_position);`);
    console.log("Adding indexes to audit_trail table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_audit_trail_order_id ON audit_trail(order_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON audit_trail(user_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_audit_trail_location_id ON audit_trail(location_id);`);
    console.log("Adding indexes to access_logs table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_access_logs_machine_id ON access_logs(machine_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_access_logs_card_id ON access_logs(card_id);`);
    console.log("Adding indexes to rfid_cards table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_rfid_cards_user_id ON rfid_cards(user_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_rfid_cards_active ON rfid_cards(active);`);
    console.log("Adding indexes to machines table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machines_location_id ON machines(location_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machines_machine_id ON machines(machine_id);`);
    console.log("Adding indexes to machine_assignments table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machine_assignments_order_location ON machine_assignments(order_id, location_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machine_assignments_machine_id ON machine_assignments(machine_id);`);
    console.log("Adding indexes to help_requests table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_help_requests_is_resolved ON help_requests(is_resolved);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at);`);
    console.log("Adding indexes to machine_alerts table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machine_alerts_status ON machine_alerts(status);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machine_alerts_machine_id ON machine_alerts(machine_id);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_machine_alerts_sender_id ON machine_alerts(sender_id);`);
    console.log("Adding indexes to access_levels table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_access_levels_user_machine ON access_levels(user_id, machine_id);`);
    console.log("Adding indexes to users table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    console.log("Adding indexes to locations table...");
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_locations_used_order ON locations(used_order);`);
    await db.run(sql2`CREATE INDEX IF NOT EXISTS idx_locations_is_primary ON locations(is_primary);`);
    console.log("All database indexes created successfully.");
    return true;
  } catch (error) {
    console.error("Error creating database indexes:", error);
    return false;
  }
}

// server/index.ts
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var packageJsonPath = join(__dirname, "..", "package.json");
var packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
var appVersion = packageJson.version;
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    log("Running database migrations...");
    await runMigrations();
    log("Database migrations completed successfully");
    log("Adding database indexes for performance optimization...");
    await addDatabaseIndexes();
    log("Database indexes added successfully");
  } catch (error) {
    log(`Database setup error: ${error}`);
  }
  const server = await registerRoutes(app);
  try {
    const { syncManager: syncManager2 } = await init_sync().then(() => sync_exports);
    syncManager2.initialize().catch((error) => {
      log(`Error initializing sync manager: ${error}`, "sync");
    });
  } catch (error) {
    log(`Failed to load sync manager: ${error}`, "sync");
  }
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  log(`Current environment: NODE_ENV=${process.env.NODE_ENV}, app.get('env')=${app.get("env")}`);
  if (app.get("env") === "development") {
    log("Setting up Vite development server...");
    await setupVite(app, server);
    log("Vite development server setup complete");
  } else {
    log("Setting up static file serving for production...");
    serveStatic(app);
  }
  const port = 5e3;
  const defaultDevHost = "localhost";
  const defaultProdHost = "0.0.0.0";
  const isDev = app.get("env") === "development";
  const host = process.env.HOST || (isDev ? defaultDevHost : defaultProdHost);
  server.listen({
    port,
    host,
    reusePort: process.platform !== "win32"
    // reusePort not supported on Windows
  }, () => {
    log(`ShopTracker v${appVersion} | Part of ShopSuite v1.0.1`);
    log(`Server running on ${host}:${port}`);
  });
})();
