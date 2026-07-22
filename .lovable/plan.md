Extend FleetPulse with the five missing modules without touching completed pages (Dashboard, Vehicles, Drivers, Expenses, Voucher, New Trip flow).

## 1. Database migrations (additive only)

New tables + relationships:
- `customers` (company_name, contact_person, phone, email, address, status)
- `contracts` (customer_id → customers, route, contract_currency, contract_amount, start_date, end_date, status)
- `company_settings` (single-row: name, logo_url, address, phone, email, default_currency, default_fx_rate)
- `user_roles` with enum `app_role` (admin/dispatcher/finance/driver) + `has_role()` security-definer fn
- `audit_logs` (actor, action, entity, entity_id, payload, created_at)

Alter existing (non-breaking, nullable):
- `trips`: add `customer_id` (nullable FK), `contract_id` (nullable FK), `settled_at`, `audited_at`
- keep all existing columns/policies intact

Grants + demo-open RLS on new tables (matches current project pattern). Seed a couple of demo customers + one contract linked to the DAR-KASUMBALESA route.

## 2. Trips Management page (`/trips`)

New route `src/routes/trips.index.tsx`:
- Search + status filter chips (Draft / Dispatched / In-Transit / Completed / Audited)
- Table: Trip Code, Route, Vehicle, Driver, Dispatch, Return, Contract Value (TZS), Advance Paid, Status, Actions
- Actions dropdown: View Details, Open Audit, Edit Trip, Complete Trip (advances status per workflow)
- Reuses existing `tripsQuery`; adds a small `updateTripStatus` mutation
- Add "Trips" link to `AppHeader`

## 3. Trip Audit & Settlement (`/trips/$tripId/audit`)

New route reusing `tripDetailQuery`:
- Header: trip info, vehicle, driver, route, contract
- Financial summary cards with the exact formulas requested
- Expense breakdown grouped by category (Fuel, Tolls, Driver Allowance, Accommodation, Container Charges, Miscellaneous)
- Settlement actions: Mark Settled, Mark Audited, Export Report (CSV + print-to-PDF via `window.print`)
- Existing `/trips/$tripId` detail page stays as-is; audit is a sibling route

## 4. Finance & Reports (`/finance`)

New route `src/routes/finance.index.tsx`:
- Metric cards: Total Revenue, Total Expenses, Total Profit, Outstanding Advances, Salary Costs, Active Contracts
- Filters: date range, driver, vehicle, route, trip
- Report tabs: Trip Profitability, Driver Advance, Driver Salary, Fuel Consumption, Revenue, Expense
- Charts (recharts, already in shadcn stack): Monthly Revenue, Monthly Expenses, Profit Trend, Fuel Cost Trend
- Export: CSV + Excel (via SheetJS) + Print/PDF

## 5. Customers & Contracts (`/customers`, `/customers/$customerId`)

- List page: search, add, archive, revenue-per-customer
- Profile page: company info, contracts list, linked trips, revenue generated
- `NewCustomerDialog`, `NewContractDialog` components
- Optional contract selector added to `NewTripDialog` (small, additive edit only)

## 6. Settings & Administration (`/settings`)

Tabbed page:
- Company Settings (name, logo upload to `receipts` bucket subfolder, contact info)
- Financial Settings (default currency, default FX rate)
- User Management (list `user_roles`, assign role — demo-mode friendly)
- System (notification prefs stub, audit-log viewer reading `audit_logs`)

## Navigation

Add Trips, Finance, Customers, Settings to `AppHeader` (keeps existing links).

## Technical notes

- All new queries live in `src/lib/queries.ts` alongside existing ones
- Reuse `fmtTZS` / `fmtUSD` / `StatusBadge`
- No changes to existing routes except `AppHeader` nav + optional contract dropdown in `NewTripDialog`
- Dependencies to add: `recharts` (charts), `xlsx` (Excel export), `date-fns` (already used)

Confirm and I'll build it.
