# ShopTracker User Guide
## Version 1.0.1 | Part of ShopSuite v1.0.1

## Quick Start Guide

Welcome to ShopTracker, your comprehensive solution for manufacturing management and machine monitoring. This guide will help you get started with the system.

### Logging In

1. Access the application at your provided URL
2. Login with your username and password
   - Default admin account: Username: `admin` / Password: `Pigfloors`
3. First-time users should change their password after logging in

### Dashboard Overview

The dashboard provides a quick view of:
- Active orders and their status
- Production locations and their current workload
- Recent alerts and help requests
- Overall system status

### Navigation

Use the sidebar to navigate between different sections:
- **Dashboard**: Overview of production status
- **Orders**: Manage manufacturing orders
- **Locations**: View production locations and their status
- **Machines**: Configure and monitor equipment
- **Users**: Manage user accounts and permissions
- **Settings**: System configuration
- **Alert Center**: View and respond to system alerts
- **API Configuration**: Integration settings (Admin only)

## Working with Orders

### Creating a New Order

1. Navigate to **Orders** and click "New Order"
2. Fill in required information:
   - Order Number
   - TBFOS Number
   - Client Name
   - Due Date
   - Total Quantity
   - Description (optional)
   - Notes (optional)
3. Click "Create Order" to save

### Viewing Order Details

1. From the Orders list, click on an order number
2. The Order Details page shows:
   - Order information
   - Current status
   - Production history
   - Location queue position

### Order Workflow

Orders follow a defined workflow through production:
1. **Created**: Initial state upon creation
2. **In Progress**: When work has started at a location
3. **Completed**: When all work is finished
4. **Shipped**: When the order has been shipped

## Production Locations

### Location Display

Each production location has a dedicated display designed for tablets:
1. Navigate to **Locations** and select a specific location
2. The Location Display shows:
   - Current orders in the queue
   - Order being worked on
   - Completion status

### Starting Work on an Order

1. From the Location Display, find the order in the queue
2. Click "Start Now" to begin work
3. The order status will update to "In Progress"

### Completing Work

1. When work is finished, enter the completed quantity
2. Click "Complete" to mark the work as done
3. The order will automatically move to the next location in the workflow

### Pausing Work

1. If work needs to be paused, click "Pause"
2. The order will remain in the queue but will not be active
3. Resume work by clicking "Resume" later

## Machine Management

### Viewing Machines

1. Navigate to **Machines** to see all equipment
2. Click on a specific machine to view details

### Machine Access

Machines may require authentication via RFID:
1. Present RFID card to the machine reader
2. System verifies access permissions
3. Access granted or denied based on user role

## Alert System

### Viewing Alerts

1. Navigate to **Alert Center**
2. View all active alerts from machines and the system

### Responding to Alerts

1. For each alert, you can:
   - Acknowledge: Mark as seen
   - Resolve: Mark as fixed
   - Comment: Add additional information

### Creating Help Requests

1. From any location display, click "Request Help"
2. Enter the reason for the request
3. Submit to notify administrators

## User Management

### Managing Users

1. Navigate to **Users** (Admin only)
2. Create, edit, or deactivate user accounts
3. Assign roles: Admin, Operator, or Maintenance

### RFID Card Management

1. In the **Users** section, select "RFID Cards"
2. Associate cards with users
3. Set access levels for each user/machine combination

## API Integration

### Integration with ShopMonitor

The system integrates with ShopMonitor for:
- Machine access control
- Machine status monitoring
- Alert management

This integration is configured by administrators through the **API Configuration** page.

## Settings and Preferences

### User Preferences

1. Click on your user icon in the top right
2. Select "Settings"
3. Customize:
   - Notification preferences
   - Sound alerts
   - Visual notifications

### System Settings

Administrators can configure:
- Email notifications for shipping and help requests
- PDF generation settings
- Synchronization intervals

## Troubleshooting

### Common Issues

- **Cannot log in**: Verify username and password
- **Order not progressing**: Check for completed work at current location
- **Machine access denied**: Verify user permissions and RFID card assignment
- **Missing alerts**: Check API configuration and connection status

### Getting Help

For additional assistance:
1. Click on the "Support" link
2. Submit a detailed description of the issue
3. Include any error messages or relevant information

## Best Practices

- Regularly check the Dashboard for system status
- Respond to alerts promptly to prevent production delays
- Update order status accurately to maintain workflow
- Use help requests when assistance is needed on the production floor
- Review audit trails for tracking production history and issues