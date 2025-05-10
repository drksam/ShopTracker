import { db } from "./db";
import { eq, and, isNull, desc, asc, sql, like, lt, gt, or, inArray } from "drizzle-orm";
import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { 
  users, 
  locations, 
  machines, 
  machinePermissions, 
  orders, 
  orderLocations, 
  auditTrail, 
  helpRequests,
  emailSettings,
  pdfSettings,
  rfidCards,
  accessLevels,
  accessLogs,
  machineAlerts,
  apiConfigs,
  type User, 
  type InsertUser,
  type Location,
  type InsertLocation,
  type Machine,
  type InsertMachine,
  type MachinePermission,
  type InsertMachinePermission,
  type Order,
  type InsertOrder,
  type OrderLocation,
  type InsertOrderLocation,
  type AuditTrail,
  type InsertAuditTrail,
  type HelpRequest,
  type InsertHelpRequest,
  type EmailSetting,
  type InsertEmailSetting,
  type PdfSetting,
  type InsertPdfSetting,
  type OrderWithLocations,
  type OrderWithDetails,
  type RfidCard,
  type InsertRfidCard,
  type AccessLevel,
  type InsertAccessLevel,
  type AccessLog,
  type InsertAccessLog,
  type MachineAlert,
  type InsertMachineAlert,
  type ApiConfig,
  type InsertApiConfig
} from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // Development/Testing helpers
  resetUsers(): Promise<void>;

  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Location management
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;
  getLocation(id: number): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  getLocationsByOrder(): Promise<Location[]>;

  // Machine management
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachine(id: number, machineData: Partial<InsertMachine>): Promise<Machine | undefined>;
  deleteMachine(id: number): Promise<boolean>;
  getMachine(id: number): Promise<Machine | undefined>;
  getMachinesByLocation(locationId: number): Promise<Machine[]>;
  getAllMachines(): Promise<Machine[]>;

  // Machine permissions
  addMachinePermission(permission: InsertMachinePermission): Promise<MachinePermission>;
  removeMachinePermission(userId: number, machineId: number): Promise<boolean>;
  getMachinePermissionsForUser(userId: number): Promise<MachinePermission[]>;

  // Order management
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithLocations(id: number): Promise<OrderWithDetails | undefined>;
  getAllOrders(includeShipped: boolean): Promise<OrderWithLocations[]>;
  searchOrders(query: string, includeShipped: boolean): Promise<OrderWithLocations[]>;
  markOrderAsShipped(id: number, quantity: number): Promise<Order | undefined>;

  // Order location management
  createOrderLocation(orderLocation: InsertOrderLocation): Promise<OrderLocation>;
  updateOrderLocation(id: number, data: Partial<InsertOrderLocation>): Promise<OrderLocation | undefined>;
  deleteOrderLocation(id: number): Promise<boolean>;
  getOrderLocation(id: number): Promise<OrderLocation | undefined>;
  getOrderLocationsByOrder(orderId: number): Promise<OrderLocation[]>;
  getOrderLocationsByLocation(locationId: number): Promise<(OrderLocation & { order: Order })[]>;
  getOrdersForPrimaryLocation(locationId: number): Promise<Order[]>;
  startOrderAtLocation(orderId: number, locationId: number, userId: number): Promise<OrderLocation | undefined>;
  finishOrderAtLocation(orderId: number, locationId: number, completedQuantity: number, userId: number): Promise<OrderLocation | undefined>;
  pauseOrderAtLocation(orderId: number, locationId: number, userId: number): Promise<OrderLocation | undefined>;
  updateOrderLocationQuantity(orderId: number, locationId: number, completedQuantity: number, userId: number): Promise<OrderLocation | undefined>;
  getLocationQueue(locationId: number): Promise<(OrderLocation & { order: Order })[]>;
  updateQueuePositions(locationId: number): Promise<boolean>;

  // Audit trail
  createAuditRecord(audit: InsertAuditTrail): Promise<AuditTrail>;
  getAuditTrailForOrder(orderId: number): Promise<AuditTrail[]>;
  getAllAuditTrail(limit?: number): Promise<(AuditTrail & { order: Order, user?: User, location?: Location })[]>;

  // Help requests
  createHelpRequest(helpRequest: InsertHelpRequest): Promise<HelpRequest>;
  resolveHelpRequest(id: number): Promise<HelpRequest | undefined>;
  getActiveHelpRequests(): Promise<(HelpRequest & { order: Order, location: Location, user: User })[]>;

  // Email settings
  addEmailSetting(emailSetting: InsertEmailSetting): Promise<EmailSetting>;
  updateEmailSetting(id: number, data: Partial<InsertEmailSetting>): Promise<EmailSetting | undefined>;
  deleteEmailSetting(id: number): Promise<boolean>;
  getEmailsForShipping(): Promise<EmailSetting[]>;
  getEmailsForHelp(): Promise<EmailSetting[]>;
  getAllEmailSettings(): Promise<EmailSetting[]>;

  // PDF settings
  getPdfSettings(): Promise<PdfSetting | undefined>;
  updatePdfSettings(data: InsertPdfSetting): Promise<PdfSetting>;
  
  // Laser System - RFID Card Management
  getRfidCardByCardId(cardId: string): Promise<(RfidCard & { user: User }) | undefined>;
  createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard>;
  updateRfidCard(cardId: string, data: Partial<InsertRfidCard>): Promise<RfidCard | undefined>;
  deleteRfidCard(cardId: string): Promise<boolean>;
  getAllRfidCards(): Promise<(RfidCard & { user: User })[]>;
  
  // Laser System - Access Levels
  getAccessLevel(userId: number, machineId: string): Promise<AccessLevel | undefined>;
  createAccessLevel(accessLevel: InsertAccessLevel): Promise<AccessLevel>;
  updateAccessLevel(id: number, data: Partial<InsertAccessLevel>): Promise<AccessLevel | undefined>;
  deleteAccessLevel(id: number): Promise<boolean>;
  getAllAccessLevels(): Promise<(AccessLevel & { user: User })[]>;
  
  // Laser System - Access Logs
  createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog>;
  getAccessLogsByUser(userId: number): Promise<AccessLog[]>;
  getAccessLogsByMachine(machineId: string): Promise<AccessLog[]>;
  getRecentAccessLogs(limit?: number): Promise<(AccessLog & { user: User })[]>;
  
  // Machine Alerts (Bidirectional communication)
  createMachineAlert(alert: InsertMachineAlert): Promise<MachineAlert>;
  getMachineAlert(id: number): Promise<MachineAlert | undefined>;
  updateMachineAlert(id: number, data: Partial<InsertMachineAlert>): Promise<MachineAlert | undefined>;
  getPendingMachineAlerts(): Promise<(MachineAlert & { sender?: User })[]>;
  getMachineAlertsByMachine(machineId: string): Promise<MachineAlert[]>;
  resolveMachineAlert(id: number, userId: number): Promise<MachineAlert | undefined>;
  acknowledgeMachineAlert(id: number): Promise<MachineAlert | undefined>;
  
  // API Configuration
  getApiConfig(): Promise<ApiConfig | undefined>;
  updateApiConfig(config: InsertApiConfig): Promise<ApiConfig>;
}

export class SQLiteStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  // Development helpers
  async resetUsers(): Promise<void> {
    // Delete all users from the database
    await db.delete(users);
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  // Location management
  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(locationData).returning();
    return location;
  }

  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db.update(locations).set(locationData).where(eq(locations.id, id)).returning();
    return location;
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocationsByOrder(): Promise<Location[]> {
    return await db.select().from(locations).orderBy(locations.usedOrder);
  }

  // Machine management
  async createMachine(machineData: InsertMachine): Promise<Machine> {
    const [machine] = await db.insert(machines).values(machineData).returning();
    return machine;
  }

  async updateMachine(id: number, machineData: Partial<InsertMachine>): Promise<Machine | undefined> {
    const [machine] = await db.update(machines).set(machineData).where(eq(machines.id, id)).returning();
    return machine;
  }

  async deleteMachine(id: number): Promise<boolean> {
    await db.delete(machines).where(eq(machines.id, id));
    return true;
  }

  async getMachine(id: number): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine;
  }

  async getMachinesByLocation(locationId: number): Promise<Machine[]> {
    return await db.select().from(machines).where(eq(machines.locationId, locationId));
  }

  async getAllMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  // Machine permissions
  async addMachinePermission(permission: InsertMachinePermission): Promise<MachinePermission> {
    const [result] = await db.insert(machinePermissions).values(permission).returning();
    return result;
  }

  async removeMachinePermission(userId: number, machineId: number): Promise<boolean> {
    await db.delete(machinePermissions).where(
      and(
        eq(machinePermissions.userId, userId),
        eq(machinePermissions.machineId, machineId)
      )
    );
    return true;
  }

  async getMachinePermissionsForUser(userId: number): Promise<MachinePermission[]> {
    return await db.select().from(machinePermissions).where(eq(machinePermissions.userId, userId));
  }

  // Order management
  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db.update(orders).set(orderData).where(eq(orders.id, id)).returning();
    return order;
  }

  async deleteOrder(id: number): Promise<boolean> {
    await db.delete(orders).where(eq(orders.id, id));
    return true;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderWithLocations(id: number): Promise<OrderWithDetails | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    
    if (!order) return undefined;
    
    // Get order locations with location details
    const orderLocationsData = await db
      .select()
      .from(orderLocations)
      .where(eq(orderLocations.orderId, id))
      .leftJoin(locations, eq(orderLocations.locationId, locations.id));
    
    // Get creator user
    let creator = undefined;
    if (order.createdBy) {
      const [user] = await db.select().from(users).where(eq(users.id, order.createdBy));
      creator = user;
    }
    
    // Get audit trail
    const auditRecords = await db.select().from(auditTrail).where(eq(auditTrail.orderId, id)).orderBy(desc(auditTrail.createdAt));
    
    // Transform the data
    const transformedLocations = orderLocationsData.map(ol => ({
      ...ol.order_locations,
      location: ol.locations
    }));
    
    return {
      ...order,
      locations: transformedLocations,
      createdByUser: creator,
      auditTrail: auditRecords
    };
  }

  async getAllOrders(includeShipped: boolean): Promise<OrderWithLocations[]> {
    let query = db.select().from(orders);
    
    if (!includeShipped) {
      query = query.where(eq(orders.isShipped, 0));
    }
    
    const ordersResult = await query.orderBy(desc(orders.createdAt));
    
    const orderIds = ordersResult.map(o => o.id);
    
    const orderLocationsData = await db
      .select()
      .from(orderLocations)
      .where(inArray(orderLocations.orderId, orderIds))
      .leftJoin(locations, eq(orderLocations.locationId, locations.id));
      
    // Group by order ID
    const locationsByOrderId = orderLocationsData.reduce((acc, ol) => {
      if (!acc[ol.order_locations.orderId]) {
        acc[ol.order_locations.orderId] = [];
      }
      
      acc[ol.order_locations.orderId].push({
        ...ol.order_locations,
        location: ol.locations
      });
      
      return acc;
    }, {} as Record<number, any[]>);
    
    // Combine data
    return ordersResult.map(order => ({
      ...order,
      locations: locationsByOrderId[order.id] || []
    }));
  }

  async searchOrders(query: string, includeShipped: boolean): Promise<OrderWithLocations[]> {
    let dbQuery = db.select().from(orders).where(
      or(
        like(orders.orderNumber, `%${query}%`),
        like(orders.tbfosNumber, `%${query}%`),
        like(orders.client, `%${query}%`),
        like(orders.description, `%${query}%`)
      )
    );
    
    if (!includeShipped) {
      dbQuery = dbQuery.where(eq(orders.isShipped, 0));
    }
    
    const ordersResult = await dbQuery.orderBy(desc(orders.createdAt));
    
    const orderIds = ordersResult.map(o => o.id);
    
    if (orderIds.length === 0) {
      return [];
    }
    
    const orderLocationsData = await db
      .select()
      .from(orderLocations)
      .where(inArray(orderLocations.orderId, orderIds))
      .leftJoin(locations, eq(orderLocations.locationId, locations.id));
      
    // Group by order ID
    const locationsByOrderId = orderLocationsData.reduce((acc, ol) => {
      if (!acc[ol.order_locations.orderId]) {
        acc[ol.order_locations.orderId] = [];
      }
      
      acc[ol.order_locations.orderId].push({
        ...ol.order_locations,
        location: ol.locations
      });
      
      return acc;
    }, {} as Record<number, any[]>);
    
    // Combine data
    return ordersResult.map(order => ({
      ...order,
      locations: locationsByOrderId[order.id] || []
    }));
  }

  async markOrderAsShipped(id: number, quantity: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    
    if (!order) return undefined;
    
    // If shipped quantity equals total, mark as fully shipped
    const fullyShipped = quantity >= order.totalQuantity;
    const partiallyShipped = quantity > 0 && quantity < order.totalQuantity;
    
    const [updatedOrder] = await db.update(orders)
      .set({
        isShipped: fullyShipped ? 1 : 0,
        partiallyShipped: partiallyShipped ? 1 : 0,
        shippedQuantity: quantity
      })
      .where(eq(orders.id, id))
      .returning();
      
    return updatedOrder;
  }

  // Order location management
  async createOrderLocation(orderLocationData: InsertOrderLocation): Promise<OrderLocation> {
    const [orderLocation] = await db.insert(orderLocations).values(orderLocationData).returning();
    return orderLocation;
  }

  async updateOrderLocation(id: number, data: Partial<InsertOrderLocation>): Promise<OrderLocation | undefined> {
    const [orderLocation] = await db.update(orderLocations).set(data).where(eq(orderLocations.id, id)).returning();
    return orderLocation;
  }
  
  async deleteOrderLocation(id: number): Promise<boolean> {
    await db.delete(orderLocations).where(eq(orderLocations.id, id));
    return true;
  }

  async getOrderLocation(id: number): Promise<OrderLocation | undefined> {
    const [orderLocation] = await db.select().from(orderLocations).where(eq(orderLocations.id, id));
    return orderLocation;
  }

  async getOrderLocationsByOrder(orderId: number): Promise<OrderLocation[]> {
    return await db.select().from(orderLocations).where(eq(orderLocations.orderId, orderId));
  }

  async getOrderLocationsByLocation(locationId: number): Promise<(OrderLocation & { order: Order })[]> {
    const results = await db
      .select()
      .from(orderLocations)
      .where(eq(orderLocations.locationId, locationId))
      .leftJoin(orders, eq(orderLocations.orderId, orders.id))
      .where(eq(orders.isShipped, 0))
      .orderBy(asc(orderLocations.queuePosition));
      
    return results.map(r => ({
      ...r.order_locations,
      order: r.orders
    }));
  }
  
  async getOrdersForPrimaryLocation(locationId: number): Promise<Order[]> {
    console.log(`Getting orders for primary location ${locationId}`);
    
    // First, check if this location is actually a primary location
    const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
    
    console.log(`Location isPrimary: ${location?.isPrimary}`);
    
    if (!location || !location.isPrimary) {
      console.log(`Location ${locationId} is not a primary location or does not exist`);
      return []; // Not a primary location, return empty array
    }
    
    // Get all active (not shipped, not finished) orders
    const activeOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.isShipped, 0),
          eq(orders.isFinished, 0)
        )
      );
      
    console.log(`Found ${activeOrders.length} active orders`);
    
    if (activeOrders.length === 0) {
      return [];
    }
    
    // Get all orderLocations for these orders
    const orderIds = activeOrders.map(order => order.id);
    
    const allOrderLocations = await db
      .select()
      .from(orderLocations)
      .where(inArray(orderLocations.orderId, orderIds));
    
    console.log(`Found ${allOrderLocations.length} order location relationships`);
      
    // Create a map of orderId -> locationStatuses for this location
    const orderLocationStatusMap = new Map<number, string>();
    
    for (const orderLoc of allOrderLocations) {
      if (orderLoc.locationId === locationId) {
        orderLocationStatusMap.set(orderLoc.orderId, orderLoc.status);
      }
    }
    
    // Filter for orders that need to be queued at this location:
    // 1. Orders that don't have this location at all
    // 2. Orders that have this location but are in "not_started" status (not in queue yet)
    const ordersNeedingThisLocation = activeOrders.filter(order => {
      const statusAtLocation = orderLocationStatusMap.get(order.id);
      
      // Case 1: No relationship with this location yet
      if (statusAtLocation === undefined) {
        console.log(`Order ${order.orderNumber} (ID: ${order.id}) needs location ${locationId}: no relationship`);
        return true;
      }
      
      // Case 2: Has relationship but is not started and not in queue
      if (statusAtLocation === "not_started") {
        console.log(`Order ${order.orderNumber} (ID: ${order.id}) needs location ${locationId}: not started yet`);
        return true;
      }
      
      console.log(`Order ${order.orderNumber} (ID: ${order.id}) doesn't need location ${locationId}: status is ${statusAtLocation}`);
      return false;
    });
    
    console.log(`Found ${ordersNeedingThisLocation.length} orders that need location ${locationId}`);
    
    return ordersNeedingThisLocation;
  }

  async startOrderAtLocation(orderId: number, locationId: number, userId: number): Promise<OrderLocation | undefined> {
    // Get current time
    const now = new Date();
    
    // Update the order location
    const [updatedOrderLocation] = await db.update(orderLocations)
      .set({
        status: "in_progress",
        startedAt: now.getTime(),
        queuePosition: null
      })
      .where(
        and(
          eq(orderLocations.orderId, orderId),
          eq(orderLocations.locationId, locationId)
        )
      )
      .returning();
      
    if (updatedOrderLocation) {
      // Create audit record
      await this.createAuditRecord({
        orderId,
        userId,
        locationId,
        action: "started",
        details: `Started processing at location ID ${locationId}`
      });
      
      // Update queue positions for other orders at this location
      await this.updateQueuePositions(locationId);
    }
    
    return updatedOrderLocation;
  }

  async finishOrderAtLocation(orderId: number, locationId: number, completedQuantity: number, userId: number): Promise<OrderLocation | undefined> {
    // Get current time
    const now = new Date();
    
    // Update the order location
    const [updatedOrderLocation] = await db.update(orderLocations)
      .set({
        status: "done",
        completedAt: now.getTime(),
        completedQuantity,
        queuePosition: null
      })
      .where(
        and(
          eq(orderLocations.orderId, orderId),
          eq(orderLocations.locationId, locationId)
        )
      )
      .returning();
      
    if (updatedOrderLocation) {
      // Create audit record
      await this.createAuditRecord({
        orderId,
        userId,
        locationId,
        action: "finished",
        details: `Completed processing ${completedQuantity} units at location ID ${locationId}`
      });
      
      // Update queue positions for other orders at this location
      await this.updateQueuePositions(locationId);
      
      // Check if we need to queue this order for next location
      await this.queueForNextLocation(orderId, locationId);
      
      // Check if all locations are done
      await this.checkAllLocationsDone(orderId);
    }
    
    return updatedOrderLocation;
  }

  async pauseOrderAtLocation(orderId: number, locationId: number, userId: number): Promise<OrderLocation | undefined> {
    // Update the order location
    const [updatedOrderLocation] = await db.update(orderLocations)
      .set({
        status: "paused"
      })
      .where(
        and(
          eq(orderLocations.orderId, orderId),
          eq(orderLocations.locationId, locationId)
        )
      )
      .returning();
      
    if (updatedOrderLocation) {
      // Create audit record
      await this.createAuditRecord({
        orderId,
        userId,
        locationId,
        action: "paused",
        details: `Paused processing at location ID ${locationId}`
      });
    }
    
    return updatedOrderLocation;
  }

  async updateOrderLocationQuantity(orderId: number, locationId: number, completedQuantity: number, userId: number): Promise<OrderLocation | undefined> {
    // Update the order location
    const [updatedOrderLocation] = await db.update(orderLocations)
      .set({
        completedQuantity
      })
      .where(
        and(
          eq(orderLocations.orderId, orderId),
          eq(orderLocations.locationId, locationId)
        )
      )
      .returning();
      
    if (updatedOrderLocation) {
      // Create audit record
      await this.createAuditRecord({
        orderId,
        userId,
        locationId,
        action: "updated_quantity",
        details: `Updated completed quantity to ${completedQuantity} at location ID ${locationId}`
      });
    }
    
    return updatedOrderLocation;
  }

  async getLocationQueue(locationId: number): Promise<(OrderLocation & { order: Order })[]> {
    // First get raw data with proper joins
    const results = await db
      .select({
        orderLocation: orderLocations,
        order: orders,
      })
      .from(orderLocations)
      .where(
        and(
          eq(orderLocations.locationId, locationId),
          eq(orderLocations.status, "in_queue")
        )
      )
      .innerJoin(orders, eq(orderLocations.orderId, orders.id))
      .orderBy(asc(orderLocations.queuePosition));
    
    // Map to expected return type
    return results
      .filter(item => !item.order.isShipped) // Filter out shipped orders
      .map(item => ({
        ...item.orderLocation,
        order: item.order
      }));
  }

  async updateQueuePositions(locationId: number): Promise<boolean> {
    // Get all orders in queue for this location
    const queueItems = await db
      .select()
      .from(orderLocations)
      .where(
        and(
          eq(orderLocations.locationId, locationId),
          eq(orderLocations.status, "in_queue")
        )
      )
      .orderBy(asc(orderLocations.queuePosition));
      
    // Re-assign queue positions starting from 1
    for (let i = 0; i < queueItems.length; i++) {
      await db.update(orderLocations)
        .set({ queuePosition: i + 1 })
        .where(eq(orderLocations.id, queueItems[i].id));
    }
    
    return true;
  }

  // Helper method to queue an order for the next location
  private async queueForNextLocation(orderId: number, currentLocationId: number): Promise<void> {
    // Get the current location
    const [currentLocation] = await db.select().from(locations).where(eq(locations.id, currentLocationId));
    
    if (!currentLocation) return;
    
    // Get the next location in order
    const [nextLocation] = await db
      .select()
      .from(locations)
      .where(gt(locations.usedOrder, currentLocation.usedOrder))
      .orderBy(asc(locations.usedOrder));
      
    if (!nextLocation) return; // No next location
    
    // Check if this order is already at the next location
    const [existingOrderLocation] = await db
      .select()
      .from(orderLocations)
      .where(
        and(
          eq(orderLocations.orderId, orderId),
          eq(orderLocations.locationId, nextLocation.id)
        )
      );
      
    if (existingOrderLocation) {
      // Already exists, make sure it's in queue if not already started
      if (existingOrderLocation.status === "not_started") {
        // Get current max queue position
        const [queueResult] = await db
          .select({ maxQueue: sql`MAX(queue_position)` })
          .from(orderLocations)
          .where(
            and(
              eq(orderLocations.locationId, nextLocation.id),
              eq(orderLocations.status, "in_queue")
            )
          );
          
        const nextQueuePosition = (queueResult?.maxQueue || 0) + 1;
        
        // Update to in queue
        await db.update(orderLocations)
          .set({
            status: "in_queue",
            queuePosition: nextQueuePosition
          })
          .where(eq(orderLocations.id, existingOrderLocation.id));
      }
    } else {
      // Need to create a new order location
      // Get current max queue position
      const [queueResult] = await db
        .select({ maxQueue: sql`MAX(queue_position)` })
        .from(orderLocations)
        .where(
          and(
            eq(orderLocations.locationId, nextLocation.id),
            eq(orderLocations.status, "in_queue")
          )
        );
        
      const nextQueuePosition = (queueResult?.maxQueue || 0) + 1;
      
      // Create new order location
      await db.insert(orderLocations)
        .values({
          orderId,
          locationId: nextLocation.id,
          status: "in_queue",
          queuePosition: nextQueuePosition,
          completedQuantity: 0
        });
    }
  }

  // Helper method to check if all locations for an order are done
  private async checkAllLocationsDone(orderId: number): Promise<void> {
    // Get the order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;
    
    // Get all order locations
    const orderLocationsData = await db
      .select()
      .from(orderLocations)
      .where(eq(orderLocations.orderId, orderId));
      
    // Check if all are in "done" status
    const allDone = orderLocationsData.every(ol => ol.status === "done");
    
    if (allDone && !order.isFinished) {
      // Update order to mark as finished
      await db.update(orders)
        .set({ isFinished: 1 })
        .where(eq(orders.id, orderId));
    }
  }

  // Audit trail
  async createAuditRecord(auditData: InsertAuditTrail): Promise<AuditTrail> {
    const [audit] = await db.insert(auditTrail).values(auditData).returning();
    return audit;
  }

  async getAuditTrailForOrder(orderId: number): Promise<AuditTrail[]> {
    return await db.select().from(auditTrail).where(eq(auditTrail.orderId, orderId)).orderBy(desc(auditTrail.createdAt));
  }

  async getAllAuditTrail(limit: number = 100): Promise<(AuditTrail & { order: Order, user?: User, location?: Location })[]> {
    const results = await db
      .select()
      .from(auditTrail)
      .leftJoin(orders, eq(auditTrail.orderId, orders.id))
      .leftJoin(users, eq(auditTrail.userId, users.id))
      .leftJoin(locations, eq(auditTrail.locationId, locations.id))
      .orderBy(desc(auditTrail.createdAt))
      .limit(limit);
      
    return results.map(r => ({
      ...r.audit_trail,
      order: r.orders,
      user: r.users,
      location: r.locations
    }));
  }

  // Help requests
  async createHelpRequest(helpRequestData: InsertHelpRequest): Promise<HelpRequest> {
    const [helpRequest] = await db.insert(helpRequests).values(helpRequestData).returning();
    return helpRequest;
  }

  async resolveHelpRequest(id: number): Promise<HelpRequest | undefined> {
    const now = new Date();
    
    const [helpRequest] = await db.update(helpRequests)
      .set({
        isResolved: 1,
        resolvedAt: now.getTime()
      })
      .where(eq(helpRequests.id, id))
      .returning();
      
    return helpRequest;
  }

  async getActiveHelpRequests(): Promise<(HelpRequest & { order: Order, location: Location, user: User })[]> {
    const results = await db
      .select()
      .from(helpRequests)
      .where(eq(helpRequests.isResolved, 0))
      .leftJoin(orders, eq(helpRequests.orderId, orders.id))
      .leftJoin(locations, eq(helpRequests.locationId, locations.id))
      .leftJoin(users, eq(helpRequests.userId, users.id))
      .orderBy(desc(helpRequests.createdAt));
      
    return results.map(r => ({
      ...r.help_requests,
      order: r.orders,
      location: r.locations,
      user: r.users
    }));
  }

  // Email settings
  async addEmailSetting(emailSettingData: InsertEmailSetting): Promise<EmailSetting> {
    const [emailSetting] = await db.insert(emailSettings).values(emailSettingData).returning();
    return emailSetting;
  }

  async updateEmailSetting(id: number, data: Partial<InsertEmailSetting>): Promise<EmailSetting | undefined> {
    const [emailSetting] = await db.update(emailSettings).set(data).where(eq(emailSettings.id, id)).returning();
    return emailSetting;
  }

  async deleteEmailSetting(id: number): Promise<boolean> {
    await db.delete(emailSettings).where(eq(emailSettings.id, id));
    return true;
  }

  async getEmailsForShipping(): Promise<EmailSetting[]> {
    return await db.select().from(emailSettings).where(eq(emailSettings.forShipping, 1));
  }

  async getEmailsForHelp(): Promise<EmailSetting[]> {
    return await db.select().from(emailSettings).where(eq(emailSettings.forHelp, 1));
  }

  async getAllEmailSettings(): Promise<EmailSetting[]> {
    return await db.select().from(emailSettings);
  }

  // PDF settings
  async getPdfSettings(): Promise<PdfSetting | undefined> {
    const [settings] = await db.select().from(pdfSettings).limit(1);
    return settings;
  }

  async updatePdfSettings(data: InsertPdfSetting): Promise<PdfSetting> {
    // First check if settings exist
    const existing = await this.getPdfSettings();
    
    if (existing) {
      // Update
      const [updated] = await db.update(pdfSettings).set(data).where(eq(pdfSettings.id, existing.id)).returning();
      return updated;
    } else {
      // Create
      const [created] = await db.insert(pdfSettings).values(data).returning();
      return created;
    }
  }
  
  // Laser System - RFID Card Management
  async getRfidCardByCardId(cardId: string): Promise<(RfidCard & { user: User }) | undefined> {
    const result = await db.select({
      rfidCard: rfidCards,
      user: users
    })
    .from(rfidCards)
    .where(eq(rfidCards.cardId, cardId))
    .leftJoin(users, eq(rfidCards.userId, users.id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Format the result
    return {
      ...result[0].rfidCard,
      user: result[0].user
    };
  }
  
  async createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard> {
    const [result] = await db.insert(rfidCards).values(rfidCard).returning();
    return result;
  }
  
  async updateRfidCard(cardId: string, data: Partial<InsertRfidCard>): Promise<RfidCard | undefined> {
    const [result] = await db.update(rfidCards).set(data).where(eq(rfidCards.cardId, cardId)).returning();
    return result;
  }
  
  async deleteRfidCard(cardId: string): Promise<boolean> {
    await db.delete(rfidCards).where(eq(rfidCards.cardId, cardId));
    return true;
  }
  
  async getAllRfidCards(): Promise<(RfidCard & { user: User })[]> {
    const result = await db.select({
      rfidCard: rfidCards,
      user: users
    })
    .from(rfidCards)
    .leftJoin(users, eq(rfidCards.userId, users.id));
    
    // Format the result
    return result.map(row => ({
      ...row.rfidCard,
      user: row.user
    }));
  }
  
  // Laser System - Access Levels
  async getAccessLevel(userId: number, machineId: string): Promise<AccessLevel | undefined> {
    const [result] = await db.select()
      .from(accessLevels)
      .where(
        and(
          eq(accessLevels.userId, userId),
          eq(accessLevels.machineId, machineId)
        )
      );
    
    return result;
  }
  
  async createAccessLevel(accessLevel: InsertAccessLevel): Promise<AccessLevel> {
    const [result] = await db.insert(accessLevels).values(accessLevel).returning();
    return result;
  }
  
  async updateAccessLevel(id: number, data: Partial<InsertAccessLevel>): Promise<AccessLevel | undefined> {
    const [result] = await db.update(accessLevels).set(data).where(eq(accessLevels.id, id)).returning();
    return result;
  }
  
  async deleteAccessLevel(id: number): Promise<boolean> {
    await db.delete(accessLevels).where(eq(accessLevels.id, id));
    return true;
  }
  
  async getAllAccessLevels(): Promise<(AccessLevel & { user: User })[]> {
    const result = await db.select({
      accessLevel: accessLevels,
      user: users
    })
    .from(accessLevels)
    .leftJoin(users, eq(accessLevels.userId, users.id));
    
    // Format the result
    return result.map(row => ({
      ...row.accessLevel,
      user: row.user
    }));
  }
  
  // Laser System - Access Logs
  async createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog> {
    const [result] = await db.insert(accessLogs).values(accessLog).returning();
    return result;
  }
  
  async getAccessLogsByUser(userId: number): Promise<AccessLog[]> {
    return await db.select()
      .from(accessLogs)
      .where(eq(accessLogs.userId, userId))
      .orderBy(desc(accessLogs.timestamp));
  }
  
  async getAccessLogsByMachine(machineId: string): Promise<AccessLog[]> {
    return await db.select()
      .from(accessLogs)
      .where(eq(accessLogs.machineId, machineId))
      .orderBy(desc(accessLogs.timestamp));
  }
  
  async getRecentAccessLogs(limit: number = 100): Promise<(AccessLog & { user: User })[]> {
    const result = await db.select({
      accessLog: accessLogs,
      user: users
    })
    .from(accessLogs)
    .leftJoin(users, eq(accessLogs.userId, users.id))
    .orderBy(desc(accessLogs.timestamp))
    .limit(limit);
    
    // Format the result
    return result.map(row => ({
      ...row.accessLog,
      user: row.user
    }));
  }

  // Machine Alerts
  async createMachineAlert(alertData: InsertMachineAlert): Promise<MachineAlert> {
    const [alert] = await db.insert(machineAlerts).values(alertData).returning();
    return alert;
  }

  async getMachineAlert(id: number): Promise<MachineAlert | undefined> {
    const [alert] = await db.select().from(machineAlerts).where(eq(machineAlerts.id, id));
    return alert;
  }

  async updateMachineAlert(id: number, data: Partial<InsertMachineAlert>): Promise<MachineAlert | undefined> {
    const [alert] = await db.update(machineAlerts).set(data).where(eq(machineAlerts.id, id)).returning();
    return alert;
  }

  async getPendingMachineAlerts(): Promise<(MachineAlert & { sender?: User })[]> {
    const result = await db.select({
      alert: machineAlerts,
      user: users
    })
    .from(machineAlerts)
    .leftJoin(users, eq(machineAlerts.senderId, users.id))
    .where(eq(machineAlerts.status, "pending"))
    .orderBy(desc(machineAlerts.createdAt));
    
    // Format the result
    return result.map(row => ({
      ...row.alert,
      sender: row.user
    }));
  }

  async getMachineAlertsByMachine(machineId: string): Promise<MachineAlert[]> {
    return await db
      .select()
      .from(machineAlerts)
      .where(eq(machineAlerts.machineId, machineId))
      .orderBy(desc(machineAlerts.createdAt));
  }

  async resolveMachineAlert(id: number, userId: number): Promise<MachineAlert | undefined> {
    const [alert] = await db
      .update(machineAlerts)
      .set({
        status: "resolved",
        resolvedById: userId,
        resolvedAt: new Date()
      })
      .where(eq(machineAlerts.id, id))
      .returning();
    
    return alert;
  }

  async acknowledgeMachineAlert(id: number): Promise<MachineAlert | undefined> {
    const [alert] = await db
      .update(machineAlerts)
      .set({
        status: "acknowledged"
      })
      .where(eq(machineAlerts.id, id))
      .returning();
    
    return alert;
  }

  // API Configuration
  async getApiConfig(): Promise<ApiConfig | undefined> {
    try {
      const [config] = await db.select().from(apiConfigs);
      return config || undefined;
    } catch (error) {
      console.error("Error fetching API config:", error);
      // Return default config if table doesn't exist or other error
      return {
        id: 0,
        machineMonitorApiKey: "",
        machineMonitorApiUrl: "https://api.machinemanager.com",
        syncEnabled: true,
        syncInterval: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  async updateApiConfig(config: InsertApiConfig): Promise<ApiConfig> {
    try {
      // First check if a config already exists
      const existingConfig = await db.select().from(apiConfigs).limit(1);
      
      if (existingConfig && existingConfig.length > 0) {
        // Update existing
        const [updatedConfig] = await db.update(apiConfigs)
          .set({
            ...config,
            updatedAt: new Date()
          })
          .where(eq(apiConfigs.id, existingConfig[0].id))
          .returning();
        return updatedConfig;
      } else {
        // Create new
        const [newConfig] = await db.insert(apiConfigs)
          .values({
            ...config,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        return newConfig;
      }
    } catch (error) {
      console.error("Error updating API config:", error);
      // Return a default config if we can't update
      return {
        id: 0,
        ...config,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
}

export const storage = new SQLiteStorage();
