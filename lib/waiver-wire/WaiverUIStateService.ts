/**
 * WaiverUIStateService — default filter/sort state and reset helpers for waiver wire UI.
 */

import {
  DEFAULT_SEARCH,
  DEFAULT_POSITION,
  DEFAULT_TEAM,
  DEFAULT_STATUS,
  DEFAULT_SORT,
  DEFAULT_TAB,
} from "./WaiverFilterResolver"
import type { WaiverTabId } from "./WaiverFilterResolver"

export type WaiverFilterState = {
  search: string
  position: string
  team: string
  status: string
  sort: string
  activeTab: WaiverTabId
}

export function getDefaultWaiverFilterState(): WaiverFilterState {
  return {
    search: DEFAULT_SEARCH,
    position: DEFAULT_POSITION,
    team: DEFAULT_TEAM,
    status: DEFAULT_STATUS,
    sort: DEFAULT_SORT,
    activeTab: DEFAULT_TAB as WaiverTabId,
  }
}

export function resetWaiverFilters(setters: {
  setSearch: (v: string) => void
  setPosition: (v: string) => void
  setTeam: (v: string) => void
  setStatus: (v: string) => void
  setSort: (v: string) => void
}): void {
  const d = getDefaultWaiverFilterState()
  setters.setSearch(d.search)
  setters.setPosition(d.position)
  setters.setTeam(d.team)
  setters.setStatus(d.status)
  setters.setSort(d.sort)
}

export function getWaiverWatchlistStorageKey(leagueId: string): string {
  return `allfantasy.waiver.watchlist.${leagueId}`
}
