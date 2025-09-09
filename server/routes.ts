import type { Express, Request, Response } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer, type Server } from "http";
import { storage, PaginationOptions } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { z } from "zod";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { 
  insertUserSchema, 
  insertLocationSchema, 
  insertMachineSchema, 
  insertOrderSchema, 
  insertMachinePermissionSchema,
  insertEmailSettingSchema,
  insertPdfSettingSchema,
  insertHelpRequestSchema,
  notificationPreferencesSchema,
  insertOrderLocationSchema,
  insertMachineAssignmentSchema,
  orderLocations,
  type OrderLocation,
  machineAuthRequestSchema,
  insertMachineAlertSchema,
  insertRfidCardSchema,
  insertAccessLevelSchema,
  insertAccessLogSchema
} from "@shared/schema";
import { formatErrorResponse, logError, NotFoundError, ValidationError, DatabaseError } from "./utils";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    message: "Unauthorized: Authentication required", 
    errorType: "auth_error" 
  });
};

// Role helpers and guards
const roleRank: Record<string, number> = { shop: 1, office: 2, manager: 3, admin: 4 };
const isRoleAtLeast = (minRole: keyof typeof roleRank) => (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && roleRank[req.user.role] >= roleRank[minRole]) return next();
  res.status(403).json({ message: `Forbidden: ${minRole} role required`, errorType: "permission_error" });
};
const isAdmin = isRoleAtLeast('admin');

// Error handler middleware for API endpoints
const apiErrorHandler = (err: Error, req: Request, res: Response, next: Function) => {
  const errorResponse = formatErrorResponse(err);
  logError(err, 'api');
  res.status(errorResponse.statusCode).json({
    message: errorResponse.message,
    errorType: errorResponse.errorType,
    details: errorResponse.details
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  
  // Error handler middleware (should be registered after routes)
  app.use(apiErrorHandler);

  // Serve uploaded assets (logos, etc.) under /uploads in both dev and prod
  try {
    const uploadsDir = path.resolve(import.meta.dirname, "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.use("/uploads", express.static(uploadsDir));
    // Base64 logo upload endpoint (admins only) - avoids multipart deps
    app.post("/api/upload/logo-base64", isAdmin, async (req, res, next) => {
      try {
        const { dataUri, filename } = req.body as { dataUri?: string; filename?: string };
        if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
          throw new ValidationError("Invalid or missing dataUri; must be a data:image/* URI", ["dataUri"]);
        }
        const [meta, b64] = dataUri.split(',');
        const mime = meta.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1] || 'image/png';
        const ext = mime.split('/')[1].replace('+xml','');
        const buffer = Buffer.from(b64, 'base64');
        // Enforce max 3MB decoded size for images
        const MAX_BYTES = 3 * 1024 * 1024;
        if (buffer.length > MAX_BYTES) {
          throw new ValidationError("Image too large (max 3MB)", ["dataUri"]);
        }
        const safeBase = (filename || `logo.${ext}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
        const outName = `${Date.now()}_${safeBase}`;
        const filePath = path.join(uploadsDir, outName);
        await fs.promises.writeFile(filePath, buffer);
        const publicUrl = `/uploads/${outName}`;
  if ((req.query as any).save === '1') {
          await storage.updateAppSettings({ companyLogoUrl: publicUrl } as any);
        }
  res.json({ url: publicUrl, mime });
      } catch (error) {
        next(error);
      }
    });
  } catch (e) {
    // Non-fatal; log and continue
    console.warn("Failed to initialize uploads dir:", e);
  }
  
  // Health check route (moved from root to avoid conflict with Vite)
  app.get('/api/health', (_req, res) => {
    res.json({ message: 'ShopTracker API is running' });
  });
  
  // *** ShopMonitor API Integration Endpoints ***
  
  // Development utility route to reset users table and recreate default admin
  app.post("/api/dev/reset-users", async (req, res, next) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV !== "development") {
        throw new ValidationError("This endpoint is only available in development mode");
      }
      
      // Delete all users
      await storage.resetUsers();
      
      // Setup auth will automatically recreate the default admin
      await setupAuth(app);
      
      res.json({ message: "Users table reset, default admin recreated" });
    } catch (error) {
      next(error);
    }
  });
  
  // Setup authentication routes
  await setupAuth(app);
  
  // Machine Access Authentication API
  app.post("/api/auth", async (req, res, next) => {
    try {
      // Validate request
  const authRequest = machineAuthRequestSchema.parse(req.body);
      const { card_id, machine_id } = authRequest;
      
      // 1. Get RFID card with user information
      const rfidCard = await storage.getRfidCardByCardId(card_id);
      if (!rfidCard) {
        // Log access attempt
        await storage.createAccessLog({
          userId: null,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: false,
          reason: "Card not registered",
          timestamp: new Date()
        });
        
        return res.json({
          success: false,
          message: "Access denied: Card not registered",
          machine_id: machine_id,
          timestamp: new Date().toISOString()
        });
      }
      
      // 2. Check if user exists
      if (!rfidCard.user) {
        // Log access attempt
        await storage.createAccessLog({
          userId: null,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: false,
          reason: "Card not associated with user",
          timestamp: new Date()
        });
        
        return res.json({
          success: false,
          message: "Access denied: Card not associated with user",
          machine_id: machine_id,
          timestamp: new Date().toISOString()
        });
      }
      
      // 3. Check access level for this user and machine
      const accessLevel = await storage.getAccessLevel(rfidCard.user.id, machine_id);
      
      // Admin users have access to all machines regardless of explicit access level
      if (rfidCard.user.role === "admin" || accessLevel) {
        // Log successful access
        await storage.createAccessLog({
          userId: rfidCard.user.id,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: true,
          reason: rfidCard.user.role === "admin" ? "Admin access" : "Authorized access",
          timestamp: new Date()
        });
        
        return res.json({
          success: true,
          user: {
            id: rfidCard.user.id,
            username: rfidCard.user.username,
            fullName: rfidCard.user.fullName,
            role: rfidCard.user.role
          },
          access_level: rfidCard.user.role === "admin" ? "admin" : (accessLevel?.accessLevel || "user"),
          machine_id: machine_id,
          timestamp: new Date().toISOString()
        });
      } else {
        // Log denied access
        await storage.createAccessLog({
          userId: rfidCard.user.id,
          machineId: machine_id,
          cardId: card_id,
          accessGranted: false,
          reason: "No access level for this machine",
          timestamp: new Date()
        });
        
        return res.json({
          success: false,
          message: "Access denied: Not authorized for this machine",
          machine_id: machine_id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
  console.error("Machine auth error:", error);
      if (error instanceof z.ZodError) {
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

  // User Routes
  app.get("/api/users", isRoleAtLeast('manager'), async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/users/:id", isRoleAtLeast('manager'), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid user ID format", ["id"]);
      }
      
      const userData = req.body;
      // Prevent elevating higher than self
      if (userData.role && roleRank[userData.role] > roleRank[(req.user as any).role]) {
        return res.status(403).json({ message: 'Cannot assign a role higher than your own' });
      }
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        throw new NotFoundError(`User with ID ${id} not found`, 'user', id);
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res, next) => {
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

  // Create user (manager+), default role shop unless explicitly set <= caller role
  app.post("/api/users", isRoleAtLeast('manager'), async (req, res, next) => {
    try {
      const data = req.body;
      if (!data.username || !data.password || !data.fullName) {
        return res.status(400).json({ message: 'username, fullName, and password are required' });
      }
      // Clamp role to caller max
      const callerRole = (req.user as any).role as string;
      let role = data.role || 'shop';
      if (roleRank[role] > roleRank[callerRole]) role = callerRole;
      const userToCreate = { ...data, role, password: await hashPassword(data.password) };
      const created = await storage.createUser(userToCreate);
      const { password, ...safeUser } = created as any;
      res.status(201).json(safeUser);
    } catch (error) {
      next(error);
    }
  });

  // Notification Preferences Route
  app.put("/api/user/notification-preferences", isAuthenticated, async (req, res, next) => {
    try {
      // Parse and validate the incoming data
      const preferencesData = notificationPreferencesSchema.parse(req.body);
      
      // Ensure the user ID is available
      if (!req.user?.id) {
        throw new ValidationError("User ID not available in request");
      }
      
      // Convert notification settings to proper database format
      const userUpdateData = {
        enableSoundNotifications: preferencesData.enableSoundNotifications ? 1 : 0,
        enableVisualNotifications: preferencesData.enableVisualNotifications ? 1 : 0,
        notificationSound: preferencesData.notificationSound,
        orderCompletedNotifications: preferencesData.orderCompletedNotifications ? 1 : 0,
        orderStartedNotifications: preferencesData.orderStartedNotifications ? 1 : 0,
        helpRequestNotifications: preferencesData.helpRequestNotifications ? 1 : 0,
      };
      
      // Update the user with new preferences
  const updatedUser = await storage.updateUser((req.user as any).id, userUpdateData as any);
      
      if (!updatedUser) {
  throw new NotFoundError(`User with ID ${(req.user as any).id} not found`, 'user', (req.user as any).id);
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid notification preferences data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  // Mark notifications as seen (per user)
  app.post("/api/user/notifications/seen", isAuthenticated, async (req, res, next) => {
    try {
      const now = new Date();
      const updated = await storage.updateUser((req.user as any).id, { notificationsLastSeenAt: now } as any);
      if (!updated) {
        throw new NotFoundError(`User with ID ${(req.user as any).id} not found`, 'user', (req.user as any).id);
      }
      res.json({ ok: true, notificationsLastSeenAt: now });
    } catch (error) {
      next(error);
    }
  });

  // Location Routes
  app.get("/api/locations", isAuthenticated, async (req, res, next) => {
    try {
      const locations = await storage.getLocationsByOrder();
      res.json(locations);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/locations/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid location ID format", ["id"]);
      }
      
      const location = await storage.getLocation(id);
      if (!location) {
        throw new NotFoundError(`Location with ID ${id} not found`, 'location', id);
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      next(error);
    }
  });

  app.post("/api/locations", isAdmin, async (req, res, next) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid location data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  app.put("/api/locations/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid location ID format", ["id"]);
      }
      
      const locationData = req.body;
      const updatedLocation = await storage.updateLocation(id, locationData);
      if (!updatedLocation) {
        throw new NotFoundError(`Location with ID ${id} not found`, 'location', id);
      }
      res.json(updatedLocation);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/locations/:id", isAdmin, async (req, res, next) => {
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

  // Machine Routes
  app.get("/api/machines", isAuthenticated, async (req, res, next) => {
    try {
      const machines = await storage.getAllMachines();
      res.json(machines);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/machines/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      
      const machines = await storage.getMachinesByLocation(locationId);
      res.json(machines);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/machines/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid machine ID format", ["id"]);
      }
      
      const machine = await storage.getMachine(id);
      if (!machine) {
        throw new NotFoundError(`Machine with ID ${id} not found`, 'machine', id);
      }
      res.json(machine);
    } catch (error) {
      console.error("Error fetching machine:", error);
      next(error);
    }
  });

  app.post("/api/machines", isAdmin, async (req, res, next) => {
    try {
      const machineData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(machineData);
      res.status(201).json(machine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid machine data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  app.put("/api/machines/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid machine ID format", ["id"]);
      }
      
      const machineData = req.body;
      const updatedMachine = await storage.updateMachine(id, machineData);
      if (!updatedMachine) {
        throw new NotFoundError(`Machine with ID ${id} not found`, 'machine', id);
      }
      res.json(updatedMachine);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/machines/:id", isAdmin, async (req, res, next) => {
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

  // Machine Permissions Routes
  app.post("/api/machine-permissions", isRoleAtLeast('manager'), async (req, res, next) => {
    try {
      const permissionData = insertMachinePermissionSchema.parse(req.body);
      const permission = await storage.addMachinePermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid permission data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  // Machine Assignment Routes
  app.get("/api/assignments/location/:locationId", isAuthenticated, async (req, res, next) => {
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

  app.get("/api/assignments/machine/:machineId", isAuthenticated, async (req, res, next) => {
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

  app.post("/api/assignments", isAuthenticated, async (req, res, next) => {
    try {
      const data = insertMachineAssignmentSchema.parse(req.body);
      const result = await storage.assignOrderToMachine(data);
      // Audit
      await storage.createAuditRecord({
        orderId: data.orderId,
        userId: (req.user as any).id,
        locationId: data.locationId,
        action: "assigned_to_machine",
        details: `Assigned to machine ${data.machineId}${typeof (data as any).assignedQuantity === 'number' ? ` qty=${(data as any).assignedQuantity}` : ''}`
      });
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid assignment data",
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  // Update assignment quantity
  app.put("/api/assignments", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.body.orderId);
      const locationId = parseInt(req.body.locationId);
      const machineId = parseInt(req.body.machineId);
      const assignedQuantity = parseInt(req.body.assignedQuantity ?? '0');
      if ([orderId, locationId, machineId].some(n => isNaN(n))) {
        throw new ValidationError("Invalid order/location/machine ID", ["orderId","locationId","machineId"]);
      }
      const updated = await storage.updateMachineAssignmentQuantity(orderId, locationId, machineId, assignedQuantity);
      if (!updated) {
        throw new NotFoundError(`Assignment not found for order ${orderId}, location ${locationId}, machine ${machineId}`,'machine_assignment',`${orderId}-${locationId}-${machineId}`);
      }
      await storage.createAuditRecord({
        orderId,
        userId: (req.user as any).id,
        locationId,
        action: "assignment_quantity_updated",
        details: `Machine ${machineId} qty=${assignedQuantity}`
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/assignments", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.body.orderId);
      const locationId = parseInt(req.body.locationId);
      const machineId = parseInt(req.body.machineId);
      if ([orderId, locationId, machineId].some(n => isNaN(n))) {
        throw new ValidationError("Invalid order/location/machine ID", ["orderId","locationId","machineId"]);
      }
      await storage.unassignOrderFromMachine(orderId, locationId, machineId);
      // Audit
      await storage.createAuditRecord({
        orderId,
        userId: (req.user as any).id,
        locationId,
        action: "unassigned_from_machine",
        details: `Unassigned from machine ${machineId}`
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Per-location queue reorder (set specific position for an order in a location)
  app.post("/api/queue/location/:locationId/reorder", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const orderId = parseInt(req.body.orderId);
      const position = parseInt(req.body.position);
      if ([locationId, orderId, position].some(n => isNaN(n)) || position < 1) {
        throw new ValidationError("Invalid reorder payload", ["locationId","orderId","position"]);
      }
      // Fetch queue items for this location
      const queue = await storage.getLocationQueue(locationId);
      const target = queue.find(q => q.orderId === orderId);
      if (!target) {
        throw new NotFoundError(`Order ${orderId} not found in location ${locationId} queue`, 'order_location', `${orderId}-${locationId}`);
      }
      // Prevent moving a non-rush order ahead of any rush orders
      const rushItems = queue.filter(q => q.order.rush);
      const targetIsRush = target.order.rush;
      if (!targetIsRush && rushItems.length > 0) {
        // Earliest allowable position is after last rush item
        const maxRushIndex = queue.reduce((idx, item, i) => item.order.rush ? i : idx, -1);
        const minAllowed = maxRushIndex + 2; // 1-based position after rush block
        if (position <= minAllowed - 1) {
          return res.status(400).json({
            message: "Cannot move non-rush order ahead of rush orders",
            errorType: "validation_error",
            minAllowedPosition: minAllowed
          });
        }
      }
      // Build new order: remove target, insert at position-1
      const without = queue.filter(q => q.orderId !== orderId);
      const clampPos = Math.max(1, Math.min(position, without.length + 1));
      const newList = [...without.slice(0, clampPos - 1), target, ...without.slice(clampPos - 1)];
      // Persist sequential queuePosition starting from 1
      for (let i = 0; i < newList.length; i++) {
        await storage.updateOrderLocation(newList[i].id, { queuePosition: i + 1 });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/machine-permissions/:userId/:machineId", isRoleAtLeast('manager'), async (req, res, next) => {
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

  // List machine permissions for a machine
  app.get("/api/machine-permissions/machine/:machineId", isRoleAtLeast('manager'), async (req, res, next) => {
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

  // Update accessRole for a permission
  app.put("/api/machine-permissions/:userId/:machineId", isRoleAtLeast('manager'), async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const machineId = parseInt(req.params.machineId);
      const { accessRole } = req.body as { accessRole?: 'operator' | 'admin' };
      if (isNaN(userId) || isNaN(machineId)) {
        throw new ValidationError("Invalid user ID or machine ID format", ["userId", "machineId"]);
      }
      if (accessRole !== 'operator' && accessRole !== 'admin') {
        throw new ValidationError("Invalid accessRole; must be 'operator' or 'admin'", ["accessRole"]);
      }
      const updated = await storage.updateMachinePermissionAccessRole(userId, machineId, accessRole);
      if (!updated) {
        throw new NotFoundError(`Permission not found for user ${userId} and machine ${machineId}`, 'machine_permission', `${userId}:${machineId}` as any);
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/machine-permissions/user/:userId", isAuthenticated, async (req, res, next) => {
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

  // Order Routes with pagination
  app.get("/api/orders", isAuthenticated, async (req, res, next) => {
    try {
      const includeShipped = req.query.includeShipped === "true";
      
      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      
      const paginationOptions: PaginationOptions = { page, pageSize };
      const paginatedOrders = await storage.getAllOrders(includeShipped, paginationOptions);
      res.json(paginatedOrders);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/search", isAuthenticated, async (req, res, next) => {
    try {
      const query = req.query.q as string || "";
      const includeShipped = req.query.includeShipped === "true";
      
      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      
      const paginationOptions: PaginationOptions = { page, pageSize };
      const paginatedOrders = await storage.searchOrders(query, includeShipped, paginationOptions);
      res.json(paginatedOrders);
    } catch (error) {
      next(error);
    }
  });

  // Global queue routes
  app.get("/api/queue/global", isAuthenticated, async (_req, res, next) => {
    try {
      const queue = await storage.getGlobalQueue();
      res.json(queue);
    } catch (error) {
      next(error);
    }
  });

  // Remove an order from all queues (global and locations)
  app.post("/api/queue/global/:orderId/remove", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      await storage.removeOrderFromAllQueues(orderId);
      await storage.createAuditRecord({
        orderId,
        userId: (req.user as any).id,
        action: "queue_removed",
        details: "Order removed from global and all location queues"
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Rush endpoints
  app.post("/api/orders/:orderId/rush", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const now = new Date();
      const updated = await storage.setOrderRush(orderId, now);
      await storage.recalcAllLocationQueues();
      await storage.createAuditRecord({
        orderId,
        userId: (req.user as any).id,
        action: "rush",
        details: `Order marked RUSH at ${now.toISOString()}`
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/orders/:orderId/unrush", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const updated = await storage.unsetOrderRush(orderId);
      await storage.recalcAllLocationQueues();
      await storage.createAuditRecord({
        orderId,
        userId: (req.user as any).id,
        action: "unrush",
        details: "Order rush cleared"
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/queue/global/:orderId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      const position = parseInt(req.body.position ?? '0');
      if (!position || position < 1) {
        throw new ValidationError("Position must be a positive integer", ["position"]);
      }
      // Fetch current queue to enforce rush precedence
      const currentQueue = await storage.getGlobalQueue();
      const target = currentQueue.find(o => o.id === orderId);
      if (!target) {
        throw new NotFoundError(`Order with ID ${orderId} not found in active queue`, 'order', orderId);
      }
      const rushBlockEnd = (() => {
        let lastRushIdx = -1;
        currentQueue.forEach((o, idx) => { if (o.rush) lastRushIdx = idx; });
        return lastRushIdx; // -1 if none
      })();
      if (!target.rush && rushBlockEnd >= 0 && position <= rushBlockEnd + 1) {
        return res.status(400).json({
          message: "Cannot move non-rush order ahead of rush orders",
          errorType: "validation_error",
          minAllowedPosition: rushBlockEnd + 2
        });
      }

      const ok = await storage.setOrderGlobalQueuePosition(orderId, position);
      // Recalculate all location queues based on new global order
      await storage.recalcAllLocationQueues();

      // Audit
      await storage.createAuditRecord({
        orderId,
  userId: (req.user as any).id,
        action: "global_queue_set",
        details: `Set global queue position to ${position}`
      });

      res.json({ success: ok });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      
      const order = await storage.getOrderWithLocations(id);
      if (!order) {
        throw new NotFoundError(`Order with ID ${id} not found`, 'order', id);
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res, next) => {
    try {
      // Get selected location IDs from request (if present)
      const selectedLocationIds = req.body.selectedLocationIds || [];
      
      // Convert timestamp to Date object if needed and add the current user as creator
      const orderFormData = {
        ...req.body,
        // Convert timestamp to Date object if needed
        dueDate: typeof req.body.dueDate === 'number' 
          ? new Date(req.body.dueDate * 1000) // Convert from seconds to milliseconds
          : req.body.dueDate,
        createdBy: (req.user as any).id
      };
      
      const orderData = insertOrderSchema.parse(orderFormData);
      
      const order = await storage.createOrder(orderData);
      
      // Create initial order locations only for selected locations
      if (selectedLocationIds.length > 0) {
        // If specific locations were selected
        for (const locationId of selectedLocationIds) {
          await storage.createOrderLocation({
            orderId: order.id,
            locationId: locationId,
            status: "not_started",
            completedQuantity: 0
          });
        }
      } else {
        // Fallback: Add all locations if none were explicitly selected
        const locations = await storage.getLocationsByOrder();
        for (const location of locations) {
          await storage.createOrderLocation({
            orderId: order.id,
            locationId: location.id,
            status: "not_started",
            completedQuantity: 0
          });
        }
      }
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: order.id,
  userId: (req.user as any).id,
        action: "created",
        details: `Order ${order.orderNumber} created`
      });
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid order data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  app.put("/api/orders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      
      // Convert timestamp to Date object if needed
      const orderFormData = {
        ...req.body,
        // Convert timestamp to Date object if needed
        dueDate: typeof req.body.dueDate === 'number' 
          ? new Date(req.body.dueDate * 1000) // Convert from seconds to milliseconds
          : req.body.dueDate
      };
      
      const updatedOrder = await storage.updateOrder(id, orderFormData);
      if (!updatedOrder) {
        throw new NotFoundError(`Order with ID ${id} not found`, 'order', id);
      }
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: id,
  userId: (req.user as any).id,
        action: "updated",
        details: `Order ${updatedOrder.orderNumber} updated`
      });
      
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/orders/:id", isAdmin, async (req, res, next) => {
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

  app.post("/api/orders/:id/ship", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid order ID format", ["id"]);
      }
      
      const quantity = parseInt(req.body.quantity || "0");
      
      const updatedOrder = await storage.markOrderAsShipped(id, quantity);
      if (!updatedOrder) {
        throw new NotFoundError(`Order with ID ${id} not found`, 'order', id);
      }
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: id,
  userId: (req.user as any).id,
        action: "shipped",
        details: `Shipped ${quantity} units of order ${updatedOrder.orderNumber}`
      });
      
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });

  // Order Location Routes
  app.get("/api/order-locations/order/:orderId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      
      const orderLocations = await storage.getOrderLocationsByOrder(orderId);
      res.json(orderLocations);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/order-locations", isAuthenticated, async (req, res, next) => {
    try {
      const orderLocationData = insertOrderLocationSchema.parse(req.body);
      const orderLocation = await storage.createOrderLocation(orderLocationData);
      res.status(201).json(orderLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid order location data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  
  app.delete("/api/order-locations/:orderId/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      
      // Get all order locations for the order
      const orderLocations = await storage.getOrderLocationsByOrder(orderId);
      
      // Find the location to delete
      const locationToDelete = orderLocations.find(ol => ol.locationId === locationId);
      
      if (!locationToDelete) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, 'order_location', `${orderId}-${locationId}`);
      }
      
      // Delete the order location by creating a new query and passing the ID
      // since the original `orderLocations` is an array from the query results
      await storage.deleteOrderLocation(locationToDelete.id);
      
      // Create audit record for this action
      await storage.createAuditRecord({
        orderId: orderId,
        userId: req.user?.id || 0,
        locationId: locationId,
        action: "location_removed",
        details: `Location removed from order`
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order location:", error);
      next(error);
    }
  });

  app.get("/api/order-locations/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      
      const orderLocations = await storage.getOrderLocationsByLocation(locationId);
      res.json(orderLocations);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/primary-location-orders/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      
      const orders = await storage.getOrdersForPrimaryLocation(locationId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching primary location orders:", error);
      next(error);
    }
  });

  app.get("/api/queue/location/:locationId", isAuthenticated, async (req, res, next) => {
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
  
  app.post("/api/queue/location/:locationId", isAuthenticated, async (req, res, next) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        throw new ValidationError("Invalid location ID format", ["locationId"]);
      }
      
      const { orderId } = req.body;
      
      if (!orderId) {
        throw new ValidationError("Order ID is required", ["orderId"]);
      }
      
      // Check if order already exists in queue
      const queue = await storage.getLocationQueue(locationId);
      const orderAlreadyInQueue = queue.some(item => item.orderId === orderId);
      
      if (orderAlreadyInQueue) {
        throw new ValidationError("Order is already in queue", ["orderId"]);
      }
      
      // Find if an order location relationship already exists or create a new one
      let orderLocation = await db
        .select()
        .from(orderLocations)
        .where(
          and(
            eq(orderLocations.locationId, locationId),
            eq(orderLocations.orderId, orderId)
          )
        )
  .then((results: OrderLocation[]) => results[0]);
        
      if (orderLocation) {
        // Update to in_queue status
        const maxQueuePosition = queue.length > 0 
          ? Math.max(...queue.map(item => item.queuePosition || 0)) 
          : 0;
          
        await db
          .update(orderLocations)
          .set({ 
            status: "in_queue",
            queuePosition: maxQueuePosition + 1
          })
          .where(eq(orderLocations.id, orderLocation.id));
          
        orderLocation = await db
          .select()
          .from(orderLocations)
          .where(eq(orderLocations.id, orderLocation.id))
          .then((results: OrderLocation[]) => results[0]);
      } else {
        // Create new order location
        const maxQueuePosition = queue.length > 0 
          ? Math.max(...queue.map(item => item.queuePosition || 0)) 
          : 0;
          
        orderLocation = await storage.createOrderLocation({
          orderId,
          locationId,
          status: "in_queue",
          completedQuantity: 0,
          queuePosition: maxQueuePosition + 1
        });
      }
      
      // Create audit record
      await storage.createAuditRecord({
        orderId,
  userId: (req.user as any).id,
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

  app.post("/api/order-locations/:orderId/:locationId/start", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      
  const updatedOrderLocation = await storage.startOrderAtLocation(orderId, locationId, (req.user as any).id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, 'order_location', `${orderId}-${locationId}`);
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/finish", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      
      const completedQuantity = parseInt(req.body.completedQuantity || "0");
      
  const updatedOrderLocation = await storage.finishOrderAtLocation(orderId, locationId, completedQuantity, (req.user as any).id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, 'order_location', `${orderId}-${locationId}`);
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/pause", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      
  const updatedOrderLocation = await storage.pauseOrderAtLocation(orderId, locationId, (req.user as any).id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, 'order_location', `${orderId}-${locationId}`);
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/update-quantity", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      if (isNaN(orderId) || isNaN(locationId)) {
        throw new ValidationError("Invalid order ID or location ID format", ["orderId", "locationId"]);
      }
      
      const completedQuantity = parseInt(req.body.completedQuantity || "0");
      
  const updatedOrderLocation = await storage.updateOrderLocationQuantity(orderId, locationId, completedQuantity, (req.user as any).id);
      if (!updatedOrderLocation) {
        throw new NotFoundError(`Order location with order ID ${orderId} and location ID ${locationId} not found`, 'order_location', `${orderId}-${locationId}`);
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      next(error);
    }
  });

  // Audit Trail Routes with pagination
  app.get("/api/audit-trail", isAdmin, async (req, res, next) => {
    try {
      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 50;
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      
      const paginationOptions: PaginationOptions = { page, pageSize };
      const paginatedAuditTrail = await storage.getAllAuditTrail(paginationOptions);
      res.json(paginatedAuditTrail);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/audit-trail/order/:orderId", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        throw new ValidationError("Invalid order ID format", ["orderId"]);
      }
      
      const auditTrail = await storage.getAuditTrailForOrder(orderId);
      res.json(auditTrail);
    } catch (error) {
      next(error);
    }
  });

  // Help Request Routes
  app.post("/api/help-requests", isAuthenticated, async (req, res, next) => {
    try {
      const helpRequestData = insertHelpRequestSchema.parse({
        ...req.body,
  userId: (req.user as any).id
      });
      
      const helpRequest = await storage.createHelpRequest(helpRequestData);
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: helpRequestData.orderId,
  userId: (req.user as any).id,
        locationId: helpRequestData.locationId,
        action: "help_requested",
        details: helpRequestData.notes || "Help requested"
      });
      
      res.status(201).json(helpRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid help request data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  app.post("/api/help-requests/:id/resolve", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid help request ID format", ["id"]);
      }
      
      const resolvedHelpRequest = await storage.resolveHelpRequest(id);
      if (!resolvedHelpRequest) {
        throw new NotFoundError(`Help request with ID ${id} not found`, 'help_request', id);
      }
      res.json(resolvedHelpRequest);
    } catch (error) {
      next(error);
    }
  });

  // Application Settings
  app.get("/api/settings", isAuthenticated, async (_req, res, next) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(
        settings || {
          companyName: "ShopTracker Manufacturing",
          companyLogoUrl: "",
          timeZone: "America/New_York",
          dateFormat: "MM/dd/yyyy",
          autoRefreshInterval: 30,
          enableEmailNotifications: false,
          enablePushNotifications: false,
          orderCompletedNotifications: true,
          helpRequestNotifications: true,
          lowStockNotifications: false,
          requireTwoFactor: false,
          sessionTimeout: 60,
          passwordMinLength: 8,
          requirePasswordComplexity: true,
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/settings", isAdmin, async (req, res, next) => {
    try {
      const type = (req.body.type as string) || "system";
      const payload = { ...req.body };
      delete (payload as any).type;

      // Only allow specific fields depending on tab type
      let allowed: Record<string, true> = {};
      if (type === "system") {
        allowed = { companyName: true, companyLogoUrl: true, timeZone: true, dateFormat: true, autoRefreshInterval: true };
      } else if (type === "notifications") {
        allowed = {
          enableEmailNotifications: true,
          enablePushNotifications: true,
          orderCompletedNotifications: true,
          helpRequestNotifications: true,
          lowStockNotifications: true,
        };
      } else if (type === "security") {
        allowed = {
          requireTwoFactor: true,
          sessionTimeout: true,
          passwordMinLength: true,
          requirePasswordComplexity: true,
        };
      }
      const updateData: any = {};
      Object.keys(payload).forEach((k) => {
        if (allowed[k]) updateData[k] = payload[k];
      });

      const updated = await storage.updateAppSettings(updateData);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/help-requests/active", isAuthenticated, async (req, res, next) => {
    try {
      const helpRequests = await storage.getActiveHelpRequests();
      res.json(helpRequests);
    } catch (error) {
      next(error);
    }
  });
  
  // Help-requests history (active + resolved)
  app.get("/api/help-requests/all", isAuthenticated, async (_req, res, next) => {
    try {
      const helpRequests = await storage.getAllHelpRequests();
      res.json(helpRequests);
    } catch (error) {
      next(error);
    }
  });

  // Email Settings Routes
  app.get("/api/email-settings", isAdmin, async (req, res, next) => {
    try {
      const emailSettings = await storage.getAllEmailSettings();
      res.json(emailSettings);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/email-settings", isAdmin, async (req, res, next) => {
    try {
      const emailSettingData = insertEmailSettingSchema.parse(req.body);
      const emailSetting = await storage.addEmailSetting(emailSettingData);
      res.status(201).json(emailSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid email setting data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });

  app.put("/api/email-settings/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid email setting ID format", ["id"]);
      }
      
      const emailSettingData = req.body;
      const updatedEmailSetting = await storage.updateEmailSetting(id, emailSettingData);
      if (!updatedEmailSetting) {
        throw new NotFoundError(`Email setting with ID ${id} not found`, 'email_setting', id);
      }
      res.json(updatedEmailSetting);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/email-settings/:id", isAdmin, async (req, res, next) => {
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

  // PDF Settings Routes
  app.get("/api/pdf-settings", isAuthenticated, async (req, res, next) => {
    try {
      const pdfSettings = await storage.getPdfSettings();
      res.json(pdfSettings || { pdfPrefix: "", pdfPostfix: ".pdf" });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/pdf-settings", isAdmin, async (req, res, next) => {
    try {
      const pdfSettingData = insertPdfSettingSchema.parse(req.body);
      const updatedPdfSetting = await storage.updatePdfSettings(pdfSettingData);
      res.json(updatedPdfSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid PDF setting data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  
  // RFID Card Management Routes
  app.get("/api/rfid-cards", isAdmin, async (req, res, next) => {
    try {
      const cards = await storage.getAllRfidCards();
      res.json(cards);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/rfid-cards", isAdmin, async (req, res, next) => {
    try {
      const cardData = insertRfidCardSchema.parse(req.body);
      const card = await storage.createRfidCard(cardData);
      res.status(201).json(card);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid RFID card data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  
  app.put("/api/rfid-cards/:cardId", isAdmin, async (req, res, next) => {
    try {
      const cardId = req.params.cardId;
      const cardData = req.body;
      const updatedCard = await storage.updateRfidCard(cardId, cardData);
      if (!updatedCard) {
        throw new NotFoundError(`RFID card with ID ${cardId} not found`, 'rfid_card', cardId);
      }
      res.json(updatedCard);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/rfid-cards/:cardId", isAdmin, async (req, res, next) => {
    try {
      const cardId = req.params.cardId;
      await storage.deleteRfidCard(cardId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // Access Level Management Routes
  app.get("/api/access-levels", isAdmin, async (req, res, next) => {
    try {
      const accessLevels = await storage.getAllAccessLevels();
      res.json(accessLevels);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/access-levels", isAdmin, async (req, res, next) => {
    try {
      const accessLevelData = insertAccessLevelSchema.parse(req.body);
      const accessLevel = await storage.createAccessLevel(accessLevelData);
      res.status(201).json(accessLevel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid access level data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      next(error);
    }
  });
  
  app.put("/api/access-levels/:id", isAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid access level ID format", ["id"]);
      }
      
      const accessLevelData = req.body;
      const updatedAccessLevel = await storage.updateAccessLevel(id, accessLevelData);
      if (!updatedAccessLevel) {
        throw new NotFoundError(`Access level with ID ${id} not found`, 'access_level', id);
      }
      res.json(updatedAccessLevel);
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/access-levels/:id", isAdmin, async (req, res, next) => {
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
  
  // Access Log Routes with pagination
  app.get("/api/access-logs/recent", isAdmin, async (req, res, next) => {
    try {
      // Parse pagination parameters
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 50;
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        throw new ValidationError("Invalid page number", ["page"]);
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new ValidationError("Page size must be between 1 and 100", ["pageSize"]);
      }
      
      const paginationOptions: PaginationOptions = { page, pageSize };
      const paginatedLogs = await storage.getRecentAccessLogs(paginationOptions);
      res.json(paginatedLogs);
    } catch (error) {
      next(error);
    }
  });

  // Machine Alerts API Routes (Bidirectional Communication)
  // Get pending alert count (for notification badge)
  app.get("/api/alerts/pending/count", isAuthenticated, async (req, res, next) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json({ count: alerts.length });
    } catch (error) {
      console.error("Error fetching pending alert count:", error);
      next(error);
    }
  });
  
  // Get all alerts
  app.get("/api/alerts", isAuthenticated, async (req, res, next) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      next(error);
    }
  });
  
  // Alerts scoped for current user (non-manager: limited by machine permissions)
  app.get("/api/alerts/for-user", isAuthenticated, async (req, res, next) => {
    try {
      const role = (req.user as any).role as string;
      if (["admin","manager"].includes(role)) {
        const alerts = await storage.getPendingMachineAlerts();
        return res.json(alerts);
      }
      const perms = await storage.getMachinePermissionsForUser((req.user as any).id);
      const ids = new Set(perms.map(p => p.machineId.toString()));
      const all = await storage.getPendingMachineAlerts();
      const scoped = all.filter(a => ids.has(a.machineId.toString()));
      res.json(scoped);
    } catch (error) {
      next(error);
    }
  });
  
  // Get alerts history (all statuses)
  app.get("/api/alerts/all", isAuthenticated, async (_req, res, next) => {
    try {
      const alerts = await storage.getAllMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alert history:", error);
      next(error);
    }
  });
  
  // Get alerts for a specific machine
  app.get("/api/alerts/machine/:machineId", isAuthenticated, async (req, res, next) => {
    try {
      const machineId = req.params.machineId;
      const alerts = await storage.getMachineAlertsByMachine(machineId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching machine alerts:", error);
      next(error);
    }
  });
  
  // Create a new alert
  app.post("/api/alerts", isAuthenticated, async (req, res, next) => {
    try {
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        senderId: (req.user as any).id,
        origin: "system"
      });
      
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid alert data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      console.error("Error creating alert:", error);
      next(error);
    }
  });
  
  // Resolve an alert
  app.post("/api/alerts/:id/resolve", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      
  const alert = await storage.resolveMachineAlert(id, (req.user as any).id);
      
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, 'alert', id);
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      next(error);
    }
  });
  
  // Acknowledge an alert
  app.post("/api/alerts/:id/acknowledge", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      
      const alert = await storage.acknowledgeMachineAlert(id);
      
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, 'alert', id);
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      next(error);
    }
  });
  
  // Legacy endpoints (for backward compatibility)
  app.get("/api/machine-alerts/pending", isAuthenticated, async (req, res, next) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching pending machine alerts:", error);
      next(error);
    }
  });
  
  app.get("/api/machine-alerts/machine/:machineId", isAuthenticated, async (req, res, next) => {
    try {
      const machineId = req.params.machineId;
      const alerts = await storage.getMachineAlertsByMachine(machineId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching machine alerts:", error);
      next(error);
    }
  });
  
  app.post("/api/machine-alerts", isAuthenticated, async (req, res, next) => {
    try {
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        senderId: (req.user as any).id,
        origin: "system"
      });
      
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid alert data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      console.error("Error creating machine alert:", error);
      next(error);
    }
  });
  
  app.post("/api/machine-alerts/resolve/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      
  const alert = await storage.resolveMachineAlert(id, (req.user as any).id);
      
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, 'alert', id);
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error resolving machine alert:", error);
      next(error);
    }
  });
  
  app.post("/api/machine-alerts/acknowledge/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("Invalid alert ID format", ["id"]);
      }
      
      const alert = await storage.acknowledgeMachineAlert(id);
      
      if (!alert) {
        throw new NotFoundError(`Alert with ID ${id} not found`, 'alert', id);
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging machine alert:", error);
      next(error);
    }
  });
  
  // External API Alert Endpoint (for ShopMonitor)
  app.post("/api/external/machine-alert", async (req, res, next) => {
    try {
      // Validate request has API key
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new ValidationError("API key is required", ["x-api-key"]);
      }
      
      // Validate API key against stored key
      const config = await storage.getApiConfig();
      if (!config || config.shopMonitorApiKey !== apiKey) {
        throw new ValidationError("Invalid API key", ["x-api-key"]);
      }
      
      // Validate alert data
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        origin: "machine"
      });
      
      // Create the alert
      const alert = await storage.createMachineAlert(alertData);
      
      res.status(201).json({
        success: true,
        alert_id: alert.id,
        message: "Alert received successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(
          "Invalid alert data", 
          error.errors.map(e => e.path.join('.'))
        );
        return next(validationError);
      }
      console.error("Error processing external machine alert:", error);
      next(error);
    }
  });

  // API Configuration Routes
  app.get("/api/api-config", isAdmin, async (req, res, next) => {
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

  // Database info for diagnostics (admin)
  app.get('/api/db-info', isAdmin, async (req, res, next) => {
    try {
      const url = process.env.DATABASE_URL || ''
      const parsed = (() => {
        try {
          const u = new URL(url)
          return {
            protocol: u.protocol.replace(':',''),
            host: u.hostname,
            port: u.port,
            database: u.pathname.replace(/^\//,'') || undefined,
            user: decodeURIComponent(u.username || ''),
            hasPassword: !!u.password,
            raw: url,
          }
        } catch {
          return null
        }
      })()

      // Query server-side details
      const dbNameRows: any = await db.execute(sql`select current_database() as current_database` as any)
      const userRows: any = await db.execute(sql`select current_user as current_user` as any)
      const searchPathRows: any = await db.execute(sql`SHOW search_path` as any)
      // List tables in our schema
      const tableRows: any = await db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'shoptracker'
        ORDER BY table_name
      ` as any)

      res.json({
        env: {
          nodeEnv: process.env.NODE_ENV,
        },
        connection: parsed,
        server: {
          database: Array.isArray(dbNameRows) ? dbNameRows[0]?.current_database : dbNameRows?.rows?.[0]?.current_database,
          user: Array.isArray(userRows) ? userRows[0]?.current_user : userRows?.rows?.[0]?.current_user,
          searchPath: Array.isArray(searchPathRows) ? searchPathRows[0]?.search_path : searchPathRows?.rows?.[0]?.search_path,
          schema: 'shoptracker',
          tables: Array.isArray(tableRows) ? tableRows.map((t: any) => t.table_name) : tableRows?.rows?.map((t: any) => t.table_name) || [],
        },
      })
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/api-config", isAdmin, async (req, res, next) => {
    try {
      const configData = req.body;
      const updatedConfig = await storage.updateApiConfig(configData);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating API config:", error);
      next(error);
    }
  });

  app.post("/api/api-config/test", isAdmin, async (req, res, next) => {
    try {
      const { shopMonitorApiUrl, shopMonitorApiKey } = req.body;
      
      // Validate required fields
      if (!shopMonitorApiUrl || !shopMonitorApiKey) {
        throw new ValidationError("API URL and API Key are required", ["shopMonitorApiUrl", "shopMonitorApiKey"]);
      }

      // Attempt to make an actual API call to test the connection
      try {
        const response = await fetch(`${shopMonitorApiUrl}/api/ping`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'x-api-key': shopMonitorApiKey
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
  } catch (fetchError: any) {
        // Handle network or other fetch errors
        throw new ValidationError(`Connection failed: ${fetchError.message}`, ["shopMonitorApiUrl", "shopMonitorApiKey"]);
      }
    } catch (error) {
      console.error("Error testing API connection:", error);
      next(error);
    }
  });
  
  // Sync Management Routes
  app.get("/api/sync/status", isAdmin, async (req, res, next) => {
    try {
      const { syncManager } = await import('./sync');
      res.json(syncManager.getStatus());
    } catch (error) {
      console.error("Error getting sync status:", error);
      next(error);
    }
  });
  
  app.post("/api/sync/start", isAdmin, async (req, res, next) => {
    try {
      const { syncManager } = await import('./sync');
      const config = await storage.getApiConfig();
      
      if (!config) {
        throw new ValidationError("No API configuration found", ["apiConfig"]);
      }
      
      // Update config to enable sync
      if (!config.syncEnabled) {
        await storage.updateApiConfig({
          ...config,
          syncEnabled: true
        });
      }
      
      // Start the sync process with the specified interval
      syncManager.startSync(config.syncInterval || 5);
      
      res.json({ 
        success: true, 
        message: "Sync process started" 
      });
    } catch (error) {
      console.error("Error starting sync:", error);
      next(error);
    }
  });
  
  app.post("/api/sync/stop", isAdmin, async (req, res, next) => {
    try {
      const { syncManager } = await import('./sync');
      const config = await storage.getApiConfig();
      
      if (config) {
        // Update config to disable sync
        await storage.updateApiConfig({
          ...config,
          syncEnabled: false
        });
      }
      
      // Stop the sync process
      syncManager.stopSync();
      
      res.json({ 
        success: true, 
        message: "Sync process stopped" 
      });
    } catch (error) {
      console.error("Error stopping sync:", error);
      next(error);
    }
  });
  
  app.post("/api/sync/now", isAdmin, async (req, res, next) => {
    try {
      const { syncManager } = await import('./sync');
      
      // Trigger an immediate sync
      await syncManager.performSync();
      
      res.json({ 
        success: true, 
        message: "Sync process triggered",
        lastSyncTime: syncManager.getLastSyncTime()
      });
    } catch (error) {
      console.error("Error triggering sync:", error);
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
