# ShopTracker Office Testing Guide

This document gives the testing team a quick feature tour, suggested test scenarios, and a lightweight user manual. Testing is done in the browser only—no terminal or API tools are needed.

- Test URL: http://10.4.2.26:5000
- Supported browsers: recent Chrome/Edge/Firefox
- Accounts: Your coordinator will provide your username and password (Admin or Operator)
- Session timeouts may log you out after inactivity; just log back in

## What to test (scope)
- Core navigation and page load stability (no errors, no blank screens)
- Orders workflow (create → queue → progress at locations → complete/ship)
- Queue controls, including “Remove from queues”
- Help requests (raise/resolve) and alert visibility
- Machine access (Admin: assign access; Operator: view permitted machines)
- Settings and diagnostics: view-only unless told otherwise

## Feature tour (high level)
- Dashboard
  - Overview of orders and global queue positions
  - Action: Remove order from all queues (Trash icon)
- Orders
  - Create, view, and update orders; mark rush; update quantities; delete if needed
  - Order Detail: per-order actions, including Remove from queues
- Locations
  - Manage locations (Admin); see order progress per location
- Machines
  - Manage machines (Admin); assign orders to machines at a location
- Access Levels (Admin)
  - Only two roles: Admin and Operator
  - Bulk Assign dialog to quickly assign access to multiple machines
- Alert Center
  - View active help requests; resolve requests; review alert history
- Settings (Admin)
  - Tabs: System, Notifications, Security, Database
  - API tab (nested): Configuration, Sync Status, API Docs
  - Note: Please do not change values unless asked

## Quick start
1) Log in using the provided credentials
2) Use the left sidebar to navigate between pages
3) If you hit an error, capture a screenshot and the exact steps to reproduce

## Suggested test scenarios
- S1: Login and navigation
  - Log in, visit Dashboard, Orders, Locations, Machines, Alert Center
  - Expect: Pages render quickly; no error popups or console errors
- S2: Create an order (Orders → New)
  - Fill required fields: Order Number, TBFOS Number, Client, Due Date, Total Quantity
  - Expect: New order appears in Orders list and gains a global queue position
- S3: Edit an order
  - Open the order; update description/notes and quantity; toggle Rush
  - Expect: Changes save; Rush highlights the order in lists/queues
- S4: Queue management
  - From Dashboard or Order Detail, click “Remove from queues” (Trash)
  - Expect: Order is removed from global and location queues; status reset to Not Started
- S5: Location progress
  - For the created order, open its locations; mark a location as Started then Completed
  - Expect: Timestamps and completed quantities reflect changes; overall progress updates
- S6: Help requests
  - From an order card or detail, raise a Help Request; go to Alert Center and Resolve it
  - Expect: Request shows as Active then moves to resolved/closed; counters update
- S7: Access levels (Admin)
  - Open Access Levels; assign Operator access for a user to one or more machines
  - Use Bulk Assign to set multiple machines at once
  - Expect: Assignments appear in the list; Operator accounts see only permitted machines
- S8: Settings (Admin) — view only
  - Open Settings → System/Notifications/Security/Database
  - Expect: Values load without error; do not change unless instructed
- S9: API tab (Admin) — view only
  - Open Settings → API → Sync Status and API Documentation
  - Expect: Sync status loads; docs display; do not run “Test Connection” unless told

## Bug reporting checklist
When you find an issue, please include:
- Title and page (e.g., “Orders: Rush toggle doesn’t persist”)
- Steps to reproduce (numbered, concise)
- Expected vs. Actual behavior
- Screenshots (and, if possible, a short screen recording)
- Browser and time of test
- Any order number or entity IDs involved

## Known notes/limitations
- Environment is internal-only at http://10.4.2.26:5000
- Auto-refresh runs periodically (default ~30s); small changes may appear after a short delay
- Some lists may be empty if no data exists yet—that’s okay; create sample records to test

## Out of scope for testers
- Do not use terminal or API tools
- Do not alter database settings or API credentials in Settings unless asked
- Do not run destructive bulk operations without confirmation

## Tips
- Use a consistent naming pattern for test orders (e.g., TEST-<initials>-<number>)
- Work in small steps and verify after each change
- If unsure whether something is expected, ask your coordinator

Thank you for helping us validate ShopTracker before wider rollout!
