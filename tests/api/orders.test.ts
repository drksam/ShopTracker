import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { runMigrations } from '../../server/db-migration';

describe('Orders API', () => {
  let app: express.Express;
  let adminCookie: string;

  beforeAll(async () => {
    // Initialize test database
    await runMigrations();
    
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    await registerRoutes(app);

    // Login as admin to get authentication cookie
    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    adminCookie = loginResponse.headers['set-cookie'][0];
  });

  describe('GET /api/orders', () => {
    it('should return paginated orders list', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('pageSize');
      expect(response.body.pagination).toHaveProperty('totalItems');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/orders')
        .expect(401);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/orders?page=1&pageSize=10')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(10);
    });

    it('should support includeShipped parameter', async () => {
      const response = await request(app)
        .get('/api/orders?includeShipped=true')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    const validOrderData = {
      orderNumber: 'TEST-001',
      tbfosNumber: 'TBFOS-001',
      client: 'Test Client',
      dueDate: new Date('2025-12-31'),
      totalQuantity: 100,
      description: 'Test order description',
      selectedLocationIds: []
    };

    it('should create a new order with valid data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send(validOrderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNumber', 'TEST-001');
      expect(response.body).toHaveProperty('client', 'Test Client');
      expect(response.body).toHaveProperty('totalQuantity', 100);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/orders')
        .send(validOrderData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send({})
        .expect(400);
    });

    it('should handle duplicate order numbers', async () => {
      // Create first order
      await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send(validOrderData);

      // Try to create duplicate
      await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send(validOrderData)
        .expect(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    let orderId: number;

    beforeEach(async () => {
      // Create a test order
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send({
          orderNumber: `TEST-${Date.now()}`,
          tbfosNumber: 'TBFOS-001',
          client: 'Test Client',
          dueDate: new Date('2025-12-31'),
          totalQuantity: 100,
          selectedLocationIds: []
        });
      
      orderId = createResponse.body.id;
    });

    it('should return order details', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('locations');
      expect(Array.isArray(response.body.locations)).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/api/orders/99999')
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(401);
    });
  });

  describe('PUT /api/orders/:id', () => {
    let orderId: number;

    beforeEach(async () => {
      // Create a test order
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send({
          orderNumber: `TEST-${Date.now()}`,
          tbfosNumber: 'TBFOS-001',
          client: 'Test Client',
          dueDate: new Date('2025-12-31'),
          totalQuantity: 100,
          selectedLocationIds: []
        });
      
      orderId = createResponse.body.id;
    });

    it('should update order details', async () => {
      const updateData = {
        client: 'Updated Client',
        totalQuantity: 150,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Cookie', adminCookie)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('client', 'Updated Client');
      expect(response.body).toHaveProperty('totalQuantity', 150);
      expect(response.body).toHaveProperty('description', 'Updated description');
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .put('/api/orders/99999')
        .set('Cookie', adminCookie)
        .send({ client: 'Updated Client' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/orders/${orderId}`)
        .send({ client: 'Updated Client' })
        .expect(401);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    let orderId: number;

    beforeEach(async () => {
      // Create a test order
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Cookie', adminCookie)
        .send({
          orderNumber: `TEST-${Date.now()}`,
          tbfosNumber: 'TBFOS-001',
          client: 'Test Client',
          dueDate: new Date('2025-12-31'),
          totalQuantity: 100,
          selectedLocationIds: []
        });
      
      orderId = createResponse.body.id;
    });

    it('should delete order (admin only)', async () => {
      await request(app)
        .delete(`/api/orders/${orderId}`)
        .set('Cookie', adminCookie)
        .expect(204);

      // Verify order is deleted
      await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .delete('/api/orders/99999')
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/orders/${orderId}`)
        .expect(401);
    });
  });
});
