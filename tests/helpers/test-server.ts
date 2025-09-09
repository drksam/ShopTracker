import express from 'express';
import supertest from 'supertest';
import { registerRoutes } from '../../server/routes';
import { runMigrations } from '../../server/db-migration';

export class TestServer {
  private app: express.Express;
  private server: any;
  public request: ReturnType<typeof supertest>;

  constructor() {
    this.app = express();
    this.request = supertest(this.app);
  }

  async start(port: number = 0): Promise<number> {
    // Initialize test database
    await runMigrations();
    
    // Set up Express app with routes
    this.app.use(express.json());
    await registerRoutes(this.app);
    
    // Update supertest instance with configured app
    this.request = supertest(this.app);

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        const actualPort = this.server.address().port;
        resolve(actualPort);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async resetDatabase(): Promise<void> {
    await runMigrations();
  }

  getApp(): express.Express {
    return this.app;
  }
}

export async function createTestUser(app: express.Express, userData: any) {
  // Implementation would depend on your user creation API
  return {
    id: 1,
    username: 'testuser',
    role: 'user',
    ...userData
  };
}

export async function createTestOrder(app: express.Express, orderData: any) {
  const defaultOrderData = {
    orderNumber: `TEST-${Date.now()}`,
    tbfosNumber: `TBFOS-${Date.now()}`,
    client: 'Test Client',
    dueDate: new Date('2025-12-31'),
    totalQuantity: 100,
    selectedLocationIds: []
  };

  return {
    id: 1,
    ...defaultOrderData,
    ...orderData
  };
}

export async function createTestLocation(app: express.Express, locationData: any) {
  const defaultLocationData = {
    name: `Test Location ${Date.now()}`,
    usedOrder: 1,
    isPrimary: false,
    skipAutoQueue: false,
    countMultiplier: 1,
    noCount: false
  };

  return {
    id: 1,
    ...defaultLocationData,
    ...locationData
  };
}

export function generateTestData(type: string, count: number = 1): any {
  const data: any[] = [];
  
  for (let i = 0; i < count; i++) {
    switch (type) {
      case 'order':
        data.push({
          orderNumber: `TEST-ORDER-${i + 1}`,
          tbfosNumber: `TBFOS-${i + 1}`,
          client: `Test Client ${i + 1}`,
          dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          totalQuantity: (i + 1) * 10,
          description: `Test order ${i + 1} description`
        });
        break;
      
      case 'location':
        data.push({
          name: `Location ${i + 1}`,
          usedOrder: i + 1,
          isPrimary: i === 0,
          skipAutoQueue: false,
          countMultiplier: 1,
          noCount: false
        });
        break;
      
      case 'user':
        data.push({
          username: `testuser${i + 1}`,
          password: 'password123',
          fullName: `Test User ${i + 1}`,
          role: i === 0 ? 'admin' : 'user',
          email: `testuser${i + 1}@example.com`
        });
        break;
        
      default:
        throw new Error(`Unknown test data type: ${type}`);
    }
  }
  
  return count === 1 ? data[0] : data;
}
