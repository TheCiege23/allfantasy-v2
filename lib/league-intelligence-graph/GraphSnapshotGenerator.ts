/**
 * GraphSnapshotGenerator — generates and persists league graph snapshots.
 * Alias for GraphSnapshotService; builds nodes/edges and writes to GraphNode/GraphEdge/LeagueGraphSnapshot.
 */

export {
  buildAndPersistSnapshot as generateSnapshot,
  buildAndPersistSnapshot,
  getSnapshot,
} from './GraphSnapshotService';
export type { BuildSnapshotInput } from './GraphSnapshotService';
