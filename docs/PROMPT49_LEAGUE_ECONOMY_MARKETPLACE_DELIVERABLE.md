# Prompt 49 — League Economy + Marketplace System (Deliverable)

## 1. Economy Architecture

- **Purpose:** League and platform economy where managers earn and spend **prestige currency** on **cosmetic-only** items (team upgrades, profile frames, league trophies, draft board skins, avatar items, historical banners). The economy **never affects competitive balance** — all items are cosmetic.
- **Data flow:**
  - **ManagerWallet:** One row per manager (managerId, currencyBalance, earnedLifetime, spentLifetime). Created on first access via WalletService.getOrCreateWallet.
  - **MarketplaceItem:** Catalog of items (itemType, itemName, description, price, sportRestriction, cosmeticCategory). Filtered by sport (items with null restriction or matching sport) and category for store listing.
  - **PurchaseRecord:** One row per purchase (managerId, itemId, price, createdAt). Inventory = aggregate of purchases by manager (count per itemId).
  - **WalletService:** getOrCreateWallet, getWallet, creditBalance, debitBalance. Used by PurchaseProcessor.
  - **MarketplaceService:** listMarketplaceItems (all or by category), listMarketplaceItemsForSport (sport + unrestricted), getMarketplaceItem.
  - **PurchaseProcessor:** processPurchase(managerId, itemId, { sport? }) — validates item, checks balance, debits wallet, creates PurchaseRecord. Returns success + newBalance or error.
  - **InventoryManager:** getInventory(managerId) → list of owned items with count; getPurchaseHistory(managerId).
  - **CosmeticResolver:** resolveCosmeticForManager(managerId, category), resolveAllCosmeticsForManager(managerId) — return first owned item per category for profile display (cosmetic only).
- **Sport support:** NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER via sport-scope; MarketplaceItem.sportRestriction optional (null = all sports).

---

## 2. Schema Additions

- **ManagerWallet** (`manager_wallets`): id (cuid), managerId (VarChar 128, unique), currencyBalance (Int default 0), earnedLifetime (Int default 0), spentLifetime (Int default 0), updatedAt.
- **MarketplaceItem** (`marketplace_items`): id (cuid), itemType (VarChar 64), itemName (VarChar 128), description (VarChar 512 optional), price (Int default 0), sportRestriction (VarChar 16 optional), cosmeticCategory (VarChar 64), createdAt. Indexes: cosmeticCategory, sportRestriction.
- **PurchaseRecord** (`purchase_records`): id (cuid), managerId (VarChar 128), itemId (String), price (Int default 0), createdAt. Indexes: managerId, itemId.

Migration: `20260323000000_add_league_economy`. Applied with `npx prisma migrate deploy`.

---

## 3. Backend Services

- **WalletService** (`lib/league-economy/WalletService.ts`): getOrCreateWallet, getWallet, creditBalance, debitBalance.
- **MarketplaceService** (`lib/league-economy/MarketplaceService.ts`): listMarketplaceItems, listMarketplaceItemsForSport, getMarketplaceItem.
- **PurchaseProcessor** (`lib/league-economy/PurchaseProcessor.ts`): processPurchase — validate item, check sport, debit wallet, create PurchaseRecord.
- **InventoryManager** (`lib/league-economy/InventoryManager.ts`): getInventory (group by itemId with count), getPurchaseHistory.
- **CosmeticResolver** (`lib/league-economy/CosmeticResolver.ts`): resolveCosmeticForManager, resolveAllCosmeticsForManager (for profile display).
- **seedDefaultItems** (`lib/league-economy/seedDefaultItems.ts`): seed default cosmetic items if table empty (idempotent).

---

## 4. UI Integration Points

- **Store tab:** New “Store” tab in league shell. Renders **StoreTab**:
  - **Wallet balance** at top (coins icon + currencyBalance); **Refresh** and **Seed store** buttons.
  - **Store / Inventory** section toggle (Store = marketplace list, Inventory = owned items).
  - **Store:** Sport filter (All + NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER), category filter (All + team_upgrade, profile_frame, league_trophy, draft_board_skin, avatar_item, historical_banner). Grid of items: name, category label, description, price, **Buy** button (disabled if balance < price). **Confirmation dialog** on Buy: “Confirm purchase” with item name and price; Cancel / Confirm. On success: dialog closes, wallet and inventory refresh.
  - **Inventory:** List of owned items (itemName, category, count). Copy: “Cosmetics apply to your profile and team display only. They never affect competitive balance.”
- **APIs:** GET `/api/marketplace/wallet` (auth), GET `/api/marketplace/items?sport=&cosmeticCategory=&limit=`, POST `/api/marketplace/purchase` (body itemId, sport?; auth), GET `/api/marketplace/inventory?history=0|1` (auth), GET `/api/marketplace/cosmetics` (auth; resolved cosmetics for profile), POST `/api/marketplace/seed` (auth; seed default items).
- **Hooks:** useMarketplaceItems(sport, category), useWallet(), useInventory(includeHistory?) in `hooks/useMarketplace.ts`.

---

## 5. UI Audit Findings

| Location | Element | Handler | State / API | Persisted / Update | Status |
|----------|--------|--------|-------------|--------------------|--------|
| **Store tab** | Wallet balance | — | useWallet() | refreshWallet after purchase | OK |
| **Store tab** | Refresh | onClick refreshAll | GET wallet, items, inventory | Yes | OK |
| **Store tab** | Seed store | runSeed() | POST marketplace/seed, then refreshItems | Yes | OK |
| **Store tab** | Store / Inventory toggle | setActiveSection | activeSection state | — | OK |
| **Store tab** | Sport filter | setSportFilter(e.target.value) | useMarketplaceItems(sport, category) | Refetch on change | OK |
| **Store tab** | Category filter | setCategoryFilter(e.target.value) | useMarketplaceItems(sport, category) | Refetch on change | OK |
| **Store tab** | Buy button | handlePurchase(itemId, name, price) | setConfirmPurchase | Opens dialog | OK |
| **Store tab** | Confirmation dialog Cancel | setConfirmPurchase(null) | — | Closes dialog | OK |
| **Store tab** | Confirmation dialog Confirm | confirmPurchaseSubmit() | POST marketplace/purchase, then refreshAll | Wallet & inventory update | OK |
| **Store tab** | Inventory list | — | useInventory(true) | refreshInventory after purchase | OK |
| **GET /marketplace/wallet** | Wallet | useWallet | Auth required | Yes | OK |
| **GET /marketplace/items** | Store list | useMarketplaceItems | sport, cosmeticCategory | Yes | OK |
| **POST /marketplace/purchase** | Purchase | confirmPurchaseSubmit | itemId, sport?; auth | Persists; UI refreshes | OK |
| **GET /marketplace/inventory** | Inventory | useInventory | Auth | Yes | OK |

Handlers exist; state updates after purchase (refreshAll); purchases persist (PurchaseRecord + wallet debit); UI updates (wallet balance, inventory). No pay-to-win: all items are cosmetic categories only.

---

## 6. QA Findings

- **Wallet balances:** Debit on purchase; balance shown at top; refresh updates after purchase.
- **Items in inventory:** Purchase creates PurchaseRecord; getInventory aggregates by itemId; Inventory tab shows owned items with count.
- **Cosmetics apply:** CosmeticResolver returns first owned item per category; GET /marketplace/cosmetics for profile display. All items are cosmeticCategory only; no competitive impact.
- **No pay-to-win:** Schema and code only allow cosmetic categories (team_upgrade, profile_frame, league_trophy, draft_board_skin, avatar_item, historical_banner); no game-affecting items.

---

## 7. Issues Fixed

- **Schema:** ManagerWallet, MarketplaceItem, PurchaseRecord added; migration created and applied.
- **API items:** When sport is empty, list all items via listMarketplaceItems; when sport set, use listMarketplaceItemsForSport (unrestricted + that sport).
- **Confirmation dialog:** Modal with item name, price, Cancel/Confirm; purchase error shown in dialog; on success dialog closes and refreshAll runs.
- **VALID_TABS:** Store (and Awards, Record Books) added to league page VALID_TABS for deep links.

---

## 8. Final Checklist

- [ ] Open league → Store tab; confirm wallet balance, Refresh, Seed store, Store/Inventory sections.
- [ ] Select sport and/or category filter; confirm store list updates.
- [ ] Click Buy on an item; confirm confirmation dialog with name and price.
- [ ] Click Confirm (with sufficient balance); confirm dialog closes, balance decreases, item appears in Inventory.
- [ ] Click Cancel in dialog; confirm dialog closes without purchase.
- [ ] Insufficient balance: Buy disabled; if somehow triggered, API returns error and dialog shows error.
- [ ] Inventory tab: list of owned items with count; copy states cosmetic-only.
- [ ] POST /marketplace/purchase without auth returns 401.
- [ ] Seed store: adds default items when table empty; idempotent.

---

## 9. Explanation of the Marketplace System

The **League Economy** gives managers a **prestige currency** balance (earned over time; no real money). They can spend it only on **cosmetic** items in the **Marketplace**: profile frames, league trophies, draft board skins, avatar items, team upgrades, and historical banners. Every item is tagged with a cosmetic category and optional sport restriction; there are **no** items that affect lineups, scoring, or matchups.

**Wallet:** Each manager has a wallet (created on first use) with currency balance and lifetime earned/spent. Purchases debit the balance and create a **PurchaseRecord**; **Inventory** is the list of purchased items (with count per item).

**Store:** The Store tab lists marketplace items with sport and category filters (all seven sports supported). Buying opens a **confirmation dialog**; on confirm, the purchase is processed (balance check, debit, record created) and the UI refreshes so the new balance and inventory are correct.

**Cosmetic resolution:** The **CosmeticResolver** decides which cosmetic to show per category for a manager (e.g. first owned profile frame). This is used for profile displays and is cosmetic-only. The system is designed so that **competitive balance is never affected** — only appearance and flair.
