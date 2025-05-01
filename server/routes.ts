import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
  orderLocations,
  laserAuthRequestSchema,
  insertRfidCardSchema,
  insertAccessLevelSchema,
  insertAccessLogSchema
} from "@shared/schema";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin role required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // *** NooyenMachineMonitor API Integration Endpoints ***
  
  // Development utility route to reset users table and recreate default admin
  app.post("/api/dev/reset-users", async (req, res) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV !== "development") {
        return res.status(403).json({ message: "This endpoint is only available in development mode" });
      }
      
      // Delete all users
      await storage.resetUsers();
      
      // Setup auth will automatically recreate the default admin
      await setupAuth(app);
      
      res.json({ message: "Users table reset, default admin recreated" });
    } catch (error) {
      console.error("Error resetting users:", error);
      res.status(500).json({ message: "Failed to reset users table" });
    }
  });
  
  // Setup authentication routes
  await setupAuth(app);
  
  // Laser System Authentication API
  app.post("/api/auth", async (req, res) => {
    try {
      // Validate request
      const authRequest = laserAuthRequestSchema.parse(req.body);
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
      console.error("Laser auth error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid request format", 
          errors: error.errors
        });
      }
      res.status(500).json({ 
        success: false,
        message: "Authentication service error"
      });
    }
  });

  // User Routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Notification Preferences Route
  app.put("/api/user/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      // Parse and validate the incoming data
      const preferencesData = notificationPreferencesSchema.parse(req.body);
      
      // Ensure the user ID is available
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
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
      const updatedUser = await storage.updateUser(req.user.id, userUpdateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification preferences data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Location Routes
  app.get("/api/locations", isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocationsByOrder();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });
  
  app.get("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getLocation(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ message: "Failed to fetch location details" });
    }
  });

  app.post("/api/locations", isAdmin, async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  app.put("/api/locations/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const locationData = req.body;
      const updatedLocation = await storage.updateLocation(id, locationData);
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(updatedLocation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.delete("/api/locations/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLocation(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Machine Routes
  app.get("/api/machines", isAuthenticated, async (req, res) => {
    try {
      const machines = await storage.getAllMachines();
      res.json(machines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch machines" });
    }
  });
  
  app.get("/api/machines/location/:locationId", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const machines = await storage.getMachinesByLocation(locationId);
      res.json(machines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch machines for location" });
    }
  });
  
  app.get("/api/machines/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const machine = await storage.getMachine(id);
      if (!machine) {
        return res.status(404).json({ message: "Machine not found" });
      }
      res.json(machine);
    } catch (error) {
      console.error("Error fetching machine:", error);
      res.status(500).json({ message: "Failed to fetch machine details" });
    }
  });

  app.post("/api/machines", isAdmin, async (req, res) => {
    try {
      const machineData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(machineData);
      res.status(201).json(machine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid machine data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create machine" });
    }
  });

  app.put("/api/machines/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const machineData = req.body;
      const updatedMachine = await storage.updateMachine(id, machineData);
      if (!updatedMachine) {
        return res.status(404).json({ message: "Machine not found" });
      }
      res.json(updatedMachine);
    } catch (error) {
      res.status(500).json({ message: "Failed to update machine" });
    }
  });

  app.delete("/api/machines/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMachine(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete machine" });
    }
  });

  // Machine Permissions Routes
  app.post("/api/machine-permissions", isAdmin, async (req, res) => {
    try {
      const permissionData = insertMachinePermissionSchema.parse(req.body);
      const permission = await storage.addMachinePermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid permission data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add machine permission" });
    }
  });

  app.delete("/api/machine-permissions/:userId/:machineId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const machineId = parseInt(req.params.machineId);
      await storage.removeMachinePermission(userId, machineId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove machine permission" });
    }
  });

  app.get("/api/machine-permissions/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const permissions = await storage.getMachinePermissionsForUser(userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch machine permissions" });
    }
  });

  // Order Routes
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const includeShipped = req.query.includeShipped === "true";
      const orders = await storage.getAllOrders(includeShipped);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/search", isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const includeShipped = req.query.includeShipped === "true";
      const orders = await storage.searchOrders(query, includeShipped);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to search orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderWithLocations(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
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
        createdBy: req.user.id
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
        userId: req.user.id,
        action: "created",
        details: `Order ${order.orderNumber} created`
      });
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
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
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: id,
        userId: req.user.id,
        action: "updated",
        details: `Order ${updatedOrder.orderNumber} updated`
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOrder(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  app.post("/api/orders/:id/ship", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quantity = parseInt(req.body.quantity || "0");
      
      const updatedOrder = await storage.markOrderAsShipped(id, quantity);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: id,
        userId: req.user.id,
        action: "shipped",
        details: `Shipped ${quantity} units of order ${updatedOrder.orderNumber}`
      });
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark order as shipped" });
    }
  });

  // Order Location Routes
  app.get("/api/order-locations/order/:orderId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const orderLocations = await storage.getOrderLocationsByOrder(orderId);
      res.json(orderLocations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order locations" });
    }
  });
  
  app.post("/api/order-locations", isAuthenticated, async (req, res) => {
    try {
      const orderLocationData = insertOrderLocationSchema.parse(req.body);
      const orderLocation = await storage.createOrderLocation(orderLocationData);
      res.status(201).json(orderLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order location data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order location" });
    }
  });
  
  app.delete("/api/order-locations/:orderId/:locationId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      
      // Get all order locations for the order
      const orderLocations = await storage.getOrderLocationsByOrder(orderId);
      
      // Find the location to delete
      const locationToDelete = orderLocations.find(ol => ol.locationId === locationId);
      
      if (!locationToDelete) {
        return res.status(404).json({ message: "Order location not found" });
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
      res.status(500).json({ message: "Failed to delete order location" });
    }
  });

  app.get("/api/order-locations/location/:locationId", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const orderLocations = await storage.getOrderLocationsByLocation(locationId);
      res.json(orderLocations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders for location" });
    }
  });
  
  app.get("/api/primary-location-orders/:locationId", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const orders = await storage.getOrdersForPrimaryLocation(locationId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching primary location orders:", error);
      res.status(500).json({ message: "Failed to fetch potential orders for primary location" });
    }
  });

  app.get("/api/queue/location/:locationId", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const queue = await storage.getLocationQueue(locationId);
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue for location" });
    }
  });
  
  app.post("/api/queue/location/:locationId", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      // Check if order already exists in queue
      const queue = await storage.getLocationQueue(locationId);
      const orderAlreadyInQueue = queue.some(item => item.orderId === orderId);
      
      if (orderAlreadyInQueue) {
        return res.status(400).json({ message: "Order is already in queue" });
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
        .then(results => results[0]);
        
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
          .then(results => results[0]);
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
        userId: req.user.id,
        locationId,
        action: "queued",
        details: "Order queued for processing"
      });
      
      res.status(201).json(orderLocation);
    } catch (error) {
      console.error("Error adding to queue:", error);
      res.status(500).json({ message: "Failed to add to queue" });
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/start", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      
      const updatedOrderLocation = await storage.startOrderAtLocation(orderId, locationId, req.user.id);
      if (!updatedOrderLocation) {
        return res.status(404).json({ message: "Order location not found" });
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      res.status(500).json({ message: "Failed to start order at location" });
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/finish", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      const completedQuantity = parseInt(req.body.completedQuantity || "0");
      
      const updatedOrderLocation = await storage.finishOrderAtLocation(orderId, locationId, completedQuantity, req.user.id);
      if (!updatedOrderLocation) {
        return res.status(404).json({ message: "Order location not found" });
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      res.status(500).json({ message: "Failed to finish order at location" });
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/pause", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      
      const updatedOrderLocation = await storage.pauseOrderAtLocation(orderId, locationId, req.user.id);
      if (!updatedOrderLocation) {
        return res.status(404).json({ message: "Order location not found" });
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      res.status(500).json({ message: "Failed to pause order at location" });
    }
  });

  app.post("/api/order-locations/:orderId/:locationId/update-quantity", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const locationId = parseInt(req.params.locationId);
      const completedQuantity = parseInt(req.body.completedQuantity || "0");
      
      const updatedOrderLocation = await storage.updateOrderLocationQuantity(orderId, locationId, completedQuantity, req.user.id);
      if (!updatedOrderLocation) {
        return res.status(404).json({ message: "Order location not found" });
      }
      
      res.json(updatedOrderLocation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order quantity" });
    }
  });

  // Audit Trail Routes
  app.get("/api/audit-trail", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const auditTrail = await storage.getAllAuditTrail(limit);
      res.json(auditTrail);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  app.get("/api/audit-trail/order/:orderId", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const auditTrail = await storage.getAuditTrailForOrder(orderId);
      res.json(auditTrail);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit trail for order" });
    }
  });

  // Help Request Routes
  app.post("/api/help-requests", isAuthenticated, async (req, res) => {
    try {
      const helpRequestData = insertHelpRequestSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const helpRequest = await storage.createHelpRequest(helpRequestData);
      
      // Create audit record
      await storage.createAuditRecord({
        orderId: helpRequestData.orderId,
        userId: req.user.id,
        locationId: helpRequestData.locationId,
        action: "help_requested",
        details: helpRequestData.notes || "Help requested"
      });
      
      res.status(201).json(helpRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid help request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create help request" });
    }
  });

  app.post("/api/help-requests/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resolvedHelpRequest = await storage.resolveHelpRequest(id);
      if (!resolvedHelpRequest) {
        return res.status(404).json({ message: "Help request not found" });
      }
      res.json(resolvedHelpRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve help request" });
    }
  });

  app.get("/api/help-requests/active", isAuthenticated, async (req, res) => {
    try {
      const helpRequests = await storage.getActiveHelpRequests();
      res.json(helpRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active help requests" });
    }
  });

  // Email Settings Routes
  app.get("/api/email-settings", isAdmin, async (req, res) => {
    try {
      const emailSettings = await storage.getAllEmailSettings();
      res.json(emailSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  app.post("/api/email-settings", isAdmin, async (req, res) => {
    try {
      const emailSettingData = insertEmailSettingSchema.parse(req.body);
      const emailSetting = await storage.addEmailSetting(emailSettingData);
      res.status(201).json(emailSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email setting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add email setting" });
    }
  });

  app.put("/api/email-settings/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const emailSettingData = req.body;
      const updatedEmailSetting = await storage.updateEmailSetting(id, emailSettingData);
      if (!updatedEmailSetting) {
        return res.status(404).json({ message: "Email setting not found" });
      }
      res.json(updatedEmailSetting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email setting" });
    }
  });

  app.delete("/api/email-settings/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmailSetting(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email setting" });
    }
  });

  // PDF Settings Routes
  app.get("/api/pdf-settings", isAuthenticated, async (req, res) => {
    try {
      const pdfSettings = await storage.getPdfSettings();
      res.json(pdfSettings || { pdfPrefix: "", pdfPostfix: ".pdf" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PDF settings" });
    }
  });

  app.put("/api/pdf-settings", isAdmin, async (req, res) => {
    try {
      const pdfSettingData = insertPdfSettingSchema.parse(req.body);
      const updatedPdfSetting = await storage.updatePdfSettings(pdfSettingData);
      res.json(updatedPdfSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid PDF setting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update PDF settings" });
    }
  });
  
  // RFID Card Management Routes
  app.get("/api/rfid-cards", isAdmin, async (req, res) => {
    try {
      const cards = await storage.getAllRfidCards();
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RFID cards" });
    }
  });
  
  app.post("/api/rfid-cards", isAdmin, async (req, res) => {
    try {
      const cardData = insertRfidCardSchema.parse(req.body);
      const card = await storage.createRfidCard(cardData);
      res.status(201).json(card);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid RFID card data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create RFID card" });
    }
  });
  
  app.put("/api/rfid-cards/:cardId", isAdmin, async (req, res) => {
    try {
      const cardId = req.params.cardId;
      const cardData = req.body;
      const updatedCard = await storage.updateRfidCard(cardId, cardData);
      if (!updatedCard) {
        return res.status(404).json({ message: "RFID card not found" });
      }
      res.json(updatedCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to update RFID card" });
    }
  });
  
  app.delete("/api/rfid-cards/:cardId", isAdmin, async (req, res) => {
    try {
      const cardId = req.params.cardId;
      await storage.deleteRfidCard(cardId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete RFID card" });
    }
  });
  
  // Access Level Management Routes
  app.get("/api/access-levels", isAdmin, async (req, res) => {
    try {
      const accessLevels = await storage.getAllAccessLevels();
      res.json(accessLevels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access levels" });
    }
  });
  
  app.post("/api/access-levels", isAdmin, async (req, res) => {
    try {
      const accessLevelData = insertAccessLevelSchema.parse(req.body);
      const accessLevel = await storage.createAccessLevel(accessLevelData);
      res.status(201).json(accessLevel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid access level data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create access level" });
    }
  });
  
  app.put("/api/access-levels/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const accessLevelData = req.body;
      const updatedAccessLevel = await storage.updateAccessLevel(id, accessLevelData);
      if (!updatedAccessLevel) {
        return res.status(404).json({ message: "Access level not found" });
      }
      res.json(updatedAccessLevel);
    } catch (error) {
      res.status(500).json({ message: "Failed to update access level" });
    }
  });
  
  app.delete("/api/access-levels/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccessLevel(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete access level" });
    }
  });
  
  // Access Log Routes
  app.get("/api/access-logs/recent", isAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getRecentAccessLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // Machine Alerts API Routes (Bidirectional Communication)
  // Get pending alert count (for notification badge)
  app.get("/api/alerts/pending/count", isAuthenticated, async (req, res) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json({ count: alerts.length });
    } catch (error) {
      console.error("Error fetching pending alert count:", error);
      res.status(500).json({ message: "Failed to fetch pending alert count" });
    }
  });
  
  // Get all alerts
  app.get("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });
  
  // Get alerts for a specific machine
  app.get("/api/alerts/machine/:machineId", isAuthenticated, async (req, res) => {
    try {
      const machineId = req.params.machineId;
      const alerts = await storage.getMachineAlertsByMachine(machineId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching machine alerts:", error);
      res.status(500).json({ message: "Failed to fetch machine alerts" });
    }
  });
  
  // Create a new alert
  app.post("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        senderId: req.user.id,
        origin: "system"
      });
      
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid alert data", errors: error.errors });
      }
      console.error("Error creating alert:", error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });
  
  // Resolve an alert
  app.post("/api/alerts/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.resolveMachineAlert(id, req.user.id);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });
  
  // Acknowledge an alert
  app.post("/api/alerts/:id/acknowledge", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.acknowledgeMachineAlert(id);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });
  
  // Legacy endpoints (for backward compatibility)
  app.get("/api/machine-alerts/pending", isAuthenticated, async (req, res) => {
    try {
      const alerts = await storage.getPendingMachineAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching pending machine alerts:", error);
      res.status(500).json({ message: "Failed to fetch pending machine alerts" });
    }
  });
  
  app.get("/api/machine-alerts/machine/:machineId", isAuthenticated, async (req, res) => {
    try {
      const machineId = req.params.machineId;
      const alerts = await storage.getMachineAlertsByMachine(machineId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching machine alerts:", error);
      res.status(500).json({ message: "Failed to fetch machine alerts" });
    }
  });
  
  app.post("/api/machine-alerts", isAuthenticated, async (req, res) => {
    try {
      const alertData = insertMachineAlertSchema.parse({
        ...req.body,
        senderId: req.user.id,
        origin: "system"
      });
      
      const alert = await storage.createMachineAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid alert data", errors: error.errors });
      }
      console.error("Error creating machine alert:", error);
      res.status(500).json({ message: "Failed to create machine alert" });
    }
  });
  
  app.post("/api/machine-alerts/resolve/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.resolveMachineAlert(id, req.user.id);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error resolving machine alert:", error);
      res.status(500).json({ message: "Failed to resolve machine alert" });
    }
  });
  
  app.post("/api/machine-alerts/acknowledge/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.acknowledgeMachineAlert(id);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging machine alert:", error);
      res.status(500).json({ message: "Failed to acknowledge machine alert" });
    }
  });
  
  // External API Alert Endpoint (for NooyenMachineMonitor)
  app.post("/api/external/machine-alert", async (req, res) => {
    try {
      // Validate request has API key
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ 
          success: false,
          message: "API key is required" 
        });
      }
      
      // Validate API key against stored key
      const config = await storage.getApiConfig();
      if (!config || config.machineMonitorApiKey !== apiKey) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid API key" 
        });
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
        return res.status(400).json({ 
          success: false,
          message: "Invalid alert data", 
          errors: error.errors 
        });
      }
      console.error("Error processing external machine alert:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process alert" 
      });
    }
  });

  // API Configuration Routes
  app.get("/api/api-config", isAdmin, async (req, res) => {
    try {
      const config = await storage.getApiConfig();
      if (!config) {
        return res.json({
          machineMonitorApiKey: "",
          machineMonitorApiUrl: "",
          syncEnabled: false,
          syncInterval: 60
        });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching API config:", error);
      res.status(500).json({ message: "Failed to fetch API configuration" });
    }
  });

  app.post("/api/api-config", isAdmin, async (req, res) => {
    try {
      const configData = req.body;
      const updatedConfig = await storage.updateApiConfig(configData);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating API config:", error);
      res.status(500).json({ message: "Failed to update API configuration" });
    }
  });

  app.post("/api/api-config/test", isAdmin, async (req, res) => {
    try {
      const { machineMonitorApiUrl, machineMonitorApiKey } = req.body;
      
      // Validate required fields
      if (!machineMonitorApiUrl || !machineMonitorApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: "API URL and API Key are required" 
        });
      }

      // Attempt to make an actual API call to test the connection
      try {
        const response = await fetch(`${machineMonitorApiUrl}/api/ping`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'x-api-key': machineMonitorApiKey
          }
        });

        if (response.ok) {
          const data = await response.json();
          res.json({ 
            success: true, 
            message: "Connection to NooyenMachineMonitor API successful",
            data
          });
        } else {
          const errorText = await response.text();
          res.status(400).json({ 
            success: false, 
            message: `Failed to connect to NooyenMachineMonitor API: ${response.status} ${errorText}` 
          });
        }
      } catch (fetchError) {
        // Handle network or other fetch errors
        res.status(400).json({ 
          success: false, 
          message: `Connection failed: ${fetchError.message}` 
        });
      }
    } catch (error) {
      console.error("Error testing API connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error testing connection to NooyenMachineMonitor API" 
      });
    }
  });
  
  // Sync Management Routes
  app.get("/api/sync/status", isAdmin, async (req, res) => {
    try {
      const { syncManager } = await import('./sync');
      res.json(syncManager.getStatus());
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });
  
  app.post("/api/sync/start", isAdmin, async (req, res) => {
    try {
      const { syncManager } = await import('./sync');
      const config = await storage.getApiConfig();
      
      if (!config) {
        return res.status(400).json({ 
          success: false, 
          message: "No API configuration found" 
        });
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
      res.status(500).json({ 
        success: false, 
        message: "Failed to start sync process" 
      });
    }
  });
  
  app.post("/api/sync/stop", isAdmin, async (req, res) => {
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
      res.status(500).json({ 
        success: false, 
        message: "Failed to stop sync process" 
      });
    }
  });
  
  app.post("/api/sync/now", isAdmin, async (req, res) => {
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
      res.status(500).json({ 
        success: false, 
        message: "Failed to trigger sync process" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
