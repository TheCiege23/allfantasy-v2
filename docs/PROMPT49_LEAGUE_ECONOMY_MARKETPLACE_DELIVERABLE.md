# Prompt 49 — League Economy + Marketplace System (Deliverable)

## 1 economy architecture

- Cosmetic-only economy layer across league UI and profile surfaces using `ManagerWallet`, `MarketplaceItem`, and `PurchaseRecord`.
- End-to-end flow:
  - `WalletService` creates/syncs wallet.
  - `MarketplaceService` lists catalog by sport/category.
  - `PurchaseProcessor` validates and atomically executes purchases.
  - `InventoryManager` derives owned items and purchase history.
  - `CosmeticResolver` resolves display cosmetics from owned items.
- Added deterministic **earning path** via `syncWalletEarnings(managerId)` in `WalletService`:
  - computes earned currency from existing progression systems (XP, championships, awards, records, HoF)
  - credits only positive deltas into `currencyBalance` + `earnedLifetime`
  - keeps earning idempotent and monotonic.
- Sport support explicitly preserved through `lib/sport-scope.ts` for NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

---

## 2 schema additions

- **ManagerWallet** (`manager_wallets`): id (cuid), managerId (VarChar 128, unique), currencyBalance (Int default 0), earnedLifetime (Int default 0), spentLifetime (Int default 0), updatedAt.
- **MarketplaceItem** (`marketplace_items`): id (cuid), itemType (VarChar 64), itemName (VarChar 128), description (VarChar 512 optional), price (Int default 0), sportRestriction (VarChar 16 optional), cosmeticCategory (VarChar 64), createdAt. Indexes: cosmeticCategory, sportRestriction.
- **PurchaseRecord** (`purchase_records`): id (cuid), managerId (VarChar 128), itemId (String), price (Int default 0), createdAt. Indexes: managerId, itemId.

Migration: `20260323000000_add_league_economy`.

---

## 3 backend services

- `WalletService`
  - added `syncWalletEarnings` for deterministic earn logic.
  - wallet route now returns synced wallet so earnings are reflected before spending.
- `PurchaseProcessor`
  - enforces cosmetic-only catalog (`ITEM_TYPES` + `COSMETIC_CATEGORIES` check).
  - enforces sport restrictions strictly for restricted items.
  - performs debit + purchase in a single DB transaction (prevents partial purchase/debit drift).
- `MarketplaceService`
  - list-by-sport behavior now includes unrestricted (`sportRestriction: null`) plus matching sport.
- API hardening
  - `GET /api/marketplace/items` validates sport and category.
  - `POST /api/marketplace/purchase` validates/normalizes sport and trims item id.

---

## 4 UI integration points

- `StoreTab` (`components/app/tabs/StoreTab.tsx`)
  - store page filters (sport/category)
  - purchase confirmation dialog
  - refresh + seed actions
  - inventory section with **Owned Items** and **Purchase History** tabs
  - explicit error/status rendering for wallet/items/inventory/seed/purchase flows
- Profile integration (`app/profile/ProfilePageClient.tsx`)
  - added cosmetic loadout display for own profile using `GET /api/marketplace/cosmetics`
- Hooks (`hooks/useMarketplace.ts`)
  - improved inventory/history error handling
  - added `useResolvedCosmetics(enabled)` for profile cosmetic display.

---

## 5 UI audit findings

| Location | Element | Handler | State / API | Persisted / Update | Status |
|----------|--------|--------|-------------|--------------------|--------|
| **Store tab** | Wallet balance + lifetime stats | — | useWallet() | refreshWallet after purchase | OK |
| **Store tab** | Refresh | onClick refreshAll | GET wallet, items, inventory | Yes | OK |
| **Store tab** | Seed store | runSeed() | POST marketplace/seed, status + refreshItems | Yes | OK |
| **Store tab** | Store / Inventory toggle | setActiveSection | activeSection state | — | OK |
| **Inventory** | Owned/History tabs | setInventoryTab | inventoryTab state | — | OK |
| **Store tab** | Sport filter | setSportFilter(e.target.value) | useMarketplaceItems(sport, category) | Refetch on change | OK |
| **Store tab** | Category filter | setCategoryFilter(e.target.value) | useMarketplaceItems(sport, category) | Refetch on change | OK |
| **Store tab** | Buy button | handlePurchase(itemId, name, price) | setConfirmPurchase | Opens dialog | OK |
| **Store tab** | Confirmation dialog Cancel | setConfirmPurchase(null) | — | Closes dialog | OK |
| **Store tab** | Confirmation dialog Confirm | confirmPurchaseSubmit() | POST marketplace/purchase, then refreshAll | Wallet & inventory update | OK |
| **Store tab** | Purchase history list | — | useInventory(true).history | refreshInventory after purchase | OK |
| **Profile page** | Cosmetic loadout display | useResolvedCosmetics | GET marketplace/cosmetics | Updates after purchases | OK |
| **GET /marketplace/wallet** | Wallet | useWallet | Auth required | Yes | OK |
| **GET /marketplace/items** | Store list | useMarketplaceItems | sport, cosmeticCategory | Yes | OK |
| **POST /marketplace/purchase** | Purchase | confirmPurchaseSubmit | itemId, sport?; auth | Persists; UI refreshes | OK |
| **GET /marketplace/inventory** | Inventory | useInventory | Auth | Yes | OK |

All required click paths are wired end-to-end with handlers, state transitions, persistence, and UI refresh after purchase.

---

## 6 QA findings

- `npm run typecheck` passed.
- Added and passed tests:
  - `__tests__/marketplace-routes-contract.test.ts` (5 tests)
  - `__tests__/purchase-processor.test.ts` (4 tests)
- Verified by tests:
  - wallet route auth + sync path
  - items filter forwarding and input validation
  - purchase sport normalization/validation
  - inventory/history route wiring
  - cosmetics + seed routes
  - purchase processor cosmetic-only enforcement
  - purchase processor sport restriction behavior
  - purchase processor insufficient balance and success transaction paths

---

## 7 issues fixed

- Added deterministic earn integration (`syncWalletEarnings`) so managers both **earn and spend** resources.
- Eliminated purchase race/partial-write risk with atomic transaction purchase flow.
- Enforced cosmetic-only purchases at processor layer (no pay-to-win catalog entries can be purchased).
- Closed sport-restriction bypass by requiring valid sport for restricted items.
- Added route-level validation for marketplace sport/category params.
- Improved Store UI reliability (wallet/inventory/seed errors surfaced, purchase history tab, stronger refresh feedback).
- Added profile cosmetic display wiring from marketplace resolver data.

---

## 8 final checklist

- [x] Wallet balance updates after purchase.
- [x] Managers can earn currency via deterministic progression sync.
- [x] Items persist to inventory after purchase.
- [x] Cosmetic loadout appears on profile.
- [x] Store filters, refresh, buy confirmation, and inventory tabs function.
- [x] API validations/auth checks prevent invalid sport and unauthenticated actions.
- [x] Purchase path is cosmetic-only and never modifies competitive gameplay data.
- [ ] Optional manual browser pass for full visual click-through.

---

## 9 explanation of marketplace system

The League Economy + Marketplace system now provides a complete cosmetic progression loop:

- managers **earn** prestige currency from deterministic career progression signals,
- managers **spend** that currency on marketplace cosmetics,
- purchases are persisted and reflected in wallet + inventory,
- cosmetics are resolved and displayed on profile surfaces.

The PurchaseProcessor enforces cosmetic-only categories/types, validates sport restrictions, and performs debit + purchase in a transaction so wallet and purchase records stay consistent. No purchased data modifies rosters, matchups, scoring, or competitive logic, preserving strict no-pay-to-win behavior.
