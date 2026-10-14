/**
 * Type-only mirror of the host contract the panel depends on.
 *
 * The real module (`@agnes/web-client`) is provided by the AGH import map at
 * runtime and is deliberately NOT vendored here — the build keeps it external.
 * This shim exists so `tsc -p tsconfig.client.json` can type check the panel
 * sources; it mirrors the published surface in
 * `agnes-harness/packages/web-client/src/{client-module,services,slots,registry}.ts`
 * (ClientContext, SessionService, ThemeService, AgnesClientService). Keep it in
 * sync with that file when the host contract changes.
 */
declare module '@agnes/web-client' {
  import type { ComponentType } from 'react'

  export type ClientServiceApi = Readonly<{
    call(name: string, input: Record<string, unknown>): Promise<unknown>
  }>

  export type SessionProjectionReadResult =
    | { status: 'available'; name: string; asOfSeq: number; stateVersion: number; value: unknown }
    | { status: 'unavailable'; name: string; error: { code: string; safeMessage: string } }

  export type SessionProjection = {
    read(name?: string): Promise<SessionProjectionReadResult>
    subscribe(listener: () => void): () => void
  }

  /** The SDK-backed session handle the host wraps (`services.ts` SessionClientHandle). */
  export interface SessionClientHandle {
    readonly id: string
    readonly listeners: Set<(...args: never[]) => void>
    projectUI(): Promise<unknown>
    prompt(input: unknown): Promise<unknown>
    steer(input: unknown): Promise<unknown>
    followUp(input: unknown): Promise<unknown>
    compact(instructions?: string): Promise<unknown>
    cancel(): Promise<void>
  }

  /** The official command surface: prompt, or followUp while the session is busy. */
  export interface SessionCommands {
    prompt(input: unknown): Promise<unknown>
    steer(input: unknown): Promise<unknown>
    followUp(input: unknown): Promise<unknown>
    compact(instructions?: string): Promise<unknown>
    cancel(): Promise<void>
  }

  export interface SessionService {
    readonly sessionId: string | undefined
    subscribe(listener: () => void): () => void
    getSnapshot(): string | undefined
    readonly projection: SessionProjection
    /** Present on hosts that expose the SDK session commands (current build). */
    readonly commands: SessionCommands
    readonly handle: SessionClientHandle | undefined
  }

  export interface ThemeService {
    readonly theme: 'light' | 'dark'
    subscribe(listener: () => void): () => void
    getSnapshot(): 'light' | 'dark'
  }

  export interface LocaleService {
    t(key: string, vars?: Record<string, string | number>): string
    bind(namespace: string): (key: string) => string
    subscribe(listener: () => void): () => void
    getSnapshot(): string
  }

  export interface WorkbenchPanelProps {
    sessionId?: string
  }

  export interface SlotRegistrationOptions {
    id?: string
    key?: string
    priority?: number
    order?: number
    label?: string | (() => string)
  }

  export interface SlotRegistry {
    register(
      name: 'workbench.panel',
      component: ComponentType<WorkbenchPanelProps>,
      options?: SlotRegistrationOptions,
    ): () => void
  }

  export interface ModuleIdentity {
    rowId?: string
    packageId: string
    revision: string
    allowedSlots?: readonly string[]
    slotCatalogVersion?: string
    contentDigest?: string
    publicConfig?: Readonly<Record<string, unknown>>
    services?: readonly string[]
  }

  export interface ClientContext {
    slots: SlotRegistry
    agnes: { services: ClientServiceApi }
    session: SessionService
    theme: ThemeService
    locale: LocaleService
    effect(callback: () => void | (() => void)): void
  }
}
