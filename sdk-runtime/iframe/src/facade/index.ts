/**
 * Decision OS — Phase 7.12 Widget Host Facade.
 *
 * The single public entrypoint for embedding an AllFantasy widget: config
 * validation, nonce generation, iframe creation, the init/ready handshake,
 * lifecycle/error callbacks, and safe teardown — all behind
 * `createAllFantasyWidgetHost`. A SEPARATE barrel — NOT re-exported from
 * `sdk-runtime/iframe/src/index.ts` — for the same reason `browser/index.ts`
 * is separate: that main index is typechecked with no "dom" lib, and this
 * layer needs it (via `mountIframeWidget`'s `HTMLElement`/`HTMLIFrameElement`
 * dependency).
 */

export type {
  AllFantasyWidgetHostCallbacks,
  AllFantasyWidgetHostConfig,
  AllFantasyWidgetHost,
} from './types'

export { createAllFantasyWidgetHost } from './widgetHost'
