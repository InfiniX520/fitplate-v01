/**
 * FitPlate workbench.panel client module entry.
 *
 * Registered by the host as a native ESM browser module and applied with the
 * host's own `ClientContext`. The panel contributes exactly one slot entry —
 * `workbench.panel` — through `ctx.slots.register`; it does not touch the host
 * sidebar, does not create a second React root and does not invent a second
 * SDK/socket to reach the backend. Every backend read goes through
 * `ctx.agnes.services.call` from inside the panel controller.
 *
 * The service names below are the *only* three the descriptor must allow-list;
 * `scripts/build-client.mjs` prints them again for the package manifest.
 */

import type { ClientContext, ModuleIdentity } from '@agnes/web-client'
import { createFitplatePanel } from './panel.tsx'

export function apply(ctx: ClientContext, config: ModuleIdentity): void {
  const Panel = createFitplatePanel(ctx)
  ctx.slots.register('workbench.panel', Panel as never, {
    id: 'fitplate-workbench-panel',
    priority: 0,
    ...(config?.publicConfig?.label ? { label: String(config.publicConfig.label) } : {}),
  })
}
