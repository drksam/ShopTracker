# ShopTracker Database Information for PostgreSQL

## Overview
ShopTracker is a comprehensive manufacturing workflow management system that tracks orders through multiple production locations. The database is designed for PostgreSQL and supports both the main manufacturing workflow and an integrated machine access system with RFID-based authentication.

## Database Configuration

### Connection Details
- **Database System**: PostgreSQL 14+
- **Environment Variable**: `DATABASE_URL`
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **Connection Library**: `@neondatabase/serverless` (Neon PostgreSQL)

### Required Environment Variables
```bash
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

## Database Schema

### Core Manufacturing System

#### 1. Users Table (`users`)
Stores user accounts with role-based access and notification preferences.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    role VARCHAR CHECK (role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    rfid_number VARCHAR,
    email VARCHAR,
    -- Notification preferences
    enable_sound_notifications BOOLEAN DEFAULT true,
    enable_visual_notifications BOOLEAN DEFAULT true,
    notification_sound VARCHAR DEFAULT 'default',
    order_completed_notifications BOOLEAN DEFAULT true,
    order_started_notifications BOOLEAN DEFAULT true,
    help_request_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Key Features:**
- Role-based access control (admin/user)
- RFID integration for physical access
- Granular notification preferences
- Audit trail tracking

#### 2. Locations Table (`locations`)
Defines production locations in the workflow sequence.

```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    used_order INTEGER NOT NULL, -- Order in workflow sequence
    is_primary BOOLEAN NOT NULL DEFAULT false,
    skip_auto_queue BOOLEAN NOT NULL DEFAULT false,
    count_multiplier REAL NOT NULL DEFAULT 1,
    no_count BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Key Features:**
- Workflow ordering system
- Primary location designation
- Automatic queue management controls
- Flexible quantity counting with multipliers

#### 3. Machines Table (`machines`)
Physical machines at each location.

```sql
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    machine_id VARCHAR NOT NULL UNIQUE, -- 2-digit identifier
    location_id INTEGER NOT NULL REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 4. Machine Permissions Table (`machine_permissions`)
Controls which users can access which machines.

```sql
CREATE TABLE machine_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, machine_id)
);
```

#### 5. Orders Table (`orders`)
Central order management with shipping tracking.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR NOT NULL UNIQUE,
    tbfos_number VARCHAR NOT NULL,
    client VARCHAR NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_quantity INTEGER NOT NULL,
    description TEXT,
    notes TEXT,
    is_finished BOOLEAN NOT NULL DEFAULT false,
    is_shipped BOOLEAN NOT NULL DEFAULT false,
    partially_shipped BOOLEAN NOT NULL DEFAULT false,
    shipped_quantity INTEGER NOT NULL DEFAULT 0,
    pdf_prefix VARCHAR DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);
```

**Key Features:**
- Complete order lifecycle tracking
- Partial shipping support
- PDF document integration
- Client and deadline management

#### 6. Order Locations Table (`order_locations`)
Tracks order progress through each location.

```sql
CREATE TABLE order_locations (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    status VARCHAR CHECK (status IN ('not_started', 'in_queue', 'in_progress', 'paused', 'done')) NOT NULL DEFAULT 'not_started',
    queue_position INTEGER,
    completed_quantity INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, location_id)
);
```

**Key Features:**
- Status tracking per location
- Queue management system
- Progress quantification
- Timing analytics

#### 7. Audit Trail Table (`audit_trail`)
Complete activity logging for compliance and tracking.

```sql
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    user_id INTEGER REFERENCES users(id),
    location_id INTEGER REFERENCES locations(id),
    action VARCHAR NOT NULL, -- 'started', 'updated', 'finished', 'shipped'
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 8. Help Requests Table (`help_requests`)
Production support and assistance tracking.

```sql
CREATE TABLE help_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

### System Configuration Tables

#### 9. Email Settings Table (`email_settings`)
Email notification configuration.

```sql
CREATE TABLE email_settings (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL,
    for_shipping BOOLEAN NOT NULL DEFAULT true,
    for_help BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 10. PDF Settings Table (`pdf_settings`)
Document generation settings.

```sql
CREATE TABLE pdf_settings (
    id SERIAL PRIMARY KEY,
    pdf_prefix VARCHAR NOT NULL DEFAULT '',
    pdf_postfix VARCHAR NOT NULL DEFAULT '.pdf',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Machine Access Authentication (RFID Integration)

#### 11. RFID Cards Table (`rfid_cards`)
Physical RFID card management.

```sql
CREATE TABLE rfid_cards (
    card_id VARCHAR PRIMARY KEY, -- RFID card number
    user_id INTEGER NOT NULL REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT true,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 12. Access Levels Table (`access_levels`)
Machine-specific access permissions.

```sql
CREATE TABLE access_levels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    machine_id VARCHAR NOT NULL, -- External machine identifier
    access_level VARCHAR CHECK (access_level IN ('operator', 'admin', 'maintenance')) NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, machine_id)
);
```

#### 13. Access Logs Table (`access_logs`)
Complete access audit trail for security.

```sql
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- NULL for unidentified cards
    machine_id VARCHAR NOT NULL,
    card_id VARCHAR NOT NULL,
    access_granted BOOLEAN NOT NULL DEFAULT false,
    reason TEXT, -- Reason for access decision
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### API Integration and Monitoring

#### 14. API Configs Table (`api_configs`)
External system integration settings.

```sql
CREATE TABLE api_configs (
    id SERIAL PRIMARY KEY,
    machine_monitor_api_key VARCHAR NOT NULL,
    machine_monitor_api_url VARCHAR NOT NULL,
    sync_enabled BOOLEAN NOT NULL DEFAULT false,
    sync_interval INTEGER NOT NULL DEFAULT 60, -- minutes
    alerts_enabled BOOLEAN NOT NULL DEFAULT false,
    push_user_data BOOLEAN NOT NULL DEFAULT true,
    push_location_data BOOLEAN NOT NULL DEFAULT true,
    push_machine_data BOOLEAN NOT NULL DEFAULT true,
    pull_access_logs BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 15. Machine Alerts Table (`machine_alerts`)
Bidirectional machine communication and alerts.

```sql
CREATE TABLE machine_alerts (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR NOT NULL, -- Can be from external systems
    sender_id INTEGER REFERENCES users(id), -- NULL if from machine
    message TEXT NOT NULL,
    alert_type VARCHAR CHECK (alert_type IN ('help_request', 'notification', 'warning', 'error')) NOT NULL,
    status VARCHAR CHECK (status IN ('pending', 'acknowledged', 'resolved')) NOT NULL DEFAULT 'pending',
    origin VARCHAR CHECK (origin IN ('machine', 'system')) NOT NULL,
    resolved_by_id INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## Indexes and Performance Optimization

### Primary Indexes
All tables have automatic primary key indexes on their `id` columns.

### Additional Recommended Indexes

```sql
-- User lookup indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_rfid_number ON users(rfid_number) WHERE rfid_number IS NOT NULL;

-- Order tracking indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_due_date ON orders(due_date);
CREATE INDEX idx_orders_client ON orders(client);
CREATE INDEX idx_orders_status ON orders(is_finished, is_shipped);

-- Location workflow indexes
CREATE INDEX idx_locations_used_order ON locations(used_order);
CREATE INDEX idx_order_locations_status ON order_locations(status);
CREATE INDEX idx_order_locations_queue ON order_locations(location_id, queue_position) WHERE queue_position IS NOT NULL;

-- Audit and logging indexes
CREATE INDEX idx_audit_trail_order ON audit_trail(order_id, created_at);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id, created_at);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX idx_access_logs_machine ON access_logs(machine_id, timestamp);

-- RFID system indexes
CREATE INDEX idx_rfid_cards_user ON rfid_cards(user_id);
CREATE INDEX idx_rfid_cards_active ON rfid_cards(active) WHERE active = true;
CREATE INDEX idx_access_levels_machine ON access_levels(machine_id);

-- Alert system indexes
CREATE INDEX idx_machine_alerts_status ON machine_alerts(status, created_at);
CREATE INDEX idx_machine_alerts_machine ON machine_alerts(machine_id, created_at);
```

## Data Relationships and Constraints

### Foreign Key Relationships
- `machines.location_id` → `locations.id`
- `machine_permissions.user_id` → `users.id`
- `machine_permissions.machine_id` → `machines.id`
- `orders.created_by` → `users.id`
- `order_locations.order_id` → `orders.id`
- `order_locations.location_id` → `locations.id`
- `audit_trail.order_id` → `orders.id`
- `audit_trail.user_id` → `users.id`
- `audit_trail.location_id` → `locations.id`
- `help_requests.order_id` → `orders.id`
- `help_requests.location_id` → `locations.id`
- `help_requests.user_id` → `users.id`
- `rfid_cards.user_id` → `users.id`
- `access_levels.user_id` → `users.id`
- `access_logs.user_id` → `users.id`
- `machine_alerts.sender_id` → `users.id`
- `machine_alerts.resolved_by_id` → `users.id`

### Business Logic Constraints
- Each user can have only one RFID card active at a time
- Order locations must be unique per order
- Queue positions should be unique per location
- Access levels are unique per user-machine combination

## Migration Strategy from SQLite

The current application uses SQLite with better-sqlite3. To migrate to PostgreSQL:

1. **Update Dependencies**: Replace `better-sqlite3` with `pg` or `@neondatabase/serverless`
2. **Update Schema**: Convert SQLite-specific syntax to PostgreSQL
3. **Update Database Connection**: Modify `server/db.ts` to use PostgreSQL adapter
4. **Data Migration**: Export data from SQLite and import to PostgreSQL

### Required Schema Updates for PostgreSQL

1. **Data Types**:
   - `integer("id").primaryKey({ autoIncrement: true })` → `serial("id").primaryKey()`
   - `integer("field", { mode: "boolean" })` → `boolean("field")`
   - `integer("field", { mode: "timestamp" })` → `timestamp("field", { withTimezone: true })`

2. **Default Functions**:
   - `.$defaultFn(() => new Date())` → `.defaultNow()`

## Security Considerations

### Authentication
- Passwords should be hashed using bcrypt or similar
- RFID numbers are stored as plain text for hardware integration
- Session management through secure tokens

### Access Control
- Role-based permissions (admin/user)
- Machine-specific access controls
- Audit logging for all sensitive operations

### Data Protection
- Personal information in users table
- Activity tracking in audit_trail and access_logs
- Secure API key storage for external integrations

## Backup and Maintenance

### Recommended Backup Strategy
- Daily full database backups
- Point-in-time recovery setup
- Backup retention: 30 days daily, 12 weeks weekly, 12 months monthly

### Maintenance Tasks
- Regular VACUUM and ANALYZE operations
- Index maintenance and statistics updates
- Audit log archival (recommend keeping 2+ years)
- Access log cleanup for older entries

## Performance Monitoring

### Key Metrics to Monitor
- Order processing times by location
- Queue wait times
- Database query performance
- RFID authentication response times
- API sync performance

### Recommended Tools
- PostgreSQL's built-in performance insights
- Query performance monitoring
- Connection pool monitoring
- Application-level metrics for business logic

## Environment Setup

### Development
```bash
# Local PostgreSQL setup
DATABASE_URL=postgresql://shoptracker:password@localhost:5432/shoptracker_dev
```

### Production
```bash
# Use managed PostgreSQL service (Neon, AWS RDS, etc.)
DATABASE_URL=postgresql://user:pass@prod-host:5432/shoptracker_prod
```

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: For authentication tokens
- `SMTP_*`: Email configuration for notifications
- `API_*`: External system integration settings
