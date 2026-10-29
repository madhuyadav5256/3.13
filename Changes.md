# FridgePolice implementation notes

## The four requested scenarios

1. **Preventing double allocation:** Pending requests do not reserve food. Approval checks the item's currently available quantity and deducts the requested percentage in the same pure state transition that marks the request approved. The next approval therefore sees the reduced quantity and fails cleanly if insufficient. Inventory is never allowed to go negative by approval.
2. **Expiring approvals and spoiled food:** Approved portions retain an `approvedAt` timestamp and remain held out of available quantity. The configurable expiry duration is stored in browser storage; expired requests release their reservation back to the matching item. Expiry runs on app load and every minute while open. Marking food spoiled sets its available quantity to zero and rejects its pending and approved requests so no reservation remains attached to unusable food.
3. **Duplicate names:** Every food and request has an independent ID. Names are display labels only; request actions and inventory changes resolve foods by ID. The sample Cheddar entries make this behavior visible.
4. **Inventory correction:** A correction represents the total physical amount actually remaining, including any reserved portions. The logic preserves approved reservations in chronological order; if the corrected physical quantity cannot cover them all, it cancels newest reservations first. The remaining actual amount becomes unreserved inventory. Values from 0% through 100% are valid for corrections.

## Implementation decisions and assumptions

- Quantities and portion sizes are percentages (0–100), not weights or serving counts. Adding food and requesting portions require values greater than zero; a correction may be zero.
- Available inventory excludes active approved reservations. Consumption simply changes an approved request's status: its quantity was already deducted when approved, and is not added back.
- A request can be submitted while enough inventory is not currently available; the roommate/owner can decide, but approval is the point at which availability is enforced.
- Corrections first keep the oldest active approvals. A reservation cancelled to reconcile a correction moves to `rejected` and includes an explanatory note.
- Marking an item spoiled keeps its record visible for history, but gives it zero quantity and blocks further requests.
- State and expiry preferences use `localStorage` on the current browser/device. This is a household demo, not shared synchronization across devices.
- All state-transition rules are in `src/logic.js`, independent of React, and the tests use Node's built-in test runner.

## Limitations

- There is no authentication, server, or real-time multi-device collaboration; household members share the same browser storage.
- The portion model is percentage-based and does not model different package sizes, weights, or units.
- Expiration is evaluated when the app loads and at one-minute intervals while open; a closed browser does not run a background timer.
- Browser storage can be cleared or edited by the user. It is suitable for a local prototype, not authoritative inventory records.
