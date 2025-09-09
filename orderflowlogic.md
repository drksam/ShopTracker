# Order Flow Logic (Draft)

This document captures the intended end-to-end order lifecycle and status logic across Global, Location, and Shipping contexts. Please review and annotate any corrections.

## Concepts and Definitions

- Global Queue: A single sequence for all orders. Controls big-picture priority across the shop.
- Location Queue: A per-location sequence for day-to-day production. Reflects the global order but allows local sequencing; entries appear when the order is globally queued and the location is due to work it.
- Location Use Order: Each order specifies which locations it uses and in what order (e.g., use 1, use 2, ...). This governs when locations can be queued and started.
- Assignment: Mapping of an order at a specific location to one or more machines at that location.
- Shipping: A special global stage that determines readiness to ship and tracks shipped status.

## State Model (High-Level)

Global-level statuses:
1) Waiting / Not Started
   - Definition: Order exists but has not been placed in the Global Queue.
   - Entry Conditions: New orders by default.
   - Exit: When user adds the order to the Global Queue.

2) In Queue (Global perspective)
   - Definition: Order placed in the Global Queue; governs visibility into location queues as they become eligible.
   - Interaction with Locations: Triggers location queue entries when the order reaches each location in its use order (see Location flow).
   - Exit: When order is in progress at any location it should be considered “In Progress” globally.

3) In Progress (Global)
   - Definition: Order is in progress at one or more locations.
   - Entry Conditions: Any location starts the order.
   - Exit: Order becomes Finished after all locations finish and shipping completes (Fully Shipped).

4) Finished (Global)
   - Definition: All locations finished AND order fully shipped.
   - Entry Conditions: All required locations status = done, and shipping status = Fully Shipped.
   - Set Automatically.

Shipping readiness/shipped statuses (Global facet):
- Not Ready: Not all locations have started the order.
- Part Ready: All locations have started, but at least one has not finished.
- Fully Ready: All locations have finished (but shipment may not be complete yet).
- Not Shipped: None shipped.
- Part Shipped: Some but not all shipped.
- Fully Shipped: Entire order shipped. Triggers global Finished when all locations done.

Location-level statuses:
- Not Available: Location is not yet due for this order (e.g., use > current stage) or location not used by this order.
- In Queue: Order is queued at this location (eligible and scheduled, waiting to start here).
- In Progress: Work has started at this location.
- Paused: Work temporarily paused.
- Done: Work finished at this location.

## Location Flow Rules

- Appearance in Location Queue:
  - An order appears in a location’s queue only after it is placed in the Global Queue AND the location is eligible based on the order's use sequence.
  - Use sequencing:
    - Use 1: Becomes eligible to appear in queue as soon as the order is globally queued.
    - Use 2..N: Becomes eligible to appear in queue once the prior use location has started the order.
- Starting at a Location:
  - As soon as a prior use location has started the order, the next use location may also start (overlap is allowed). The prior location does not need to finish before the next starts.
  - However, the prior location must finish before the next location can finish (completion gating).
- Finishing at a Location:
  - Allowed only if all prior use locations have finished.

## Global vs. Location Queue Interplay

- Global queue is the source priority; location queues reflect the same relative ordering among orders that are currently eligible at the location.
- Reordering Global Queue should reflow location queues (keeping shipped/finished orders excluded as needed).
- Location queues may support local reordering among eligible items, but global precedence should be respected on global reorder.

## Machine Assignment Rules

- Orders at a location can be assigned to one or multiple machines as needed.
- Machine page can start an assigned order.
- Unassign should be supported; multiple assignments of the same order to different machines at the same location are allowed.

## Shipping Rules

- Readiness:
  - Not Ready: Not all required locations have started.
  - Part Ready: All required locations have started, at least one is not finished.
  - Fully Ready: All locations finished (order can be shipped completely when ready).
- Shipped Status:
  - Not Shipped: 0 shipped.
  - Part Shipped: 0 < shipped < total.
  - Fully Shipped: shipped == total.
- Global Finish:
  - When Fully Shipped AND all locations are Done, mark order as Finished globally (automatic).

## Overall Status Computation (UI)

- For global list (Orders page):
  - If Fully Shipped -> show Shipped.
  - Else if Finished -> Ready to Ship/Finished indicator.
  - Else if all locations are Paused or not started -> Paused
  - Else if any location In Progress or Paused -> In Progress.
  - Else if any location In Queue and none started -> In Queue.
  - Else Waiting / Not Started.
  - Overdue status overlays if due date passed (styling only).

- For location list (Location page):
  - Show per-location status (Not Available, In Queue, In Progress, Paused, Done) with queue position if applicable.

## Edge Cases

- Orders created and not queued globally stay in Waiting / Not Started and do not appear in any Location Queue.
- If a global reorder happens, location queues should update to keep global order precedence where applicable.
- Shipped orders should not appear in queues.
- Partially shipped orders still follow production logic until completed.
- Prevent finishing at a location if a prior use location is not done.

## Data and Events Summary

- Global queue position on order.
- order_locations with status per location, queue position, completedQuantity, timestamps (startedAt/completedAt).
- Assignment records (orderId, locationId, machineId, assignedAt).
- Audit trail for queue changes, assignments, and status transitions.

## Decisions & Clarifications (Previously Open Questions)

1. Local Reordering & Starting Non-Queued Orders
  - Allowed. Operators may locally reorder any eligible in-queue items.
  - Operators may also start an eligible order that is NOT yet in the location queue (office hasn't queued it) provided prior-use start gating is satisfied. This is a manual “expedite start” path that does NOT auto-add it to the queue first.
  - Implementation Implication: UI Start controls must consider both in-queue and eligible not_started items. Starting a not_started item should clear any future attempt to inject it at a conflicting queue position (it bypassed the queue).

2. Rush Flag / Rush Action
  - Add a "Rush" button on an order (global context) that:
    - Sets a rush flag (boolean) and timestamp (rushSetAt).
    - Immediately re-prioritizes the order to the front of the Global Queue (position = 1) and propagates recalculation.
    - Forces the order to appear at the top of every active location queue where it is eligible (if already present, move to top; if eligible and not present, auto-insert at top as in_queue).
    - Visual Styling: Red accent/border + RUSH badge anywhere order chips/cards appear.
    - Audit Entry: action = "rush", details include previous global position.
  - Subsequent manual global reorders should still allow moving other rushed items—BUT multiple rushed items retain precedence over all non-rush items while they remain rushed (secondary ordering: rushSetAt ascending).
  - Optional future: Allow clearing rush (unrush) which restores normal ordering (recalc by globalQueuePosition & existing logic).

3. Paused Propagation
  - Pausing at one location does NOT block subsequent locations from starting (only completion gating is enforced by finish dependency on prior done statuses).
  - Overall Status Logic updated: If all active (non-done) locations are paused (and none in_progress), display Paused globally.

4. Shipping Readiness Visibility
  - Add a discrete composite Production → Shipping readiness status line or badge group on Orders page and Order detail.
  - Show readiness states (Not Ready / Part Ready / Fully Ready) alongside (but visually distinct from) Shipped states.
  - When Fully Ready & not yet shipped: emphasize with a “Ready to Ship” style (e.g., amber/attention).

5. Starting Non-Queued Eligibility Check
  - Same gating rule as queue eligibility (prior use location must have started). No extra constraints.
  - When started outside queue, its orderLocation.status becomes in_progress and queuePosition null; updateQueuePositions should ignore it (already does by status).

## Rush Feature Specification (Detail)

Data Additions:
- orders.rush (boolean, default false)
- orders.rushSetAt (timestamp nullable)

Server Logic:
- POST /api/orders/:id/rush
  - Validates not already rushed (idempotent OK: updates timestamp if needed or returns current state).
  - Moves order to global position 1, shifts others down; among multiple rushed orders, stable order by rushSetAt.
  - Triggers: recalcAllLocationQueues() with rush-aware ordering.
  - Audit record.
- POST /api/orders/:id/unrush (optional future) clears rush & timestamp then recalculates.

Queue Recalculation Adjustments:
1. Global queue ordering precedence layers:
  a. Rushed orders sorted by rushSetAt ascending.
  b. Non-rushed orders by existing globalQueuePosition (nulls last) then createdAt.
2. Location queue ordering precedence layers:
  a. Rushed & eligible & in_queue (or auto-inserted) first (rushSetAt asc).
  b. Non-rushed by existing logic (globalQueuePosition, queuePosition fallback, createdAt desc).
3. Auto-insertion for rush:
  - If rush applied and orderLocation exists with status not_started → set to in_queue + top position.
  - If orderLocation does not exist at an eligible location (e.g., upcoming next stage) and eligibility criteria satisfied → create in_queue at top.

UI Changes:
- Global Orders List: Rush badge (e.g., red pill) + card accent.
- Location Queue: Rush items pinned at top with red left border.
- Order Detail: Rush toggle button (Rush / Unrush) with confirmation.
- Machine Assignment Dropdown: Rush items appear first, labeled.

Constraints & Edge Handling:
- Clearing rush re-runs global + location queue recalculation removing rush precedence but preserving manual reorders within non-rush layer.
- Manual reordering cannot move a non-rush item above a rush item (enforce on server in reorder endpoints—reject or clamp position).
- If multiple rushes happen rapidly, ordering is deterministic by rushSetAt.

## Status Logic (Refined)

Overall (Global UI) evaluation order:
1. If isShipped AND shippedQuantity == total → Shipped.
2. Else if isFinished (all locations done & fully shipped) → Finished.
3. Else if Fully Ready (all locations done, not fully shipped) → Fully Ready.
4. Else if Part Ready → Part Ready.
5. Else if Rush (show Rush badge in addition to base state below; not a replacement state) → continue.
6. Else if all active locations paused (no in_progress) → Paused.
7. Else if any location in_progress or paused → In Progress.
8. Else if any location in_queue and none started → In Queue.
9. Else Waiting / Not Started.
Overlay: Overdue if dueDate < now and not fully shipped.

Location Row Status:
- Rush accent overlays base (In Queue / In Progress / Paused / Done) if order is rushed.

Start Button Eligibility (Location):
- Show for: in_queue OR (not_started & eligible via previous location started rule) even if not in queue.

## Data & Event Summary (Updated for Rush)

Added Fields:
- orders.rush (boolean)
- orders.rushSetAt (timestamp)

New Audit Actions:
- rush, unrush

Queue Impact Events:
- rush/unrush → global reorder → recalcAllLocationQueues (rush precedence applied/removed)
- start outside queue → skip adding to queue, but still queue next location if applicable.

---

Please review these integrated decisions (especially Rush handling). Once confirmed I can proceed to add schema changes, endpoints, and UI wiring.
