import { storage } from '../../server/storage';
import { runMigrations } from '../../server/db-migration';
import { generateTestData } from '../helpers/test-server';

describe('Database Operations', () => {
  beforeEach(async () => {
    // Initialize fresh database for each test
    await runMigrations();
  });

  describe('Orders', () => {
    test('should create order successfully', async () => {
      const orderData = generateTestData('order');
      const createdOrder = await storage.createOrder(orderData);

      expect(createdOrder).toHaveProperty('id');
      expect(createdOrder.orderNumber).toBe(orderData.orderNumber);
      expect(createdOrder.client).toBe(orderData.client);
      expect(createdOrder.totalQuantity).toBe(orderData.totalQuantity);
    });

    test('should retrieve order by id', async () => {
      const orderData = generateTestData('order');
      const createdOrder = await storage.createOrder(orderData);
      
      const retrievedOrder = await storage.getOrderWithLocations(createdOrder.id);
      
      expect(retrievedOrder).toBeTruthy();
      expect(retrievedOrder!.id).toBe(createdOrder.id);
      expect(retrievedOrder!.orderNumber).toBe(orderData.orderNumber);
    });

    test('should update order successfully', async () => {
      const orderData = generateTestData('order');
      const createdOrder = await storage.createOrder(orderData);
      
      const updateData = {
        client: 'Updated Client Name',
        totalQuantity: 200
      };
      
      const updatedOrder = await storage.updateOrder(createdOrder.id, updateData);
      
      expect(updatedOrder).toBeTruthy();
      expect(updatedOrder!.client).toBe('Updated Client Name');
      expect(updatedOrder!.totalQuantity).toBe(200);
    });

    test('should delete order successfully', async () => {
      const orderData = generateTestData('order');
      const createdOrder = await storage.createOrder(orderData);
      
      await storage.deleteOrder(createdOrder.id);
      
      const deletedOrder = await storage.getOrderWithLocations(createdOrder.id);
      expect(deletedOrder).toBeNull();
    });

    test('should get paginated orders', async () => {
      // Create multiple orders
      const orderDataList = generateTestData('order', 5);
      for (const orderData of orderDataList) {
        await storage.createOrder(orderData);
      }
      
      const paginatedResult = await storage.getAllOrders(false, { page: 1, pageSize: 3 });
      
      expect(paginatedResult.data).toHaveLength(3);
      expect(paginatedResult.pagination.totalItems).toBe(5);
      expect(paginatedResult.pagination.totalPages).toBe(2);
      expect(paginatedResult.pagination.page).toBe(1);
      expect(paginatedResult.pagination.pageSize).toBe(3);
    });

    test('should search orders by query', async () => {
      const orderData1 = generateTestData('order');
      orderData1.orderNumber = 'SEARCH-TEST-001';
      orderData1.client = 'Searchable Client';
      
      const orderData2 = generateTestData('order');
      orderData2.orderNumber = 'DIFFERENT-002';
      orderData2.client = 'Other Client';
      
      await storage.createOrder(orderData1);
      await storage.createOrder(orderData2);
      
      const searchResult = await storage.searchOrders('SEARCH', false, { page: 1, pageSize: 10 });
      
      expect(searchResult.data).toHaveLength(1);
      expect(searchResult.data[0].orderNumber).toBe('SEARCH-TEST-001');
    });
  });

  describe('Locations', () => {
    test('should create location successfully', async () => {
      const locationData = generateTestData('location');
      const createdLocation = await storage.createLocation(locationData);

      expect(createdLocation).toHaveProperty('id');
      expect(createdLocation.name).toBe(locationData.name);
      expect(createdLocation.isPrimary).toBe(locationData.isPrimary);
    });

    test('should get locations in order', async () => {
      const locationDataList = generateTestData('location', 3);
      
      for (const locationData of locationDataList) {
        await storage.createLocation(locationData);
      }
      
      const locations = await storage.getLocationsByOrder();
      
      expect(locations).toHaveLength(3);
      // Should be ordered by usedOrder
      expect(locations[0].usedOrder).toBeLessThanOrEqual(locations[1].usedOrder);
      expect(locations[1].usedOrder).toBeLessThanOrEqual(locations[2].usedOrder);
    });

    test('should update location successfully', async () => {
      const locationData = generateTestData('location');
      const createdLocation = await storage.createLocation(locationData);
      
      const updateData = {
        name: 'Updated Location Name',
        isPrimary: true
      };
      
      const updatedLocation = await storage.updateLocation(createdLocation.id, updateData);
      
      expect(updatedLocation).toBeTruthy();
      expect(updatedLocation!.name).toBe('Updated Location Name');
      expect(updatedLocation!.isPrimary).toBe(true);
    });

    test('should delete location successfully', async () => {
      const locationData = generateTestData('location');
      const createdLocation = await storage.createLocation(locationData);
      
      await storage.deleteLocation(createdLocation.id);
      
      const deletedLocation = await storage.getLocation(createdLocation.id);
      expect(deletedLocation).toBeNull();
    });
  });

  describe('Order Locations', () => {
    test('should create order location relationship', async () => {
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const order = await storage.createOrder(orderData);
      const location = await storage.createLocation(locationData);
      
      const orderLocationData = {
        orderId: order.id,
        locationId: location.id,
        status: 'not_started' as const,
        completedQuantity: 0
      };
      
      const orderLocation = await storage.createOrderLocation(orderLocationData);
      
      expect(orderLocation).toHaveProperty('id');
      expect(orderLocation.orderId).toBe(order.id);
      expect(orderLocation.locationId).toBe(location.id);
      expect(orderLocation.status).toBe('not_started');
    });

    test('should start order at location', async () => {
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const order = await storage.createOrder(orderData);
      const location = await storage.createLocation(locationData);
      
      await storage.createOrderLocation({
        orderId: order.id,
        locationId: location.id,
        status: 'not_started',
        completedQuantity: 0
      });
      
      const updatedOrderLocation = await storage.startOrderAtLocation(order.id, location.id, 1);
      
      expect(updatedOrderLocation).toBeTruthy();
      expect(updatedOrderLocation!.status).toBe('in_progress');
      expect(updatedOrderLocation!.startedAt).toBeTruthy();
    });

    test('should finish order at location', async () => {
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const order = await storage.createOrder(orderData);
      const location = await storage.createLocation(locationData);
      
      await storage.createOrderLocation({
        orderId: order.id,
        locationId: location.id,
        status: 'in_progress',
        completedQuantity: 0
      });
      
      const completedQuantity = 50;
      const updatedOrderLocation = await storage.finishOrderAtLocation(
        order.id, 
        location.id, 
        completedQuantity, 
        1
      );
      
      expect(updatedOrderLocation).toBeTruthy();
      expect(updatedOrderLocation!.status).toBe('done');
      expect(updatedOrderLocation!.completedQuantity).toBe(completedQuantity);
      expect(updatedOrderLocation!.completedAt).toBeTruthy();
    });
  });

  describe('Audit Trail', () => {
    test('should create audit record', async () => {
      const orderData = generateTestData('order');
      const order = await storage.createOrder(orderData);
      
      const auditData = {
        orderId: order.id,
        userId: 1,
        action: 'created',
        details: 'Order created for testing'
      };
      
      const auditRecord = await storage.createAuditRecord(auditData);
      
      expect(auditRecord).toHaveProperty('id');
      expect(auditRecord.orderId).toBe(order.id);
      expect(auditRecord.action).toBe('created');
      expect(auditRecord.details).toBe('Order created for testing');
    });

    test('should get audit trail for order', async () => {
      const orderData = generateTestData('order');
      const order = await storage.createOrder(orderData);
      
      // Create multiple audit records
      await storage.createAuditRecord({
        orderId: order.id,
        userId: 1,
        action: 'created',
        details: 'Order created'
      });
      
      await storage.createAuditRecord({
        orderId: order.id,
        userId: 1,
        action: 'updated',
        details: 'Order updated'
      });
      
      const auditTrail = await storage.getAuditTrailForOrder(order.id);
      
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[0].action).toBe('updated'); // Most recent first
      expect(auditTrail[1].action).toBe('created');
    });
  });

  describe('Help Requests', () => {
    test('should create help request', async () => {
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const order = await storage.createOrder(orderData);
      const location = await storage.createLocation(locationData);
      
      const helpRequestData = {
        orderId: order.id,
        locationId: location.id,
        userId: 1,
        notes: 'Need assistance with this order'
      };
      
      const helpRequest = await storage.createHelpRequest(helpRequestData);
      
      expect(helpRequest).toHaveProperty('id');
      expect(helpRequest.orderId).toBe(order.id);
      expect(helpRequest.notes).toBe('Need assistance with this order');
      expect(helpRequest.isResolved).toBe(false);
    });

    test('should resolve help request', async () => {
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const order = await storage.createOrder(orderData);
      const location = await storage.createLocation(locationData);
      
      const helpRequest = await storage.createHelpRequest({
        orderId: order.id,
        locationId: location.id,
        userId: 1,
        notes: 'Need help'
      });
      
      const resolvedRequest = await storage.resolveHelpRequest(helpRequest.id);
      
      expect(resolvedRequest).toBeTruthy();
      expect(resolvedRequest!.isResolved).toBe(true);
      expect(resolvedRequest!.resolvedAt).toBeTruthy();
    });

    test('should get active help requests', async () => {
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const order = await storage.createOrder(orderData);
      const location = await storage.createLocation(locationData);
      
      // Create unresolved help request
      await storage.createHelpRequest({
        orderId: order.id,
        locationId: location.id,
        userId: 1,
        notes: 'Active help request'
      });
      
      // Create resolved help request
      const resolvedRequest = await storage.createHelpRequest({
        orderId: order.id,
        locationId: location.id,
        userId: 1,
        notes: 'Resolved help request'
      });
      await storage.resolveHelpRequest(resolvedRequest.id);
      
      const activeRequests = await storage.getActiveHelpRequests();
      
      expect(activeRequests).toHaveLength(1);
      expect(activeRequests[0].notes).toBe('Active help request');
      expect(activeRequests[0].isResolved).toBe(false);
    });
  });
});
