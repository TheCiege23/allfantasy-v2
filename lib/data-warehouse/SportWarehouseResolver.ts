/**
 * SportWarehouseResolver — sport-safe resolution for warehouse reads/writes.
 * Ensures sport-specific data is normalized without mixing incompatible structures.
 */

import { WAREHOUSE_SPORTS, normalizeSportForWarehouse, type WarehouseSport } from './types'

export function getWarehouseSports(): readonly WarehouseSport[] {
  return WAREHOUSE_SPORTS
}

export function resolveSportForWarehouse(sport: string): WarehouseSport {
  return normalizeSportForWarehouse(sport)
}

/**
 * Returns whether the warehouse can store/query data for this sport.
 */
export function isSportSupported(sport: string): boolean {
  const u = sport?.toUpperCase?.() ?? ''
  return WAREHOUSE_SPORTS.includes(u as WarehouseSport)
}

/**
 * Map UI/API sport strings to warehouse sport (e.g. "nfl" -> "NFL").
 */
export function mapToWarehouseSport(input: string): WarehouseSport {
  return normalizeSportForWarehouse(input)
}
