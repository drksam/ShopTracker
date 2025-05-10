# ShopTracker Technical Documentation
## Version 1.0.1 | Part of ShopSuite v1.0.1

This document provides detailed technical information for developers working with the ShopTracker system.

## Architecture Overview

ShopTracker is built using a modern React frontend with an Express.js backend and SQLite database. The architecture follows a RESTful API design with clear separation of concerns:

```
├── client/         # Frontend React application
│   ├── src/        # Source code
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   └── pages/       # Page components
│
├── server/         # Backend Express application
│   ├── auth.ts     # Authentication logic
│   ├── db.ts       # Database connection
│   ├── routes.ts   # API routes
│   ├── storage.ts  # Data access layer
│   └── sync.ts     # Integration with ShopMonitor
│
└── shared/         # Shared code between client and server
    └── schema.ts   # Database schema and types
```

## Database Schema

ShopTracker uses Drizzle ORM with SQLite for data persistence. The schema is defined in `shared/schema.ts` and includes the following primary entities:

### Core Entities

- **Users**: Authentication and permission management
- **Orders**: Manufacturing orders with status tracking
- **Locations**: Production workstations
- **Machines**: Equipment definitions and settings
- **OrderLocations**: Junction table tracking order progress at specific locations

### Supporting Entities

- **MachinePermissions**: User permissions for specific machines
- **AuditTrail**: Record of system activities
- **HelpRequests**: Assistance requests from the production floor
- **EmailSettings**: Notification configuration
- **PdfSettings**: Document generation settings

### Integration Entities

- **RfidCards**: RFID card management for machine access
- **AccessLevels**: User access levels for machines
- **AccessLogs**: Record of machine access attempts
- **MachineAlerts**: Alerts from machines requiring attention
- **ApiConfig**: Integration settings for ShopMonitor

## Authentication System

Authentication is implemented using Passport.js with session-based authentication:

- Sessions are stored in the database using connect-pg-simple
- Passwords are hashed using scrypt with salt
- Three primary roles: admin, operator, maintenance
- RFID card support for machine access

## Frontend Architecture

The frontend is built with React and follows these design principles:

- **Component Design**: Reusable UI components using Shadcn/UI and Tailwind CSS
- **State Management**: TanStack Query for server state, React state for UI state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **API Communication**: Fetch API with custom wrapper functions

Key components include:

- **AppShell**: Main layout container with sidebar navigation
- **ProtectedRoute**: Route protection based on authentication status
- **Form components**: Standardized form UI with validation
- **Data display components**: Tables, cards, and visualization elements

## API Integration

### ShopMonitor Integration

The integration with ShopMonitor is handled by the Sync Manager (`server/sync.ts`), which manages:

- **Data Synchronization**: Push user, location, and machine data
- **Data Retrieval**: Pull access logs and alerts
- **Real-time Communication**: Handle authentication and alerts

### API Configuration

Integration settings are managed through the API Configuration page, which allows:

- Setting API endpoints and authentication keys
- Configuring sync intervals and options
- Testing API connections
- Viewing sync status and logs

## Key Workflows

### Order Processing

1. Order creation with initial details
2. Assignment to initial production location
3. Progression through manufacturing stages
4. Completion and shipping

### Machine Access Control

1. User presents RFID card to machine
2. System authenticates via ShopMonitor API
3. Access granted based on permissions
4. Access logged for audit trail

### Alert Management

1. Alert received from ShopMonitor
2. Alert displayed in Alert Center
3. User acknowledges or resolves alert
4. Status update sent to ShopMonitor

## Extending the System

### Adding New Features

1. Extend the database schema in `shared/schema.ts`
2. Update the Storage interface in `server/storage.ts`
3. Add API routes in `server/routes.ts`
4. Create frontend components and pages

### Adding New Integrations

1. Create a new integration manager in `server/`
2. Add configuration settings to API Configuration
3. Implement data synchronization logic
4. Add UI components for configuration and status

## Performance Considerations

- **Query Optimization**: Use appropriate indexes for frequently queried data
- **Caching**: Utilize TanStack Query's caching capabilities
- **Pagination**: Implement pagination for large datasets
- **Sync Scheduling**: Configure synchronization intervals appropriately

## Security Considerations

- **Authentication**: Secure session management and password storage
- **Authorization**: Role-based access control for all operations
- **API Security**: API key authentication for external services
- **Input Validation**: Zod schema validation for all user inputs
- **Data Protection**: Sensitive data handling (API keys, user information)

## Troubleshooting

### Common Issues

- **Sync Failures**: Check API connectivity and credentials
- **Database Errors**: Verify schema compatibility
- **UI Errors**: Check browser console for JavaScript errors
- **Authentication Issues**: Verify session configuration

### Logs

- Server logs are available in the Express application
- Sync logs are maintained by the Sync Manager
- Frontend error logs in the browser console
- Alert history in the Alert Center

## Development Environment

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

### Testing

- Unit tests: `npm test`
- Integration tests: `npm run test:integration`
- End-to-end tests: `npm run test:e2e`

### Deployment

- Build production assets: `npm run build`
- Start production server: `npm start`

## Future Enhancements

Potential areas for future development:

- **Mobile Application**: Native mobile support for operators
- **Advanced Analytics**: Enhanced reporting and analytics
- **Machine Learning**: Predictive maintenance and optimization
- **Expanded Integration**: Additional third-party system integrations