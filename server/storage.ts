import { db } from "./db";
import { eq, and, isNull, isNotNull, desc, asc, sql, like, lt, gt, or, inArray, ne } from "drizzle-orm";
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
  machineAssignments,
  type MachineAssignment,
  type InsertMachineAssignment,
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
  type InsertApiConfig,
  appSettings,
  type AppSettings,
  type InsertAppSettings
} from "@shared/schema";
import { safeDbOperation, NotFoundError, logError, DatabaseError } from "./utils";

const MemoryStore = createMemoryStore(session);

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

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
  getMachinePermissionsForMachine(machineId: number): Promise<MachinePermission[]>;
  updateMachinePermissionAccessRole(userId: number, machineId: number, accessRole: 'operator' | 'admin'): Promise<MachinePermission | undefined>;

  // Machine assignments
  assignOrderToMachine(assignment: InsertMachineAssignment): Promise<MachineAssignment>;
  updateMachineAssignmentQuantity(orderId: number, locationId: number, machineId: number, assignedQuantity: number): Promise<MachineAssignment | undefined>;
  unassignOrderFromMachine(orderId: number, locationId: number, machineId: number): Promise<boolean>;
  getAssignmentsForLocation(locationId: number): Promise<(MachineAssignment & { order: Order, machine: Machine })[]>;
  getAssignmentsForMachine(machineId: number): Promise<(MachineAssignment & { order: Order, location: Location })[]>;

  // Order management
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithLocations(id: number): Promise<OrderWithDetails | undefined>;
  getAllOrders(includeShipped: boolean, pagination?: PaginationOptions): Promise<PaginatedResult<OrderWithLocations>>;
  searchOrders(query: string, includeShipped: boolean, pagination?: PaginationOptions): Promise<PaginatedResult<OrderWithLocations>>;
  markOrderAsShipped(id: number, quantity: number): Promise<Order | undefined>;
  // Global queue management
  getGlobalQueue(): Promise<Order[]>;
  setOrderGlobalQueuePosition(orderId: number, position: number): Promise<boolean>;
  setOrderRush(orderId: number, rushSetAt: Date): Promise<Order>;
  unsetOrderRush(orderId: number): Promise<Order>;

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
  recalcAllLocationQueues(): Promise<boolean>;

  // Audit trail
  createAuditRecord(audit: InsertAuditTrail): Promise<AuditTrail>;
  getAuditTrailForOrder(orderId: number): Promise<AuditTrail[]>;
  getAllAuditTrail(limit?: number): Promise<(AuditTrail & { order: Order, user?: User, location?: Location })[]>;
  getAllAuditTrail(pagination?: PaginationOptions): Promise<PaginatedResult<AuditTrail & { order: Order, user?: User, location?: Location }>>;
  getAllAuditTrail(limitOrPagination?: number | PaginationOptions): Promise<(AuditTrail & { order: Order, user?: User, location?: Location })[] | PaginatedResult<AuditTrail & { order: Order, user?: User, location?: Location }>>;

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
  
  // Machine System - RFID Card Management
  getRfidCardByCardId(cardId: string): Promise<(RfidCard & { user: User }) | undefined>;
  createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard>;
  updateRfidCard(cardId: string, data: Partial<InsertRfidCard>): Promise<RfidCard | undefined>;
  deleteRfidCard(cardId: string): Promise<boolean>;
  getAllRfidCards(): Promise<(RfidCard & { user: User })[]>;
  
  // Machine System - Access Levels
  getAccessLevel(userId: number, machineId: string): Promise<AccessLevel | undefined>;
  createAccessLevel(accessLevel: InsertAccessLevel): Promise<AccessLevel>;
  updateAccessLevel(id: number, data: Partial<InsertAccessLevel>): Promise<AccessLevel | undefined>;
  deleteAccessLevel(id: number): Promise<boolean>;
  getAllAccessLevels(): Promise<(AccessLevel & { user: User })[]>;
  
  // Machine System - Access Logs
  createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog>;
  getAccessLogsByUser(userId: number): Promise<AccessLog[]>;
  getAccessLogsByMachine(machineId: string): Promise<AccessLog[]>;
  getRecentAccessLogs(limit?: number): Promise<(AccessLog & { user: User })[]>;
  getRecentAccessLogs(pagination?: PaginationOptions): Promise<PaginatedResult<AccessLog & { user: User }>>;
  
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

  // App Settings
  getAppSettings(): Promise<AppSettings | undefined>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;

  // Queue utilities
  removeOrderFromAllQueues(orderId: number): Promise<boolean>;
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
    return safeDbOperation('resetUsers', 'users', async () => {
      // Delete all users from the database
      await db.delete(users);
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return safeDbOperation('getUser', 'users', async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return safeDbOperation('getUserByUsername', 'users', async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    });
  }

  async createUser(userData: InsertUser): Promise<User> {
    return safeDbOperation('createUser', 'users', async () => {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    });
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    return safeDbOperation('updateUser', 'users', async () => {
      const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
      if (!user) {
        throw new NotFoundError(`User with id ${id} not found`, 'user', id);
      }
      return user;
    });
  }

  async deleteUser(id: number): Promise<boolean> {
    return safeDbOperation('deleteUser', 'users', async () => {
      await db.delete(users).where(eq(users.id, id));
      return true;
    });
  }

  async getAllUsers(): Promise<User[]> {
    return safeDbOperation('getAllUsers', 'users', async () => {
      return await db.select().from(users).orderBy(users.username);
    });
  }

  // Location management
  async createLocation(locationData: InsertLocation): Promise<Location> {
    return safeDbOperation('createLocation', 'locations', async () => {
      const [location] = await db.insert(locations).values(locationData).returning();
      return location;
    });
  }

  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined> {
    return safeDbOperation('updateLocation', 'locations', async () => {
      const [location] = await db.update(locations).set(locationData).where(eq(locations.id, id)).returning();
      if (!location) {
        throw new NotFoundError(`Location with id ${id} not found`, 'location', id);
      }
      return location;
    });
  }

  async deleteLocation(id: number): Promise<boolean> {
    return safeDbOperation('deleteLocation', 'locations', async () => {
      await db.delete(locations).where(eq(locations.id, id));
      return true;
    });
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return safeDbOperation('getLocation', 'locations', async () => {
      const [location] = await db.select().from(locations).where(eq(locations.id, id));
      return location;
    });
  }

  async getAllLocations(): Promise<Location[]> {
    return safeDbOperation('getAllLocations', 'locations', async () => {
      return await db.select().from(locations);
    });
  }

  async getLocationsByOrder(): Promise<Location[]> {
    return safeDbOperation('getLocationsByOrder', 'locations', async () => {
      return await db.select().from(locations).orderBy(locations.usedOrder);
    });
  }

  // Machine management
  async createMachine(machineData: InsertMachine): Promise<Machine> {
    return safeDbOperation('createMachine', 'machines', async () => {
      const [machine] = await db.insert(machines).values(machineData).returning();
      return machine;
    });
  }

  async updateMachine(id: number, machineData: Partial<InsertMachine>): Promise<Machine | undefined> {
    return safeDbOperation('updateMachine', 'machines', async () => {
      const [machine] = await db.update(machines).set(machineData).where(eq(machines.id, id)).returning();
      if (!machine) {
        throw new NotFoundError(`Machine with id ${id} not found`, 'machine', id);
      }
      return machine;
    });
  }

  async deleteMachine(id: number): Promise<boolean> {
    return safeDbOperation('deleteMachine', 'machines', async () => {
      await db.delete(machines).where(eq(machines.id, id));
      return true;
    });
  }

  async getMachine(id: number): Promise<Machine | undefined> {
    return safeDbOperation('getMachine', 'machines', async () => {
      const [machine] = await db.select().from(machines).where(eq(machines.id, id));
      return machine;
    });
  }

  async getMachinesByLocation(locationId: number): Promise<Machine[]> {
    return safeDbOperation('getMachinesByLocation', 'machines', async () => {
      return await db.select().from(machines).where(eq(machines.locationId, locationId));
    });
  }

  async getAllMachines(): Promise<Machine[]> {
    return safeDbOperation('getAllMachines', 'machines', async () => {
      return await db.select().from(machines);
    });
  }

  // Machine permissions
  async addMachinePermission(permission: InsertMachinePermission): Promise<MachinePermission> {
    return safeDbOperation('addMachinePermission', 'machinePermissions', async () => {
      const [result] = await db.insert(machinePermissions).values(permission).returning();
      return result;
    });
  }

  async removeMachinePermission(userId: number, machineId: number): Promise<boolean> {
    return safeDbOperation('removeMachinePermission', 'machinePermissions', async () => {
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
  async assignOrderToMachine(assignment: InsertMachineAssignment): Promise<MachineAssignment> {
    return safeDbOperation('assignOrderToMachine', 'machineAssignments', async () => {
      // Ensure machine belongs to the location
      const [machine] = await db.select().from(machines).where(eq(machines.id, assignment.machineId));
      if (!machine) throw new NotFoundError(`Machine with id ${assignment.machineId} not found`, 'machine', assignment.machineId);
      if (machine.locationId !== assignment.locationId) {
        throw new DatabaseError(
          'Machine is not in the specified location',
          'assignOrderToMachine',
          'machineAssignments'
        );
      }
      // Avoid duplicate assignment
      const existing = await db.select().from(machineAssignments).where(and(
        eq(machineAssignments.orderId, assignment.orderId),
        eq(machineAssignments.locationId, assignment.locationId),
        eq(machineAssignments.machineId, assignment.machineId)
      ));
      if (existing.length > 0) {
        // If exists, update assignedQuantity if provided and different
        const current = existing[0];
        const newQty = (assignment as any).assignedQuantity ?? current.assignedQuantity ?? 0;
        if (newQty !== (current as any).assignedQuantity) {
          const [updated] = await db.update(machineAssignments)
            .set({ assignedQuantity: newQty })
            .where(and(
              eq(machineAssignments.orderId, assignment.orderId),
              eq(machineAssignments.locationId, assignment.locationId),
              eq(machineAssignments.machineId, assignment.machineId)
            ))
            .returning();
          return updated as any;
        }
        return current as any;
      }
      const [result] = await db.insert(machineAssignments).values({
        ...assignment,
        assignedQuantity: (assignment as any).assignedQuantity ?? 0,
      } as any).returning();
      return result;
    });
  }

  async updateMachineAssignmentQuantity(orderId: number, locationId: number, machineId: number, assignedQuantity: number): Promise<MachineAssignment | undefined> {
    return safeDbOperation('updateMachineAssignmentQuantity', 'machineAssignments', async () => {
      const [updated] = await db.update(machineAssignments)
        .set({ assignedQuantity })
        .where(and(
          eq(machineAssignments.orderId, orderId),
          eq(machineAssignments.locationId, locationId),
          eq(machineAssignments.machineId, machineId)
        ))
        .returning();
      return updated as any;
    });
  }

  async unassignOrderFromMachine(orderId: number, locationId: number, machineId: number): Promise<boolean> {
    return safeDbOperation('unassignOrderFromMachine', 'machineAssignments', async () => {
      await db.delete(machineAssignments).where(and(
        eq(machineAssignments.orderId, orderId),
        eq(machineAssignments.locationId, locationId),
        eq(machineAssignments.machineId, machineId)
      ));
      return true;
    });
  }

  async getAssignmentsForLocation(locationId: number): Promise<(MachineAssignment & { order: Order, machine: Machine })[]> {
    return safeDbOperation('getAssignmentsForLocation', 'machineAssignments', async () => {
      const results = await db
          .select({ ma: machineAssignments, o: orders, m: machines })
        .from(machineAssignments)
        .innerJoin(orders, eq(machineAssignments.orderId, orders.id))
        .innerJoin(machines, eq(machineAssignments.machineId, machines.id))
        .where(eq(machineAssignments.locationId, locationId));
        return results.map((r: { ma: MachineAssignment; o: Order; m: Machine }) => ({ ...r.ma, order: r.o, machine: r.m }));
    });
  }

  async getAssignmentsForMachine(machineId: number): Promise<(MachineAssignment & { order: Order, location: Location })[]> {
    return safeDbOperation('getAssignmentsForMachine', 'machineAssignments', async () => {
      const results = await db
          .select({ ma: machineAssignments, o: orders, l: locations })
        .from(machineAssignments)
        .innerJoin(orders, eq(machineAssignments.orderId, orders.id))
        .innerJoin(locations, eq(machineAssignments.locationId, locations.id))
        .where(eq(machineAssignments.machineId, machineId));
        return results.map((r: { ma: MachineAssignment; o: Order; l: Location }) => ({ ...r.ma, order: r.o, location: r.l }));
    });
  }

  async getMachinePermissionsForUser(userId: number): Promise<MachinePermission[]> {
    return safeDbOperation('getMachinePermissionsForUser', 'machinePermissions', async () => {
      return await db.select().from(machinePermissions).where(eq(machinePermissions.userId, userId));
    });
  }

  async getMachinePermissionsForMachine(machineId: number): Promise<MachinePermission[]> {
    return safeDbOperation('getMachinePermissionsForMachine', 'machinePermissions', async () => {
      return await db.select().from(machinePermissions).where(eq(machinePermissions.machineId, machineId));
    });
  }

  async updateMachinePermissionAccessRole(userId: number, machineId: number, accessRole: 'operator' | 'admin'): Promise<MachinePermission | undefined> {
    return safeDbOperation('updateMachinePermissionAccessRole', 'machinePermissions', async () => {
      const [updated] = await db
        .update(machinePermissions)
        .set({ accessRole })
        .where(and(eq(machinePermissions.userId, userId), eq(machinePermissions.machineId, machineId)))
        .returning();
      return updated as any;
    });
  }

  // Order management
  async createOrder(orderData: InsertOrder): Promise<Order> {
    return safeDbOperation('createOrder', 'orders', async () => {
      const [order] = await db.insert(orders).values(orderData).returning();
      return order;
    });
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    return safeDbOperation('updateOrder', 'orders', async () => {
      const [order] = await db.update(orders).set(orderData).where(eq(orders.id, id)).returning();
      if (!order) {
        throw new NotFoundError(`Order with id ${id} not found`, 'order', id);
      }
      return order;
    });
  }

  async deleteOrder(id: number): Promise<boolean> {
    return safeDbOperation('deleteOrder', 'orders', async () => {
      await db.delete(orders).where(eq(orders.id, id));
      return true;
    });
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return safeDbOperation('getOrder', 'orders', async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      return order;
    });
  }

  // Global queue management
  async getGlobalQueue(): Promise<Order[]> {
    return safeDbOperation('getGlobalQueue', 'orders', async () => {
      const all = await db
        .select()
        .from(orders)
        .where(eq(orders.isShipped, false));

      // Sort with Rush precedence
      const sorted = [...all].sort((a, b) => {
        if (a.rush && !b.rush) return -1;
        if (!a.rush && b.rush) return 1;
        if (a.rush && b.rush) {
          const ar = (a.rushSetAt ? new Date(a.rushSetAt as any).getTime() : 0);
            const br = (b.rushSetAt ? new Date(b.rushSetAt as any).getTime() : 0);
            if (ar !== br) return ar - br; // earlier rush first
        }
        const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
        const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
        if (ag !== bg) return ag - bg;
        // fallback stable by createdAt asc
        const ac = new Date(a.createdAt as any).getTime();
        const bc = new Date(b.createdAt as any).getTime();
        return ac - bc;
      });
      return sorted;
    });
  }

  async setOrderGlobalQueuePosition(orderId: number, position: number): Promise<boolean> {
    return safeDbOperation('setOrderGlobalQueuePosition', 'orders', async () => {
      // Fetch all active (not shipped) orders
      const allActive = await db
        .select()
        .from(orders)
        .where(eq(orders.isShipped, false));

      // Ensure target exists
  const exists = allActive.some((o: Order) => o.id === orderId);
      if (!exists) {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
        if (!order) throw new NotFoundError(`Order with id ${orderId} not found`, 'order', orderId);
      }

      // Partition by rush
  const rushOrders = allActive.filter((o: Order) => o.rush);
  const normalOrders = allActive.filter((o: Order) => !o.rush);

      // Sort current groups by existing global position then createdAt
  const sortGroup = (arr: Order[]) => arr.sort((a: Order, b: Order) => {
        const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
        const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
        if (ag !== bg) return ag - bg;
        const ac = new Date(a.createdAt as any).getTime();
        const bc = new Date(b.createdAt as any).getTime();
        return ac - bc;
      });
      sortGroup(rushOrders);
      sortGroup(normalOrders);

      // If target is rush, adjust within rush group; else within normal group but cannot exceed after rush group
      const target = allActive.find((o: Order) => o.id === orderId)!;
      let workingRush = [...rushOrders];
      let workingNormal = [...normalOrders];
      if (target.rush) {
        workingRush = workingRush.filter((o: Order) => o.id !== orderId);
        const newPos = Math.max(1, Math.min(position, workingRush.length + 1));
        workingRush.splice(newPos - 1, 0, target);
      } else {
        workingNormal = workingNormal.filter((o: Order) => o.id !== orderId);
        // Position requested is overall; convert to normal-only position
        const rushCount = workingRush.length;
        const relativePos = Math.max(1, position - rushCount); // position inside normal group
        const clamped = Math.max(1, Math.min(relativePos, workingNormal.length + 1));
        workingNormal.splice(clamped - 1, 0, target);
      }

      const finalList = [...workingRush, ...workingNormal];

      // Reassign sequential positions starting at 1
      for (let i = 0; i < finalList.length; i++) {
        await db.update(orders)
          .set({ globalQueuePosition: i + 1 })
          .where(eq(orders.id, finalList[i].id));
      }

      // Remove target from list
      return true;
    });
  }

  async setOrderRush(orderId: number, rushSetAt: Date): Promise<Order> {
    return safeDbOperation('setOrderRush', 'orders', async () => {
      const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!existing) throw new NotFoundError(`Order with id ${orderId} not found`, 'order', orderId);
      if (existing.rush) return existing;
      const [updated] = await db.update(orders)
        .set({ rush: true, rushSetAt, /* ensure it remains in queue */ globalQueuePosition: existing.globalQueuePosition ?? null })
        .where(eq(orders.id, orderId)).returning();
      // Rebuild global queue ordering placing rush orders first by rushSetAt
      await this.reorderGlobalQueue();
      return updated;
    });
  }

  async unsetOrderRush(orderId: number): Promise<Order> {
    return safeDbOperation('unsetOrderRush', 'orders', async () => {
      const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!existing) throw new NotFoundError(`Order with id ${orderId} not found`, 'order', orderId);
      if (!existing.rush) return existing;
      const [updated] = await db.update(orders)
        .set({ rush: false, rushSetAt: null })
        .where(eq(orders.id, orderId)).returning();
      // Rebuild global queue; move this order to end of normal list
      await this.reorderGlobalQueue(orderId);
      return updated;
    });
  }

  // Internal helper to rebuild global queue positions honoring rush precedence.
  private async reorderGlobalQueue(unrushedOrderId?: number): Promise<void> {
    const allActive = await db
      .select()
      .from(orders)
      .where(eq(orders.isShipped, false));
    const rushOrders = allActive.filter((o: Order) => o.rush);
    const normalOrders = allActive.filter((o: Order) => !o.rush);
    rushOrders.sort((a: Order, b: Order) => {
      const ar = a.rushSetAt ? new Date(a.rushSetAt as any).getTime() : 0;
      const br = b.rushSetAt ? new Date(b.rushSetAt as any).getTime() : 0;
      if (ar !== br) return ar - br;
      const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
      const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
      return ag - bg;
    });
    normalOrders.sort((a: Order, b: Order) => {
      // Keep existing relative order by current globalQueuePosition
      const ag = a.globalQueuePosition ?? Number.POSITIVE_INFINITY;
      const bg = b.globalQueuePosition ?? Number.POSITIVE_INFINITY;
      if (ag !== bg) return ag - bg;
      const ac = new Date(a.createdAt as any).getTime();
      const bc = new Date(b.createdAt as any).getTime();
      return ac - bc;
    });
    if (unrushedOrderId) {
      // Move this order to end of normal list
      const idx = normalOrders.findIndex((o: Order) => o.id === unrushedOrderId);
      if (idx >= 0) normalOrders.push(...normalOrders.splice(idx, 1));
    }
    const finalList = [...rushOrders, ...normalOrders];
    for (let i = 0; i < finalList.length; i++) {
      await db.update(orders).set({ globalQueuePosition: i + 1 }).where(eq(orders.id, finalList[i].id));
    }
  }

  async getOrderWithLocations(id: number): Promise<OrderWithDetails | undefined> {
    return safeDbOperation('getOrderWithLocations', 'orders', async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      
      if (!order) {
        throw new NotFoundError(`Order with id ${id} not found`, 'order', id);
      }
      
      // Get order locations with location details
      const orderLocationsData = await db
        .select({ ol: orderLocations, loc: locations })
        .from(orderLocations)
        .innerJoin(locations, eq(orderLocations.locationId, locations.id))
        .where(eq(orderLocations.orderId, id));
      
      // Get creator user
      let creator = undefined;
      if (order.createdBy) {
        const [user] = await db.select().from(users).where(eq(users.id, order.createdBy));
        creator = user;
      }
      
      // Get audit trail
      const auditRecords = await db.select().from(auditTrail).where(eq(auditTrail.orderId, id)).orderBy(desc(auditTrail.createdAt));
      
      // Transform the data
  const transformedLocations = orderLocationsData.map((ol: { ol: OrderLocation; loc: Location }) => ({
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

  async getAllOrders(includeShipped: boolean, pagination?: PaginationOptions): Promise<PaginatedResult<OrderWithLocations>> {
    return safeDbOperation('getAllOrders', 'orders', async () => {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const offset = (page - 1) * pageSize;
      
      // Build the query conditionally based on includeShipped
  const whereCondition = includeShipped ? undefined : eq(orders.isShipped, false);
      
      // Get the total count for pagination metadata
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(whereCondition);
      
      const totalItems = Number(countResult[0].count ?? 0);
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Get the paginated orders
      const paginatedOrders = await db.select().from(orders)
        .where(whereCondition)
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset(offset);
        
      // Get all the orderLocations for the retrieved orders
  const orderIds = paginatedOrders.map((order: Order) => order.id);
      const orderLocationsResult = orderIds.length > 0 
        ? await db
            .select({ ol: orderLocations, loc: locations })
            .from(orderLocations)
            .innerJoin(locations, eq(orderLocations.locationId, locations.id))
            .where(inArray(orderLocations.orderId, orderIds))
        : [] as { ol: OrderLocation; loc: Location }[];
      
      // Map locations to each order
    const ordersWithLocations = paginatedOrders.map((order: Order) => {
        const locs = orderLocationsResult
      .filter((row: { ol: OrderLocation; loc: Location }) => row.ol.orderId === order.id)
      .map((row: { ol: OrderLocation; loc: Location }) => ({ ...row.ol, location: row.loc }));
        return {
          ...order,
          locations: locs,
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

  async searchOrders(query: string, includeShipped: boolean, pagination?: PaginationOptions): Promise<PaginatedResult<OrderWithLocations>> {
    return safeDbOperation('searchOrders', 'orders', async () => {
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const offset = (page - 1) * pageSize;
      
      // Search query condition
      const searchPattern = `%${query}%`;
  const searchCondition = or(
        like(orders.orderNumber, searchPattern),
        like(orders.client, searchPattern),
        like(orders.tbfosNumber, searchPattern),
        like(orders.description, searchPattern)
      );
      
      // Add shipped condition if needed
      const whereCondition = includeShipped 
        ? searchCondition 
        : and(searchCondition, eq(orders.isShipped, false));
      
      // Get the total count for pagination metadata
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(whereCondition);
      
      const totalItems = Number(countResult[0].count);
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Get the paginated orders
      const paginatedOrders = await db.select().from(orders)
        .where(whereCondition)
        .orderBy(desc(orders.createdAt))
        .limit(pageSize)
        .offset(offset);
        
      // Get all the orderLocations for the retrieved orders
  const orderIds = paginatedOrders.map((order: Order) => order.id);
      const orderLocationsResult = orderIds.length > 0 
        ? await db
            .select({ ol: orderLocations, loc: locations })
            .from(orderLocations)
            .innerJoin(locations, eq(orderLocations.locationId, locations.id))
            .where(inArray(orderLocations.orderId, orderIds))
        : [] as { ol: OrderLocation; loc: Location }[];
      
      // Map locations to each order
    const ordersWithLocations = paginatedOrders.map((order: Order) => {
        const locs = orderLocationsResult
      .filter((row: { ol: OrderLocation; loc: Location }) => row.ol.orderId === order.id)
      .map((row: { ol: OrderLocation; loc: Location }) => ({ ...row.ol, location: row.loc }));
        return {
          ...order,
          locations: locs,
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

  async markOrderAsShipped(id: number, quantity: number): Promise<Order | undefined> {
    return safeDbOperation('markOrderAsShipped', 'orders', async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      
      if (!order) {
        throw new NotFoundError(`Order with id ${id} not found`, 'order', id);
      }
      
      // If shipped quantity equals total, mark as fully shipped
  const fullyShipped = quantity >= order.totalQuantity;
  const partiallyShipped = quantity > 0 && quantity < order.totalQuantity;
      
      const [updatedOrder] = await db.update(orders)
        .set({
          isShipped: fullyShipped,
          partiallyShipped: partiallyShipped,
          shippedQuantity: quantity
        })
        .where(eq(orders.id, id))
        .returning();
        
      return updatedOrder;
    });
  }

  // Order location management
  async createOrderLocation(orderLocationData: InsertOrderLocation): Promise<OrderLocation> {
    return safeDbOperation('createOrderLocation', 'orderLocations', async () => {
      const [orderLocation] = await db.insert(orderLocations).values(orderLocationData).returning();
      return orderLocation;
    });
  }

  async updateOrderLocation(id: number, data: Partial<InsertOrderLocation>): Promise<OrderLocation | undefined> {
    return safeDbOperation('updateOrderLocation', 'orderLocations', async () => {
      const [orderLocation] = await db.update(orderLocations).set(data).where(eq(orderLocations.id, id)).returning();
      if (!orderLocation) {
        throw new NotFoundError(`Order location with id ${id} not found`, 'orderLocation', id);
      }
      return orderLocation;
    });
  }
  
  async deleteOrderLocation(id: number): Promise<boolean> {
    return safeDbOperation('deleteOrderLocation', 'orderLocations', async () => {
      await db.delete(orderLocations).where(eq(orderLocations.id, id));
      return true;
    });
  }

  async getOrderLocation(id: number): Promise<OrderLocation | undefined> {
    return safeDbOperation('getOrderLocation', 'orderLocations', async () => {
      const [orderLocation] = await db.select().from(orderLocations).where(eq(orderLocations.id, id));
      return orderLocation;
    });
  }

  async getOrderLocationsByOrder(orderId: number): Promise<OrderLocation[]> {
    return safeDbOperation('getOrderLocationsByOrder', 'orderLocations', async () => {
      return await db.select().from(orderLocations).where(eq(orderLocations.orderId, orderId));
    });
  }

  async getOrderLocationsByLocation(locationId: number): Promise<(OrderLocation & { order: Order })[]> {
    return safeDbOperation('getOrderLocationsByLocation', 'orderLocations', async () => {
      const results = await db
        .select({ ol: orderLocations, o: orders })
        .from(orderLocations)
        .innerJoin(orders, eq(orderLocations.orderId, orders.id))
        .where(and(eq(orderLocations.locationId, locationId), eq(orders.isShipped, false)))
        .orderBy(asc(orderLocations.queuePosition));
        
  return results.map((r: { ol: OrderLocation; o: Order }) => ({
        ...r.ol,
        order: r.o
      }));
    });
  }
  
  async getOrdersForPrimaryLocation(locationId: number): Promise<Order[]> {
    return safeDbOperation('getOrdersForPrimaryLocation', 'locations', async () => {
      logError(
        `Getting orders for primary location ${locationId}`,
        'storage',
        'info'
      );
      
      // First, check if this location is actually a primary location
      const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
      
      logError(
        `Location isPrimary: ${location?.isPrimary}`,
        'storage',
        'debug'
      );
      
      if (!location || !location.isPrimary) {
        logError(
          `Location ${locationId} is not a primary location or does not exist`,
          'storage',
          'info'
        );
        return []; // Not a primary location, return empty array
      }
      
      // Get all active (not shipped, not finished) orders
      const activeOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.isShipped, false),
            eq(orders.isFinished, false)
          )
        );
        
      logError(
        `Found ${activeOrders.length} active orders`,
        'storage',
        'debug'
      );
      
      if (activeOrders.length === 0) {
        return [];
      }
      
      // Get all orderLocations for these orders
  const orderIds = activeOrders.map((order: Order) => order.id);
      
      const allOrderLocations = await db
        .select()
        .from(orderLocations)
        .where(inArray(orderLocations.orderId, orderIds));
      
      logError(
        `Found ${allOrderLocations.length} order location relationships`,
        'storage',
        'debug'
      );
        
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
  const ordersNeedingThisLocation = activeOrders.filter((order: Order) => {
        const statusAtLocation = orderLocationStatusMap.get(order.id);
        
        // Case 1: No relationship with this location yet
        if (statusAtLocation === undefined) {
          logError(
            `Order ${order.orderNumber} (ID: ${order.id}) needs location ${locationId}: no relationship`,
            'storage',
            'debug'
          );
          return true;
        }
        
        // Case 2: Has relationship but is not started and not in queue
        if (statusAtLocation === "not_started") {
          logError(
            `Order ${order.orderNumber} (ID: ${order.id}) needs location ${locationId}: not started yet`,
            'storage',
            'debug'
          );
          return true;
        }
        
        logError(
          `Order ${order.orderNumber} (ID: ${order.id}) doesn't need location ${locationId}: status is ${statusAtLocation}`,
          'storage',
          'debug'
        );
        return false;
      });
      
      logError(
        `Found ${ordersNeedingThisLocation.length} orders that need location ${locationId}`,
        'storage',
        'debug'
      );
      
      return ordersNeedingThisLocation;
    });
  }

  async startOrderAtLocation(orderId: number, locationId: number, userId: number): Promise<OrderLocation | undefined> {
    return safeDbOperation('startOrderAtLocation', 'orderLocations', async () => {
      // Get current time
      const now = new Date();
      
      // Update the order location
      const [updatedOrderLocation] = await db.update(orderLocations)
        .set({
          status: "in_progress",
          startedAt: now,
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

  // Queue the next location as soon as processing begins here
  await this.queueForNextLocation(orderId, locationId);
      }
      
      return updatedOrderLocation;
    });
  }

  async finishOrderAtLocation(orderId: number, locationId: number, completedQuantity: number, userId: number): Promise<OrderLocation | undefined> {
    return safeDbOperation('finishOrderAtLocation', 'orderLocations', async () => {
      // Get current time
      const now = new Date();
      
      // Update the order location
      const [updatedOrderLocation] = await db.update(orderLocations)
        .set({
          status: "done",
          completedAt: now,
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
    });
  }

  async pauseOrderAtLocation(orderId: number, locationId: number, userId: number): Promise<OrderLocation | undefined> {
    return safeDbOperation('pauseOrderAtLocation', 'orderLocations', async () => {
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
    });
  }

  async updateOrderLocationQuantity(orderId: number, locationId: number, completedQuantity: number, userId: number): Promise<OrderLocation | undefined> {
    return safeDbOperation('updateOrderLocationQuantity', 'orderLocations', async () => {
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
    });
  }

  async getLocationQueue(locationId: number): Promise<(OrderLocation & { order: Order })[]> {
    return safeDbOperation('getLocationQueue', 'orderLocations', async () => {
      // Ensure primary location auto-queues eligible orders before returning queue
      const [loc] = await db.select().from(locations).where(eq(locations.id, locationId));
      if (loc && loc.isPrimary && !loc.skipAutoQueue) {
        // Find orders at this location that are not_started but globally queued and not shipped
        const candidates = await db
          .select({ ol: orderLocations, o: orders })
          .from(orderLocations)
          .innerJoin(orders, eq(orderLocations.orderId, orders.id))
          .where(
            and(
              eq(orderLocations.locationId, locationId),
              eq(orderLocations.status, "not_started"),
              eq(orders.isShipped, false),
              isNotNull(orders.globalQueuePosition)
            )
          );

        if (candidates.length > 0) {
          // Get current max queue position at this location
          const [queueResult] = await db
            .select({ maxQueue: sql<number>`MAX(${orderLocations.queuePosition})` })
            .from(orderLocations)
            .where(
              and(
                eq(orderLocations.locationId, locationId),
                eq(orderLocations.status, "in_queue")
              )
            );
          let nextQueuePosition = ((queueResult?.maxQueue ?? 0)) + 1;

          for (const c of candidates) {
            await db
              .update(orderLocations)
              .set({ status: "in_queue", queuePosition: nextQueuePosition++ })
              .where(eq(orderLocations.id, c.ol.id));
          }

          // Recalculate queue positions based on global ordering
          await this.updateQueuePositions(locationId);
        }
      }

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
        .filter((item: { orderLocation: OrderLocation; order: Order }) => !item.order.isShipped) // Filter out shipped orders
        .map((item: { orderLocation: OrderLocation; order: Order }) => ({
          ...item.orderLocation,
          order: item.order
        }));
    });
  }

  async updateQueuePositions(locationId: number): Promise<boolean> {
    return safeDbOperation('updateQueuePositions', 'orderLocations', async () => {
      // Get all orders in queue for this location, with their order data
      const results = await db
        .select({ ol: orderLocations, o: orders })
        .from(orderLocations)
        .innerJoin(orders, eq(orderLocations.orderId, orders.id))
        .where(
          and(
            eq(orderLocations.locationId, locationId),
            eq(orderLocations.status, "in_queue"),
            eq(orders.isShipped, false)
          )
        );

      // Sort with rush precedence, then globalQueuePosition, then previous queuePosition, then createdAt
      const sorted = [...results].sort((a, b) => {
        if (a.o.rush && !b.o.rush) return -1;
        if (!a.o.rush && b.o.rush) return 1;
        if (a.o.rush && b.o.rush) {
          const ar = a.o.rushSetAt ? new Date(a.o.rushSetAt as any).getTime() : 0;
          const br = b.o.rushSetAt ? new Date(b.o.rushSetAt as any).getTime() : 0;
          if (ar !== br) return ar - br;
        }
        const ag = a.o.globalQueuePosition ?? Number.POSITIVE_INFINITY;
        const bg = b.o.globalQueuePosition ?? Number.POSITIVE_INFINITY;
        if (ag !== bg) return ag - bg;
        const aq = a.ol.queuePosition ?? Number.POSITIVE_INFINITY;
        const bq = b.ol.queuePosition ?? Number.POSITIVE_INFINITY;
        if (aq !== bq) return aq - bq;
        const ac = new Date(a.o.createdAt as any).getTime();
        const bc = new Date(b.o.createdAt as any).getTime();
        return bc - ac;
      });

      // Re-assign queue positions starting from 1 in this sorted order
      for (let i = 0; i < sorted.length; i++) {
        await db.update(orderLocations)
          .set({ queuePosition: i + 1 })
          .where(eq(orderLocations.id, sorted[i].ol.id));
      }

      return true;
    });
  }

  async recalcAllLocationQueues(): Promise<boolean> {
    return safeDbOperation('recalcAllLocationQueues', 'orderLocations', async () => {
      const locs = await db.select().from(locations);
      for (const loc of locs) {
        // Auto-promote eligible orders into the queue for primary locations
        // Rule: If an order is globally queued (has a globalQueuePosition) and not shipped,
        // and this location has an order-location record in "not_started",
        // then mark it as "in_queue" so it appears in the location queue.
        if (loc.isPrimary) {
          const candidates = await db
            .select({ ol: orderLocations, o: orders })
            .from(orderLocations)
            .innerJoin(orders, eq(orderLocations.orderId, orders.id))
            .where(
              and(
                eq(orderLocations.locationId, loc.id),
                eq(orderLocations.status, "not_started"),
                eq(orders.isShipped, false),
                isNotNull(orders.globalQueuePosition)
              )
            );

          for (const c of candidates) {
            await db
              .update(orderLocations)
              .set({ status: "in_queue" })
              .where(eq(orderLocations.id, c.ol.id));
          }
        }

        // Recalculate positions based on global ordering for this location
        await this.updateQueuePositions(loc.id);
      }
      return true;
    });
  }

  // Helper method to queue an order for the next location
  private async queueForNextLocation(orderId: number, currentLocationId: number): Promise<void> {
    return safeDbOperation('queueForNextLocation', 'orderLocations', async () => {
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
            .select({ maxQueue: sql<number>`MAX(queue_position)` })
            .from(orderLocations)
            .where(
              and(
                eq(orderLocations.locationId, nextLocation.id),
                eq(orderLocations.status, "in_queue")
              )
            );
          const nextQueuePosition = ((queueResult?.maxQueue ?? 0)) + 1;
          
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
          .select({ maxQueue: sql<number>`MAX(queue_position)` })
          .from(orderLocations)
          .where(
            and(
              eq(orderLocations.locationId, nextLocation.id),
              eq(orderLocations.status, "in_queue")
            )
          );
          
        const nextQueuePosition = ((queueResult?.maxQueue ?? 0)) + 1;
        
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
    });
  }

  // Helper method to check if all locations for an order are done
  private async checkAllLocationsDone(orderId: number): Promise<void> {
    return safeDbOperation('checkAllLocationsDone', 'orderLocations', async () => {
      // Get the order
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) return;
      
      // Get all order locations
      const orderLocationsData = await db
        .select()
        .from(orderLocations)
        .where(eq(orderLocations.orderId, orderId));
        
      // Check if all are in "done" status
  const allDone = orderLocationsData.every((ol: OrderLocation) => ol.status === "done");
      
    if (allDone && !order.isFinished) {
        // Update order to mark as finished
        await db.update(orders)
      .set({ isFinished: true })
          .where(eq(orders.id, orderId));
      }
    });
  }

  // Audit trail
  async createAuditRecord(auditData: InsertAuditTrail): Promise<AuditTrail> {
    return safeDbOperation('createAuditRecord', 'auditTrail', async () => {
      const [audit] = await db.insert(auditTrail).values(auditData).returning();
      return audit;
    });
  }

  async getAuditTrailForOrder(orderId: number): Promise<AuditTrail[]> {
    return safeDbOperation('getAuditTrailForOrder', 'auditTrail', async () => {
      return await db.select().from(auditTrail).where(eq(auditTrail.orderId, orderId)).orderBy(desc(auditTrail.createdAt));
    });
  }

  async getAllAuditTrail(limit?: number): Promise<(AuditTrail & { order: Order, user?: User, location?: Location })[]>;
  async getAllAuditTrail(pagination?: PaginationOptions): Promise<PaginatedResult<AuditTrail & { order: Order, user?: User, location?: Location }>>;
  async getAllAuditTrail(limitOrPagination?: number | PaginationOptions): Promise<(AuditTrail & { order: Order, user?: User, location?: Location })[] | PaginatedResult<AuditTrail & { order: Order, user?: User, location?: Location }>> {
    return safeDbOperation('getAllAuditTrail', 'auditTrail', async () => {
      // Handle both function signatures
    if (typeof limitOrPagination === 'number') {
        // Simple limit case
        const limit = limitOrPagination;
        const results = await db
          .select()
          .from(auditTrail)
      .innerJoin(orders, eq(auditTrail.orderId, orders.id))
          .leftJoin(users, eq(auditTrail.userId, users.id))
          .leftJoin(locations, eq(auditTrail.locationId, locations.id))
          .orderBy(desc(auditTrail.createdAt))
          .limit(limit);
          
  return results.map((r: { audit_trail: AuditTrail; orders: Order; users: User | null; locations: Location | null }) => ({
          ...r.audit_trail,
          order: r.orders,
          user: r.users ?? undefined,
          location: r.locations ?? undefined,
        }));
      } 
      else {
        // Pagination case
        const pagination = limitOrPagination as PaginationOptions || { page: 1, pageSize: 100 };
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || 100;
        const offset = (page - 1) * pageSize;
        
        // Count total items for pagination
  const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(auditTrail);
        
        const totalItems = Number(countResult?.count || 0);
        const totalPages = Math.ceil(totalItems / pageSize);
        
        // Get paginated data
        const results = await db
          .select()
          .from(auditTrail)
          .innerJoin(orders, eq(auditTrail.orderId, orders.id))
          .leftJoin(users, eq(auditTrail.userId, users.id))
          .leftJoin(locations, eq(auditTrail.locationId, locations.id))
          .orderBy(desc(auditTrail.createdAt))
          .limit(pageSize)
          .offset(offset);
          
        // Format the data
  const data = results.map((r: { audit_trail: AuditTrail; orders: Order; users: User | null; locations: Location | null }) => ({
          ...r.audit_trail,
          order: r.orders,
          user: r.users ?? undefined,
          location: r.locations ?? undefined,
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
  async createHelpRequest(helpRequestData: InsertHelpRequest): Promise<HelpRequest> {
    return safeDbOperation('createHelpRequest', 'helpRequests', async () => {
      const [helpRequest] = await db.insert(helpRequests).values(helpRequestData).returning();
      return helpRequest;
    });
  }

  async resolveHelpRequest(id: number): Promise<HelpRequest | undefined> {
    return safeDbOperation('resolveHelpRequest', 'helpRequests', async () => {
      const now = new Date();
      
      const [helpRequest] = await db.update(helpRequests)
        .set({
          isResolved: true,
          resolvedAt: now
        })
        .where(eq(helpRequests.id, id))
        .returning();
        
      return helpRequest;
    });
  }

  async getActiveHelpRequests(): Promise<(HelpRequest & { order: Order, location: Location, user: User })[]> {
    return safeDbOperation('getActiveHelpRequests', 'helpRequests', async () => {
      const results = await db
        .select({ hr: helpRequests, o: orders, l: locations, u: users })
        .from(helpRequests)
        .innerJoin(orders, eq(helpRequests.orderId, orders.id))
        .innerJoin(locations, eq(helpRequests.locationId, locations.id))
        .innerJoin(users, eq(helpRequests.userId, users.id))
        .where(eq(helpRequests.isResolved, false))
        .orderBy(desc(helpRequests.createdAt));
        
  return results.map((r: { hr: HelpRequest; o: Order; l: Location; u: User }) => ({
        ...r.hr,
        order: r.o,
        location: r.l,
        user: r.u
      }));
    });
  }

  // Email settings
  async addEmailSetting(emailSettingData: InsertEmailSetting): Promise<EmailSetting> {
    return safeDbOperation('addEmailSetting', 'emailSettings', async () => {
      const [emailSetting] = await db.insert(emailSettings).values(emailSettingData).returning();
      return emailSetting;
    });
  }

  async updateEmailSetting(id: number, data: Partial<InsertEmailSetting>): Promise<EmailSetting | undefined> {
    return safeDbOperation('updateEmailSetting', 'emailSettings', async () => {
      const [emailSetting] = await db.update(emailSettings).set(data).where(eq(emailSettings.id, id)).returning();
      if (!emailSetting) {
        throw new NotFoundError(`Email setting with id ${id} not found`, 'emailSetting', id);
      }
      return emailSetting;
    });
  }

  async deleteEmailSetting(id: number): Promise<boolean> {
    return safeDbOperation('deleteEmailSetting', 'emailSettings', async () => {
      await db.delete(emailSettings).where(eq(emailSettings.id, id));
      return true;
    });
  }

  async getEmailsForShipping(): Promise<EmailSetting[]> {
    return safeDbOperation('getEmailsForShipping', 'emailSettings', async () => {
  return await db.select().from(emailSettings).where(eq(emailSettings.forShipping, true));
    });
  }

  async getEmailsForHelp(): Promise<EmailSetting[]> {
    return safeDbOperation('getEmailsForHelp', 'emailSettings', async () => {
  return await db.select().from(emailSettings).where(eq(emailSettings.forHelp, true));
    });
  }

  async getAllEmailSettings(): Promise<EmailSetting[]> {
    return safeDbOperation('getAllEmailSettings', 'emailSettings', async () => {
      return await db.select().from(emailSettings);
    });
  }

  // PDF settings
  async getPdfSettings(): Promise<PdfSetting | undefined> {
    return safeDbOperation('getPdfSettings', 'pdfSettings', async () => {
      const [settings] = await db.select().from(pdfSettings).limit(1);
      return settings;
    });
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings | undefined> {
    return safeDbOperation('getAppSettings', 'appSettings', async () => {
      const [settings] = await db.select().from(appSettings).limit(1);
      return settings;
    });
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    return safeDbOperation('updateAppSettings', 'appSettings', async () => {
      const existing = await this.getAppSettings();
      const now = new Date();
      if (existing) {
        const [updated] = await db
          .update(appSettings)
          .set({ ...settings, updatedAt: now } as any)
          .where(eq(appSettings.id, existing.id))
          .returning();
        return updated;
      }
      const [created] = await db
        .insert(appSettings)
        .values({
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
          createdAt: now,
          updatedAt: now,
          ...(settings as any),
        })
        .returning();
      return created;
    });
  }

  // Remove an order from the global queue and all location queues
  async removeOrderFromAllQueues(orderId: number): Promise<boolean> {
    return safeDbOperation('removeOrderFromAllQueues', 'orders', async () => {
      // Clear global queue position
      await db.update(orders)
        .set({ globalQueuePosition: null, rush: false, rushSetAt: null })
        .where(eq(orders.id, orderId));

      // Set any in_queue status entries for this order to not_started and clear queuePosition
      await db.update(orderLocations)
        .set({ status: "not_started", queuePosition: null })
        .where(eq(orderLocations.orderId, orderId));

      // Recalculate all location queues so positions are contiguous
      await this.recalcAllLocationQueues();
      return true;
    });
  }

  async updatePdfSettings(data: InsertPdfSetting): Promise<PdfSetting> {
    return safeDbOperation('updatePdfSettings', 'pdfSettings', async () => {
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
    });
  }
  
  // Machine System - RFID Card Management
  async getRfidCardByCardId(cardId: string): Promise<(RfidCard & { user: User }) | undefined> {
    return safeDbOperation('getRfidCardByCardId', 'rfidCards', async () => {
      const result = await db.select({
        rfidCard: rfidCards,
        user: users
      })
      .from(rfidCards)
      .innerJoin(users, eq(rfidCards.userId, users.id))
      .where(eq(rfidCards.cardId, cardId));
      
      if (result.length === 0) {
        return undefined;
      }
      
      // Format the result
      return {
        ...result[0].rfidCard,
        user: result[0].user
      };
    });
  }
  
  async createRfidCard(rfidCard: InsertRfidCard): Promise<RfidCard> {
    return safeDbOperation('createRfidCard', 'rfidCards', async () => {
      const [result] = await db.insert(rfidCards).values(rfidCard).returning();
      return result;
    });
  }
  
  async updateRfidCard(cardId: string, data: Partial<InsertRfidCard>): Promise<RfidCard | undefined> {
    return safeDbOperation('updateRfidCard', 'rfidCards', async () => {
      const [result] = await db.update(rfidCards).set(data).where(eq(rfidCards.cardId, cardId)).returning();
      if (!result) {
        throw new NotFoundError(`RFID card with id ${cardId} not found`, 'rfidCard', cardId);
      }
      return result;
    });
  }
  
  async deleteRfidCard(cardId: string): Promise<boolean> {
    return safeDbOperation('deleteRfidCard', 'rfidCards', async () => {
      await db.delete(rfidCards).where(eq(rfidCards.cardId, cardId));
      return true;
    });
  }

  async getAllRfidCards(): Promise<(RfidCard & { user: User })[]> {
    return safeDbOperation('getAllRfidCards', 'rfidCards', async () => {
      const results = await db.select({
        rfidCard: rfidCards,
        user: users
      })
      .from(rfidCards)
      .innerJoin(users, eq(rfidCards.userId, users.id));
      
  return results.map((r: { rfidCard: RfidCard; user: User }) => ({
        ...r.rfidCard,
        user: r.user
      }));
    });
  }
  
  // Machine System - Access Levels
  async getAccessLevel(userId: number, machineId: string): Promise<AccessLevel | undefined> {
    return safeDbOperation('getAccessLevel', 'accessLevels', async () => {
      const [result] = await db.select().from(accessLevels).where(
        and(
          eq(accessLevels.userId, userId),
          eq(accessLevels.machineId, machineId)
        )
      );
      return result;
    });
  }
  
  async createAccessLevel(accessLevel: InsertAccessLevel): Promise<AccessLevel> {
    return safeDbOperation('createAccessLevel', 'accessLevels', async () => {
      const [result] = await db.insert(accessLevels).values(accessLevel).returning();
      return result;
    });
  }
  
  async updateAccessLevel(id: number, data: Partial<InsertAccessLevel>): Promise<AccessLevel | undefined> {
    return safeDbOperation('updateAccessLevel', 'accessLevels', async () => {
      const [result] = await db.update(accessLevels).set(data).where(eq(accessLevels.id, id)).returning();
      if (!result) {
        throw new NotFoundError(`Access level with id ${id} not found`, 'accessLevel', id);
      }
      return result;
    });
  }
  
  async deleteAccessLevel(id: number): Promise<boolean> {
    return safeDbOperation('deleteAccessLevel', 'accessLevels', async () => {
      await db.delete(accessLevels).where(eq(accessLevels.id, id));
      return true;
    });
  }
  
  async getAllAccessLevels(): Promise<(AccessLevel & { user: User })[]> {
    return safeDbOperation('getAllAccessLevels', 'accessLevels', async () => {
      const results = await db.select({
        accessLevel: accessLevels,
        user: users
      })
      .from(accessLevels)
      .innerJoin(users, eq(accessLevels.userId, users.id));
      
  return results.map((r: { accessLevel: AccessLevel; user: User }) => ({
        ...r.accessLevel,
        user: r.user
      }));
    });
  }
  
  // Machine System - Access Logs
  async createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog> {
    return safeDbOperation('createAccessLog', 'accessLogs', async () => {
      const [result] = await db.insert(accessLogs).values(accessLog).returning();
      return result;
    });
  }
  
  async getAccessLogsByUser(userId: number): Promise<AccessLog[]> {
    return safeDbOperation('getAccessLogsByUser', 'accessLogs', async () => {
      return await db.select().from(accessLogs).where(eq(accessLogs.userId, userId));
    });
  }
  
  async getAccessLogsByMachine(machineId: string): Promise<AccessLog[]> {
    return safeDbOperation('getAccessLogsByMachine', 'accessLogs', async () => {
      return await db.select().from(accessLogs).where(eq(accessLogs.machineId, machineId));
    });
  }
  
  async getRecentAccessLogs(limit?: number): Promise<(AccessLog & { user: User })[]>;
  async getRecentAccessLogs(pagination?: PaginationOptions): Promise<PaginatedResult<AccessLog & { user: User }>>;
  async getRecentAccessLogs(limitOrPagination?: number | PaginationOptions): Promise<(AccessLog & { user: User })[] | PaginatedResult<AccessLog & { user: User }>> {
    return safeDbOperation('getRecentAccessLogs', 'accessLogs', async () => {
      // Handle both function signatures
      if (typeof limitOrPagination === 'number') {
        // Simple limit case
        const limit = limitOrPagination;
        const results = await db.select({
          accessLog: accessLogs,
          user: users
        })
        .from(accessLogs)
        .innerJoin(users, eq(accessLogs.userId, users.id))
        .orderBy(desc(accessLogs.timestamp))
        .limit(limit);
        
  return results.map((r: { accessLog: AccessLog; user: User }) => ({
          ...r.accessLog,
          user: r.user
        }));
      } 
      else {
        // Pagination case
        const pagination = limitOrPagination as PaginationOptions;
        
        // Count total items for pagination
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(accessLogs);
        
        const totalItems = countResult?.count || 0;
        const pageSize = pagination?.pageSize || 50; // Default page size
        const totalPages = Math.ceil(totalItems / pageSize);
        const currentPage = pagination?.page || 1;
        
        // Get paginated data
        const results = await db
          .select({
            accessLog: accessLogs,
            user: users
          })
          .from(accessLogs)
          .innerJoin(users, eq(accessLogs.userId, users.id))
          .orderBy(desc(accessLogs.timestamp))
          .limit(pageSize)
          .offset((currentPage - 1) * pageSize);
        
        // Format the data
  const data = results.map((r: { accessLog: AccessLog; user: User }) => ({
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
  async createMachineAlert(alert: InsertMachineAlert): Promise<MachineAlert> {
    return safeDbOperation('createMachineAlert', 'machineAlerts', async () => {
      const [result] = await db.insert(machineAlerts).values(alert).returning();
      return result;
    });
  }
  
  async getMachineAlert(id: number): Promise<MachineAlert | undefined> {
    return safeDbOperation('getMachineAlert', 'machineAlerts', async () => {
      const [result] = await db.select().from(machineAlerts).where(eq(machineAlerts.id, id));
      return result;
    });
  }
  
  async updateMachineAlert(id: number, data: Partial<InsertMachineAlert>): Promise<MachineAlert | undefined> {
    return safeDbOperation('updateMachineAlert', 'machineAlerts', async () => {
      const [result] = await db.update(machineAlerts).set(data).where(eq(machineAlerts.id, id)).returning();
      if (!result) {
        throw new NotFoundError(`Machine alert with id ${id} not found`, 'machineAlert', id);
      }
      return result;
    });
  }
  
  async getPendingMachineAlerts(): Promise<(MachineAlert & { sender?: User })[]> {
    return safeDbOperation('getPendingMachineAlerts', 'machineAlerts', async () => {
      const results = await db.select({
        machineAlert: machineAlerts,
        user: users
      })
      .from(machineAlerts)
      .where(ne(machineAlerts.status, "resolved"))
      .leftJoin(users, eq(machineAlerts.senderId, users.id));
      
  return results.map((r: { machineAlert: MachineAlert; user: User | null }) => ({
        ...r.machineAlert,
        sender: r.user ?? undefined
      }));
    });
  }
  
  async getMachineAlertsByMachine(machineId: string): Promise<MachineAlert[]> {
    return safeDbOperation('getMachineAlertsByMachine', 'machineAlerts', async () => {
      return await db.select().from(machineAlerts).where(eq(machineAlerts.machineId, machineId));
    });
  }

  async getAllMachineAlerts(): Promise<(MachineAlert & { sender?: User })[]> {
    return safeDbOperation('getAllMachineAlerts', 'machineAlerts', async () => {
      const results = await db.select({ machineAlert: machineAlerts, user: users })
        .from(machineAlerts)
        .leftJoin(users, eq(machineAlerts.senderId, users.id))
        .orderBy(desc(machineAlerts.createdAt));
  return results.map((r: { machineAlert: MachineAlert; user: User | null }) => ({ ...r.machineAlert, sender: r.user ?? undefined }));
    });
  }
  
  async resolveMachineAlert(id: number, userId: number): Promise<MachineAlert | undefined> {
    return safeDbOperation('resolveMachineAlert', 'machineAlerts', async () => {
      const now = new Date();
      
      const [result] = await db.update(machineAlerts)
        .set({
          status: "resolved",
          resolvedAt: now,
          resolvedById: userId
        })
        .where(eq(machineAlerts.id, id))
        .returning();
        
      return result;
    });
  }
  
  async acknowledgeMachineAlert(id: number): Promise<MachineAlert | undefined> {
    return safeDbOperation('acknowledgeMachineAlert', 'machineAlerts', async () => {
      const [result] = await db.update(machineAlerts)
        .set({
          status: "acknowledged"
        })
        .where(eq(machineAlerts.id, id))
        .returning();
        
      return result;
    });
  }

  // Help Requests history
  async getAllHelpRequests(): Promise<(HelpRequest & { order: Order, location: Location, user: User })[]> {
    return safeDbOperation('getAllHelpRequests', 'helpRequests', async () => {
      const rows = await db
        .select({ hr: helpRequests, o: orders, l: locations, u: users })
        .from(helpRequests)
        .innerJoin(orders, eq(helpRequests.orderId, orders.id))
        .innerJoin(locations, eq(helpRequests.locationId, locations.id))
        .innerJoin(users, eq(helpRequests.userId, users.id))
        .orderBy(desc(helpRequests.createdAt));
  return rows.map((r: { hr: HelpRequest; o: Order; l: Location; u: User }) => ({ ...r.hr, order: r.o, location: r.l, user: r.u }));
    });
  }
  
  // API Configuration
  async getApiConfig(): Promise<ApiConfig | undefined> {
    return safeDbOperation('getApiConfig', 'apiConfigs', async () => {
      const [result] = await db.select().from(apiConfigs).limit(1);
      return result;
    });
  }
  
  async updateApiConfig(config: InsertApiConfig): Promise<ApiConfig> {
    return safeDbOperation('updateApiConfig', 'apiConfigs', async () => {
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
    });
  }
}

export const storage = new SQLiteStorage();
