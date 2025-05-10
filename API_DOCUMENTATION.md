## Overview

RESTful API for bidirectional data exchange with other apps, enabling:

1. User data synchronization
2. Machine access verification
3. Status reporting
4. Alert management
5. Machine usage analytics
6. Emergency stop management
7. Firmware management

## Authentication

All API requests require authentication using an API key. The API key should be included in the request header:

```
Authorization: Bearer YOUR_API_KEY_HERE
```

Alternatively, some endpoints also support the X-API-Key header:

```
X-API-Key: YOUR_API_KEY_HERE
```

API keys can be generated and managed in the Integration Configuration section of the shop admin panel.

## Base URL

The base URL for all API endpoints is:

```
https://your-server-address/integration/api/
```

For node firmware endpoints, use:

```
http://<node-ip-address>/api/
```

## API Endpoints

### Authentication & Access Control

#### Verify Machine Access

```
POST /auth
```

Verifies if a user has permission to access a specific machine.

**Request Body:**
```json
{
  "card_id": "0123456789",
  "machine_id": "W1"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "0123456789",
    "fullName": "John Doe",
    "role": "operator"
  },
  "access_level": "operator",
  "machine_id": "W1",
  "timestamp": "2025-04-18T12:30:45Z"
}
```

#### Check User

```
GET /api/check_user
```

Arduino endpoint to verify if a user has access to a machine.

**Query Parameters:**
- `rfid`: The RFID tag code
- `machine_id`: The machine identifier

**Response:**
- `ALLOW`: User has access
- `DENY`: User does not have access
- `ERROR`: Some error occurred

#### Logout User

```
GET /api/logout
```

Logs a user out of a machine.

**Query Parameters:**
- `rfid`: The RFID tag code
- `machine_id`: The machine identifier

**Response:**
- `LOGOUT`: User successfully logged out
- `ERROR`: Some error occurred

#### Get Offline Access Cards

```
GET /api/offline_cards
```

Returns a list of cards that have offline access.

**Response:**
```json
{
  "offline_cards": [
    {
      "index": 0,
      "rfid": "0123456789",
      "hash": 42,
      "auth_byte": 15,
      "admin_override": true
    }
  ]
}
```

### Status Reporting

#### Get Node Status

```
GET /node_status
```

Returns the status of all nodes and their connected machines.

**Response:**
```json
{
  "timestamp": "2025-04-18T12:30:45Z",
  "nodes": [
    {
      "id": 1,
      "node_id": "esp32_001",
      "name": "Shop Floor Node 1",
      "ip_address": "192.168.1.100",
      "node_type": "machine_monitor",
      "status": "online",
      "last_seen": "2025-04-18T12:25:45Z",
      "machines": [
        {
          "id": 1,
          "machine_id": "W1",
          "name": "Welding Machine 1",
          "status": "active",
          "zone": "Shop Floor",
          "current_user": {
            "id": 1,
            "name": "John Doe",
            "rfid_tag": "0123456789"
          },
          "today_access_count": 5,
          "activity_count": 42,
          "last_activity": "2025-04-18T12:30:45Z"
        }
      ]
    }
  ]
}
```

#### Send Heartbeat

```
GET /api/heartbeat
```

Sends a heartbeat to indicate a node or machine is online.

**Query Parameters:**
- `machine_id`: The machine identifier (optional)
- `activity`: Activity counter value (optional)

**Response:**
- `OK`: Heartbeat received successfully

#### Update Count

```
GET /api/update_count
```

Updates the activity count for a machine.

**Query Parameters:**
- `machine_id`: The machine identifier
- `count`: The new count value

**Response:**
- `OK`: Count updated successfully
- `ERROR`: Some error occurred

### Alert Management

#### Send Alert

```
POST /alerts
```

Sends an alert from another app to shop.

**Request Body:**
```json
{
  "id": 1,
  "machineId": "W1",
  "senderId": 1,
  "message": "Machine requires maintenance",
  "alertType": "warning",
  "status": "pending",
  "origin": "machine",
  "createdAt": "2025-04-18T12:30:45Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert received and stored",
  "local_alert_id": 1,
  "external_alert_id": 1,
  "timestamp": "2025-04-18T12:31:45Z",
  "machine_name": "Welding Machine 1"
}
```

#### Acknowledge Alert

```
POST /alerts/:id/acknowledge
```

Acknowledges an alert in the shop.

**Response:**
```json
{
  "success": true,
  "message": "Alert 1 acknowledged",
  "alert": {
    "id": 1,
    "external_id": 1,
    "machine_id": "W1",
    "machine_name": "Welding Machine 1",
    "message": "Machine requires maintenance",
    "alert_type": "warning",
    "status": "acknowledged",
    "origin": "shop_tracker",
    "created_at": "2025-04-18T12:30:45Z",
    "acknowledged_at": "2025-04-18T12:45:22Z",
    "resolved_at": null
  },
  "timestamp": "2025-04-18T12:45:22Z"
}
```

#### Resolve Alert

```
POST /alerts/:id/resolve
```

Resolves an alert in the shop.

**Response:**
```json
{
  "success": true,
  "message": "Alert 1 resolved",
  "alert": {
    "id": 1,
    "external_id": 1,
    "machine_id": "W1",
    "machine_name": "Welding Machine 1",
    "message": "Machine requires maintenance",
    "alert_type": "warning",
    "status": "resolved",
    "origin": "tracker",
    "created_at": "2025-04-18T12:30:45Z",
    "acknowledged_at": "2025-04-18T12:45:22Z",
    "resolved_at": "2025-04-18T13:15:07Z"
  },
  "timestamp": "2025-04-18T13:15:07Z"
}
```

### User Management

#### Get Available Users

```
GET /users/available
```

Returns a list of users available in Tracker that can be imported.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "username": "jdoe",
      "email": "john.doe@example.com",
      "card_id": "0123456789",
      "access_level": "operator",
      "status": "active"
    }
  ]
}
```

#### Sync User

```
POST /users/sync
```

Synchronizes a user between systems.

**Request Body:**
```json
{
  "external_id": 1,
  "direction": "import",
  "overwrite_permissions": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User synchronized successfully",
  "user": {
    "id": 5,
    "external_id": 1,
    "name": "John Doe",
    "rfid_tag": "0123456789",
    "email": "john.doe@example.com",
    "active": true,
    "last_synced": "2025-04-18T14:22:15Z"
  }
}
```

#### Get User Permissions

```
GET /users/:id/permissions
```

Returns the permissions for a specific user.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 5,
    "external_id": 1,
    "name": "John Doe"
  },
  "permissions": {
    "local": [1, 2, 3],
    "external": [1, 2, 4, 5],
    "combined": [1, 2, 3, 4, 5]
  },
  "machines": [
    {
      "id": 1,
      "machine_id": "W1",
      "name": "Welding Machine 1",
      "zone": "Shop Floor",
      "status": "active",
      "in_local": true,
      "in_external": true
    },
    {
      "id": 4,
      "machine_id": "C2",
      "name": "Cutting Machine 2",
      "zone": "Shop Floor",
      "status": "idle",
      "in_local": false,
      "in_external": true
    }
  ]
}
```

#### Update User Permissions

```
POST /users/:id/permissions
```

Updates the permissions for a specific user.

**Request Body:**
```json
{
  "machine_ids": [1, 2, 3, 4],
  "sync_to_external": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permissions updated successfully",
  "user": {
    "id": 5,
    "name": "John Doe"
  },
  "updated_machines": 4,
  "synced_to_external": true
}
```

#### Check Office RFID Reader

```
GET /api/check_office_reader
```

Checks if the office RFID reader has detected a new tag.

**Response:**
```json
{
  "success": true,
  "detected": true,
  "rfid": "0123456789",
  "timestamp": "2025-04-18T12:30:45Z"
}
```

### Machine Usage

#### Get Machine Usage

```
GET /machines/usage
```

Returns usage statistics for machines.

**Query Parameters:**
- `start_date`: ISO format date (required)
- `end_date`: ISO format date (required)
- `machine_id`: Filter by specific machine ID (optional)
- `zone_id`: Filter by specific zone ID (optional)

**Response:**
```json
{
  "success": true,
  "start_date": "2025-04-01T00:00:00Z",
  "end_date": "2025-04-18T23:59:59Z",
  "total_usage_hours": 245.5,
  "machines": [
    {
      "id": 1,
      "machine_id": "W1",
      "name": "Welding Machine 1",
      "zone": "Shop Floor",
      "usage_hours": 78.2,
      "login_count": 42,
      "users": [
        {
          "id": 5,
          "name": "John Doe",
          "usage_hours": 45.5,
          "login_count": 25
        }
      ]
    }
  ]
}
```

### Emergency Stop Management

#### Trigger E-STOP

```
POST /api/estop/trigger
```

Triggers an emergency stop for a specific area, zone, or node.

**Request Body:**
```json
{
  "area_id": 1,
  "triggered_by": "node_esp32_001",
  "reason": "Button pressed"
}
```

**Response:**
```json
{
  "success": true,
  "estop_id": 42,
  "timestamp": "2025-04-18T12:30:45Z",
  "affected_machines": [1, 2, 3],
  "message": "E-STOP triggered successfully"
}
```

#### Reset E-STOP

```
POST /api/estop/:id/reset
```

Resets an emergency stop.

**Request Body:**
```json
{
  "reset_by": "admin_user_5",
  "notes": "Issue resolved"
}
```

**Response:**
```json
{
  "success": true,
  "estop_id": 42,
  "reset_time": "2025-04-18T12:45:22Z",
  "triggered_time": "2025-04-18T12:30:45Z",
  "duration_seconds": 876,
  "message": "E-STOP reset successfully"
}
```

#### Get E-STOP Status

```
GET /api/estop/status
```

Gets the current emergency stop status.

**Query Parameters:**
- `area_id`: Filter by area ID (optional)
- `zone_id`: Filter by zone ID (optional)
- `node_id`: Filter by node ID (optional)

**Response:**
```json
{
  "active_estops": [
    {
      "id": 42,
      "area": "Manufacturing Floor",
      "zone": "Welding Zone",
      "triggered_time": "2025-04-18T12:30:45Z",
      "triggered_by": "node_esp32_001",
      "affected_machines": [
        {
          "id": 1,
          "name": "Welding Machine 1",
          "status": "emergency_stop"
        }
      ]
    }
  ],
  "has_active_estop": true
}
```

### Synchronization

#### Trigger Manual Sync

```
POST /sync
```

Manually triggers data synchronization between systems.

**Response:**
```json
{
  "success": true,
  "message": "Data synchronization completed successfully.",
  "last_sync": "2025-04-18T12:30:45Z"
}
```

#### Get Integration Status

```
GET /status
```

Gets integration status and configuration.

**Response:**
```json
{
  "success": true,
  "status": "configured",
  "api_url": "https://tracker.example.com/api",
  "last_sync": "2025-04-18T12:30:45Z",
  "sync_interval": 900,
  "features_enabled": {
    "user_sync": true,
    "location_sync": true,
    "alert_sync": true
  }
}
```

### Firmware Endpoints

The following endpoints are available on the node firmware itself.

#### Get Node Configuration

```
GET /api/config
```

Returns the current configuration of the node.

**Response:**
```json
{
  "nodeName": "Shop Floor Node 1",
  "nodeType": "machine_monitor",
  "serverUrl": "https://shop.example.com",
  "wifiSSID": "CompanyNetwork",
  "machine0": "W1",
  "machine1": "W2",
  "machine2": "",
  "machine3": ""
}
```

#### Update Node Configuration

```
POST /api/config
```

Updates the configuration of the node.

**Request Body:**
```json
{
  "nodeName": "Shop Floor Node 1",
  "nodeType": "machine_monitor",
  "serverUrl": "https://shop.example.com",
  "wifiSSID": "CompanyNetwork",
  "wifiPassword": "secure-password",
  "machine0": "W1",
  "machine1": "W2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "requiresReboot": true
}
```

#### Get Node Status

```
GET /api/status
```

Returns the current status of the node.

**Response:**
```json
{
  "status": "online",
  "uptime": 86400,
  "freeMemory": 45280,
  "wifiStrength": -65,
  "serverConnected": true,
  "firmwareVersion": "1.2.0",
  "lastError": ""
}
```

#### Scan WiFi Networks

```
GET /api/scan_wifi
```

Scans for available WiFi networks.

**Response:**
```json
{
  "networks": [
    {
      "ssid": "CompanyNetwork",
      "rssi": -60,
      "encrypted": true
    },
    {
      "ssid": "GuestWiFi",
      "rssi": -72,
      "encrypted": false
    }
  ]
}
```

#### Reboot Node

```
GET /api/reboot
```

Reboots the device.

**Response:**
```
Device restarting...
```

#### Factory Reset

```
GET /api/reset
```

Factory resets the device.

**Response:**
```
Performing factory reset...
```

#### Control Relay (Accessory IO Mode)

```
GET /api/relay
```

Controls relay outputs in Accessory IO mode.

**Query Parameters:**
- `relay`: Relay number (0-3)
- `state`: Desired state (0=off, 1=on)

**Response:**
```json
{
  "relay": 0,
  "state": 1,
  "success": true
}
```

## Webhooks

The shop can send webhook notifications to Tracker for real-time events.

### Webhook Events

- `machine.login`: User logged in to a machine
- `machine.logout`: User logged out of a machine
- `machine.status_change`: Machine status changed
- `alert.created`: New alert created
- `node.status_change`: Node status changed
- `estop.triggered`: Emergency stop triggered
- `estop.reset`: Emergency stop reset

### Webhook Format

```json
{
  "event": "machine.login",
  "timestamp": "2025-04-18T12:30:45Z",
  "data": {
    "machine_id": 1,
    "machine_code": "W1",
    "machine_name": "Welding Machine 1",
    "user_id": 5,
    "user_name": "John Doe",
    "rfid_tag": "0123456789"
  }
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a JSON object with details:

```json
{
  "success": false,
  "error": "Invalid machine ID",
  "code": "INVALID_PARAMETER",
  "timestamp": "2025-04-18T12:30:45Z"
}
```

## Rate Limiting

API requests are limited to 100 requests per minute per API key. If exceeded, a `429 Too Many Requests` response will be returned.

## Data Synchronization Best Practices

1. **Scheduled Sync**: Run a full sync at regular intervals (e.g., daily)
2. **Event-Driven Updates**: Use webhooks for real-time updates
3. **Conflict Resolution**: External system (Tracker) is considered the source of truth for user data
4. **Permission Merging**: Local permissions take precedence over external ones when conflicts occur

## Appendix

### Alert Types

- `info`: Informational message
- `warning`: Warning that needs attention
- `error`: Error that requires action
- `maintenance`: Scheduled maintenance notification
- `estop`: Emergency stop alert

### Machine Statuses

- `idle`: Machine is available but not in use
- `active`: Machine is in use
- `warning`: Machine has triggered a warning condition
- `offline`: Machine is not connected or powered off
- `maintenance`: Machine is under maintenance
- `emergency_stop`: Machine is in emergency stop condition

### Node Types

- `machine_monitor`: Controls and monitors machines
- `office_reader`: RFID reader for card registration
- `accessory_io`: Controls external accessories

For further assistance, please contact the development team.