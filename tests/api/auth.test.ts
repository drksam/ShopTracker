import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { runMigrations } from '../../server/db-migration';

describe('Authentication API', () => {
  let app: express.Express;
  let adminCookie: string;

  beforeAll(async () => {
    // Initialize test database
    await runMigrations();
    
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  describe('POST /api/login', () => {
    it('should login successfully with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'admin',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', 'admin');
      expect(response.body).toHaveProperty('role', 'admin');
      
      // Store cookie for subsequent tests
      adminCookie = response.headers['set-cookie'][0];
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should reject missing credentials', async () => {
      await request(app)
        .post('/api/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/user', () => {
    it('should return current user when authenticated', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body).toHaveProperty('username', 'admin');
      expect(response.body).toHaveProperty('role', 'admin');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/user')
        .expect(401);
    });
  });

  describe('POST /api/logout', () => {
    it('should logout successfully', async () => {
      await request(app)
        .post('/api/logout')
        .set('Cookie', adminCookie)
        .expect(200);
    });
  });
});
