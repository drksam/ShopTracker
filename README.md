# ShopTracker v1.0.1
## Part of ShopSuite v1.0.1

A comprehensive industrial machine monitoring and management system designed to provide real-time tracking, advanced configuration, and seamless integration between workshop management and machine monitoring platforms.

## Overview

ShopTracker is a manufacturing production tracking system built to optimize workflow management in industrial settings. It provides real-time status updates of orders, machines, and production locations while integrating with ShopMonitor for comprehensive machine monitoring and access control.

## Technologies Used

- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn/UI, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **Data Validation**: Zod schema validation

## Core Features

### Order Management

- **Order Dashboard**: Visual tracking of order progress through production stages
- **Order Details**: Complete order information with production history
- **Order Queue**: Prioritized queue management for each production location
- **Shipping Management**: Track shipping status and manage completed orders

### Location Management

- **Production Locations**: Track work centers and their current status
- **Location Display**: Tablet-friendly interfaces for each production location
- **Queue Management**: Visualize and manage work queues at each location
- **Real-time Updates**: See order progress as items move through production

### Machine Management

- **Machine Configuration**: Define machines and their capabilities
- **Machine Status**: Monitor machine activity in real-time
- **Access Control**: Manage user permissions for machine operations
- **Machine Alerts**: Receive and respond to maintenance needs

### User Management

- **Role-based Access**: Admin, operator, and maintenance roles
- **RFID Integration**: Support for RFID card access to machines
- **Permission Management**: Detailed control over user capabilities
- **Notification Preferences**: Customizable alerts and notifications

### Integration with ShopMonitor

- **Bidirectional Alerts**: Send and receive maintenance alerts between systems
- **Access Control**: Authenticate RFID cards for machine access
- **Data Synchronization**: Automatically sync users, locations, and machines
- **Real-time Status**: Get live machine status updates from monitoring hardware

### Reporting and Analytics

- **Audit Trail**: Complete history of all system activities
- **Help Requests**: Track and respond to help requests from production floor
- **Access Logs**: Monitor all machine access attempts
- **Production Analytics**: Track completion rates and production efficiency

## System Architecture

### Frontend Components

- **Dashboard**: Main view showing order status and production overview
- **Order Pages**: Detailed views of order information and history
- **Location Pages**: Production location specific interfaces
- **Machine Pages**: Machine configuration and status interfaces
- **Alert Center**: Central hub for system-wide alerts and notifications
- **API Configuration**: Settings for integration with ShopMonitor

### Backend Services

- **API Routes**: RESTful endpoints for all CRUD operations
- **Authentication**: User management and security
- **Storage Layer**: Database abstraction for data persistence
- **Sync Manager**: Handles integration with ShopMonitor
- **Workflow Engine**: Manages order progress through production stages

### Database Schema

- **Users**: Authentication and permission management
- **Orders**: Order details and status tracking
- **Locations**: Production workstations and their configuration
- **Machines**: Equipment details and access settings
- **Order Locations**: Tracking order progress at specific locations
- **Access Logs**: Record of machine access attempts
- **Machine Alerts**: Maintenance and status alerts
- **Help Requests**: Assistance requests from production floor

## API Integration

ShopTracker integrates with ShopMonitor through a comprehensive API:

### Inbound Endpoints (ShopMonitor Provides)

- **Authentication**: `/integration/api/auth` - Verify RFID card access
- **Node Status**: `/integration/api/node_status` - Get machine monitoring data
- **Alerts**: `/integration/api/alerts` - Receive maintenance alerts
- **Alert Management**: `/integration/api/alerts/:id/acknowledge` and `/integration/api/alerts/:id/resolve`

### Outbound Endpoints (ShopTracker Calls)

- **User Sync**: Push user data to ShopMonitor
- **Location Sync**: Push location configuration
- **Machine Sync**: Push machine definitions
- **Access Logs**: Retrieve machine access information
- **Alert Retrieval**: Get pending alerts from ShopMonitor

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- NPM (v9 or higher)
- SQLite database

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Access the application at http://localhost:5000

### Default Credentials

- Username: `admin`
- Password: `Pigfloors`

## Configuration

### API Integration

To configure integration with ShopMonitor:

1. Navigate to API Configuration
2. Enter the API URL and key for ShopMonitor
3. Configure sync settings (intervals and data types)
4. Test the connection

### Database Migration

Database migrations are handled automatically through Drizzle ORM:

```
npm run db:push
```

## Deployment

The application can be deployed using the following methods:

1. **Replit Deployment**: Click the deploy button in the Replit interface
2. **Docker**: Use the provided Dockerfile for containerized deployment
3. **Traditional Hosting**: Deploy to any Node.js hosting platform

## License

Proprietary software for   USA - All rights reserved.

## Support

For support and further information, contact   USA Technical Support.