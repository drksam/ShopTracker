import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for external APIs that might be used
const handlers = [
  // Mock authentication service
  http.post('/api/auth/login', ({ request }) => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        username: 'testuser',
        role: 'admin'
      }
    });
  }),

  // Mock sync service endpoints
  http.get('/api/sync/status', () => {
    return HttpResponse.json({
      isOnline: true,
      lastSync: new Date().toISOString(),
      pendingChanges: 0
    });
  }),

  http.post('/api/sync/push', () => {
    return HttpResponse.json({
      success: true,
      synced: 5,
      errors: []
    });
  }),

  http.post('/api/sync/pull', () => {
    return HttpResponse.json({
      success: true,
      updates: [],
      timestamp: new Date().toISOString()
    });
  }),

  // Mock machine status endpoints
  http.get('/api/machines/:id/status', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: parseInt(id as string),
      status: 'running',
      lastHeartbeat: new Date().toISOString(),
      currentOrder: null,
      alerts: []
    });
  }),

  http.post('/api/machines/:id/alert', ({ params, request }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Date.now(),
      machineId: parseInt(id as string),
      type: 'warning',
      message: 'Mock alert created',
      timestamp: new Date().toISOString(),
      acknowledged: false
    });
  }),

  // Mock external notification service
  http.post('/api/notifications/send', ({ request }) => {
    return HttpResponse.json({
      id: 'notification-' + Date.now(),
      status: 'sent',
      timestamp: new Date().toISOString()
    });
  }),

  // Mock external reporting service
  http.get('/api/reports/orders', ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    return HttpResponse.json({
      totalOrders: 25,
      completedOrders: 20,
      pendingOrders: 5,
      period: { startDate, endDate },
      data: []
    });
  }),

  // Mock external inventory service
  http.get('/api/inventory/materials', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Steel Rod',
        quantity: 150,
        unit: 'pieces',
        threshold: 50
      },
      {
        id: 2,
        name: 'Aluminum Sheet',
        quantity: 25,
        unit: 'sheets',
        threshold: 10
      }
    ]);
  }),

  http.put('/api/inventory/materials/:id', ({ params, request }) => {
    const { id } = params;
    return HttpResponse.json({
      id: parseInt(id as string),
      name: 'Updated Material',
      quantity: 200,
      unit: 'pieces',
      threshold: 50,
      lastUpdated: new Date().toISOString()
    });
  }),

  // Mock error scenarios for testing error handling
  http.get('/api/error/500', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get('/api/error/404', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('/api/error/timeout', () => {
    // Simulate timeout by delaying response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(HttpResponse.json({ message: 'Delayed response' }));
      }, 5000);
    });
  }),

  // Mock rate limiting
  http.get('/api/rate-limited', () => {
    return new HttpResponse(null, {
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    });
  }),

  // Catch-all handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  })
];

// Create MSW server instance
export const mockServer = setupServer(...handlers);

// Helper functions for test setup
export const startMockServer = () => {
  mockServer.listen({
    onUnhandledRequest: 'warn'
  });
};

export const stopMockServer = () => {
  mockServer.close();
};

export const resetMockServer = () => {
  mockServer.resetHandlers();
};

// Dynamic handler addition for specific tests
export const addMockHandler = (handler: any) => {
  mockServer.use(handler);
};

// Common mock scenarios
export const mockScenarios = {
  // Simulate network failure
  networkError: () => {
    mockServer.use(
      http.all('*', () => {
        return HttpResponse.error();
      })
    );
  },

  // Simulate slow network
  slowNetwork: (delay: number = 2000) => {
    mockServer.use(
      http.all('*', async ({ request }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return HttpResponse.json({ message: 'Slow response' });
      })
    );
  },

  // Simulate authentication failure
  authFailure: () => {
    mockServer.use(
      http.post('/api/auth/login', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );
  },

  // Simulate database connection error
  dbError: () => {
    mockServer.use(
      http.all('/api/*', () => {
        return HttpResponse.json(
          { error: 'Database connection failed' },
          { status: 503 }
        );
      })
    );
  }
};

export default mockServer;
