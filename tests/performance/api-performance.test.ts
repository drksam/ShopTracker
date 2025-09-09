import { performance } from 'perf_hooks';
import { TestServer } from '../helpers/test-server';
import { generateTestData } from '../helpers/test-server';

describe('Performance Tests', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  beforeEach(async () => {
    await testServer.resetDatabase();
  });

  describe('API Performance', () => {
    test('should handle concurrent order creation', async () => {
      const concurrentRequests = 10;
      const orderData = generateTestData('order');
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        const data = { ...orderData, orderNumber: `PERF-${i + 1}` };
        return testServer.request
          .post('/api/orders')
          .send(data)
          .expect(201);
      });
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Created ${concurrentRequests} orders in ${duration.toFixed(2)}ms`);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('should handle large order list pagination efficiently', async () => {
      // Create a large dataset
      const orderCount = 100;
      const orderDataList = generateTestData('order', orderCount);
      
      // Measure bulk creation time
      const createStartTime = performance.now();
      
      for (const orderData of orderDataList) {
        await testServer.request
          .post('/api/orders')
          .send(orderData)
          .expect(201);
      }
      
      const createEndTime = performance.now();
      const createDuration = createEndTime - createStartTime;
      
      console.log(`Created ${orderCount} orders in ${createDuration.toFixed(2)}ms`);
      
      // Measure pagination performance
      const fetchStartTime = performance.now();
      
      const response = await testServer.request
        .get('/api/orders?page=1&pageSize=20')
        .expect(200);
      
      const fetchEndTime = performance.now();
      const fetchDuration = fetchEndTime - fetchStartTime;
      
      console.log(`Fetched paginated orders in ${fetchDuration.toFixed(2)}ms`);
      
      expect(response.body.data).toHaveLength(20);
      expect(response.body.pagination.totalItems).toBe(orderCount);
      
      // Pagination should be fast even with large dataset
      expect(fetchDuration).toBeLessThan(1000); // 1 second
    });

    test('should handle search queries efficiently', async () => {
      // Create orders with searchable content
      const searchableOrders = [
        { ...generateTestData('order'), orderNumber: 'SEARCH-001', client: 'Alpha Corp' },
        { ...generateTestData('order'), orderNumber: 'SEARCH-002', client: 'Alpha Industries' },
        { ...generateTestData('order'), orderNumber: 'SEARCH-003', client: 'Beta Corp' },
        { ...generateTestData('order'), orderNumber: 'DIFF-004', client: 'Gamma Corp' }
      ];
      
      // Add some noise data
      const noiseOrders = generateTestData('order', 50);
      
      for (const orderData of [...searchableOrders, ...noiseOrders]) {
        await testServer.request
          .post('/api/orders')
          .send(orderData)
          .expect(201);
      }
      
      // Test search performance
      const searchStartTime = performance.now();
      
      const searchResponse = await testServer.request
        .get('/api/orders?q=Alpha&page=1&pageSize=10')
        .expect(200);
      
      const searchEndTime = performance.now();
      const searchDuration = searchEndTime - searchStartTime;
      
      console.log(`Search query completed in ${searchDuration.toFixed(2)}ms`);
      
      expect(searchResponse.body.data).toHaveLength(2);
      expect(searchDuration).toBeLessThan(500); // 500ms
    });

    test('should handle rapid status updates', async () => {
      // Create order and location
      const orderData = generateTestData('order');
      const locationData = generateTestData('location');
      
      const orderResponse = await testServer.request
        .post('/api/orders')
        .send(orderData)
        .expect(201);
      
      const locationResponse = await testServer.request
        .post('/api/locations')
        .send(locationData)
        .expect(201);
      
      const orderId = orderResponse.body.id;
      const locationId = locationResponse.body.id;
      
      // Create order location relationship
      await testServer.request
        .post('/api/order-locations')
        .send({
          orderId,
          locationId,
          status: 'not_started',
          completedQuantity: 0
        })
        .expect(201);
      
      // Test rapid status updates
      const updateCount = 20;
      const startTime = performance.now();
      
      for (let i = 0; i < updateCount; i++) {
        await testServer.request
          .put(`/api/orders/${orderId}/locations/${locationId}/quantity`)
          .send({ quantity: i + 1 })
          .expect(200);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Performed ${updateCount} status updates in ${duration.toFixed(2)}ms`);
      
      // Should handle rapid updates efficiently
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });

  describe('Database Performance', () => {
    test('should handle large audit trail queries', async () => {
      const orderData = generateTestData('order');
      const orderResponse = await testServer.request
        .post('/api/orders')
        .send(orderData)
        .expect(201);
      
      const orderId = orderResponse.body.id;
      
      // Generate many audit records
      const auditCount = 200;
      
      const createAuditStartTime = performance.now();
      
      for (let i = 0; i < auditCount; i++) {
        await testServer.request
          .post('/api/audit')
          .send({
            orderId,
            action: `action-${i}`,
            details: `Audit record ${i + 1} for performance testing`
          })
          .expect(201);
      }
      
      const createAuditEndTime = performance.now();
      const createAuditDuration = createAuditEndTime - createAuditStartTime;
      
      console.log(`Created ${auditCount} audit records in ${createAuditDuration.toFixed(2)}ms`);
      
      // Test audit trail retrieval performance
      const fetchAuditStartTime = performance.now();
      
      const auditResponse = await testServer.request
        .get(`/api/orders/${orderId}/audit`)
        .expect(200);
      
      const fetchAuditEndTime = performance.now();
      const fetchAuditDuration = fetchAuditEndTime - fetchAuditStartTime;
      
      console.log(`Fetched audit trail in ${fetchAuditDuration.toFixed(2)}ms`);
      
      expect(auditResponse.body).toHaveLength(auditCount);
      expect(fetchAuditDuration).toBeLessThan(1000); // 1 second
    });

    test('should handle complex order queries with joins', async () => {
      // Create orders with full location relationships
      const orderCount = 50;
      const locationCount = 10;
      
      // Create locations first
      const locations = [];
      for (let i = 0; i < locationCount; i++) {
        const locationData = generateTestData('location');
        locationData.name = `Location-${i + 1}`;
        
        const locationResponse = await testServer.request
          .post('/api/locations')
          .send(locationData)
          .expect(201);
        
        locations.push(locationResponse.body);
      }
      
      // Create orders and assign to random locations
      for (let i = 0; i < orderCount; i++) {
        const orderData = generateTestData('order');
        orderData.orderNumber = `COMPLEX-${i + 1}`;
        
        const orderResponse = await testServer.request
          .post('/api/orders')
          .send(orderData)
          .expect(201);
        
        const orderId = orderResponse.body.id;
        
        // Assign to 2-4 random locations
        const assignedLocations = locations
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3) + 2);
        
        for (const location of assignedLocations) {
          await testServer.request
            .post('/api/order-locations')
            .send({
              orderId,
              locationId: location.id,
              status: ['not_started', 'in_progress', 'done'][Math.floor(Math.random() * 3)],
              completedQuantity: Math.floor(Math.random() * 100)
            })
            .expect(201);
        }
      }
      
      // Test complex query performance
      const queryStartTime = performance.now();
      
      const complexQueryResponse = await testServer.request
        .get('/api/orders?includeLocations=true&page=1&pageSize=25')
        .expect(200);
      
      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;
      
      console.log(`Complex join query completed in ${queryDuration.toFixed(2)}ms`);
      
      expect(complexQueryResponse.body.data).toHaveLength(25);
      expect(complexQueryResponse.body.data[0]).toHaveProperty('locations');
      expect(queryDuration).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Memory Usage', () => {
    test('should not have memory leaks during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform bulk operations
      const iterationCount = 5;
      const ordersPerIteration = 20;
      
      for (let iteration = 0; iteration < iterationCount; iteration++) {
        console.log(`Memory test iteration ${iteration + 1}/${iterationCount}`);
        
        const orders = [];
        
        // Create orders
        for (let i = 0; i < ordersPerIteration; i++) {
          const orderData = generateTestData('order');
          orderData.orderNumber = `MEM-${iteration}-${i}`;
          
          const response = await testServer.request
            .post('/api/orders')
            .send(orderData)
            .expect(201);
          
          orders.push(response.body);
        }
        
        // Read orders
        for (const order of orders) {
          await testServer.request
            .get(`/api/orders/${order.id}`)
            .expect(200);
        }
        
        // Update orders
        for (const order of orders) {
          await testServer.request
            .put(`/api/orders/${order.id}`)
            .send({ totalQuantity: order.totalQuantity + 10 })
            .expect(200);
        }
        
        // Delete orders
        for (const order of orders) {
          await testServer.request
            .delete(`/api/orders/${order.id}`)
            .expect(200);
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      
      console.log('Memory usage:');
      console.log(`Initial RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Difference: ${((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory increase should be reasonable (less than 50MB for this test)
      const memoryIncrease = finalMemory.rss - initialMemory.rss;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Response Time Consistency', () => {
    test('should have consistent response times under load', async () => {
      const requestCount = 50;
      const responseTimes: number[] = [];
      
      // Create test data
      const orderData = generateTestData('order');
      await testServer.request
        .post('/api/orders')
        .send(orderData)
        .expect(201);
      
      // Measure response times for repeated requests
      for (let i = 0; i < requestCount; i++) {
        const startTime = performance.now();
        
        await testServer.request
          .get('/api/orders?page=1&pageSize=10')
          .expect(200);
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }
      
      // Calculate statistics
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
      const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      
      console.log('Response time statistics:');
      console.log(`Average: ${averageTime.toFixed(2)}ms`);
      console.log(`Median: ${medianTime.toFixed(2)}ms`);
      console.log(`95th percentile: ${p95Time.toFixed(2)}ms`);
      console.log(`Min: ${minTime.toFixed(2)}ms`);
      console.log(`Max: ${maxTime.toFixed(2)}ms`);
      
      // Response times should be consistent
      expect(averageTime).toBeLessThan(200); // 200ms average
      expect(p95Time).toBeLessThan(500); // 500ms 95th percentile
      expect(maxTime).toBeLessThan(1000); // 1 second max
    });
  });
});
