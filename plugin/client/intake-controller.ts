/**
 * P02-05 intake controller: the session-scoped state machine behind the intake
 * form and the confirmation card. Deliberately free of React and of the DOM so
 * the Node tests can drive the real object with fake commands, a fake intake
 * service and a fake clock.
 *
 * Boundaries it enforces:
 *
 *  - sending goes through the host's own `SessionService.commands` only
 *    (`prompt`, or the official `followUp` when the session is busy); a host
 *    without those commands fails closed with a visible status. The host binds
 *    the command to the *current* session, so every send re-checks the
 *    generation/token immediately before dispatch: a session switch or an edit
 *    that lands while the busy state is still being read cancels the stale
 *    send — old bytes are never dispatched into a new session, and a
 *    superseded send never writes state back;
 *  - every `fitplate.intake` call uses exactly the closed input schema
 *    (`session_key`, `request_id`) — the host rejects any other key;
 *  - the request identity of a sent message is its byte SHA-256, computed by the
 *    UI from the bytes it shipped; the confirmable card only ever appears when
 *    the intake service reports *exactly* that identity back (request id,
 *    revision and attachment bytes hash all equal). A newer revision, a
 *    foreign hash or an unavailable service never produces a confirmable card;
 *  - editing any field expires the card immediately, and the next send is a new
 *    request_revision (bytes that differ from the last send);
 *  - the confirmation document is built from the service-verified identity at
 *    click time (after a final re-read), never from earlier display state;
 *  - session switches clear everything and every late asynchronous answer is
 *    dropped by a generation/token gate;
 *  - repeated clicks are debounced while an operation is in flight; failures
 *    keep the user's form.
 */

import {
  ATTACHMENT_MIME,
  CONFIRMATION_FILENAME,
  INTAKE_SERVICE,
  IntakeUiError,
  REQUEST_FILENAME,
  applyDemoPrefill,
  buildConfirmationDocument,
  buildFileBlock,
  buildRequestDocument,
  buildRequestPromptText,
  buildConfirmationPromptText,
  createEmptyForm,
  createRequestId,
  encodeDocument,
  parseIntakeServicePayload,
  validateForm,
  type ConfirmationIdentity,
  type FormCheck,
  type IntakeBlock,
  type IntakeFormState,
  type IntakeServicePayload,
  type IntakeStagedPayload,
  type IntakeTaskView,
} from './intake-model.ts'

export type IntakePhase =
  | 'no-session'
  | 'editing'
  | 'sending'
  | 'awaiting-draft'
  | 'draft'
  | 'confirming'
  | 'awaiting-commit'
  | 'committed'

export interface IntakeStatus {
  kind: 'info' | 'warn' | 'error' | 'pending'
  title: string
  detail?: string
  code?: string
}

export interface SentRequestRecord {
  requestId: string
  revision: number
  sha256: string
  base64: string
  byteLength: number
  sentAt: number
}

export interface IntakeDraftCard {
  requestId: string
  requestRevision: number
  outcome: string
  stagedAt: string | null
  attachmentRef: string
  attachmentSha256: string
  draftHash: string
  draft: Record<string, unknown> | null
  deviceCard: { id: string; sha256: string | null } | null
  task: IntakeTaskView
  notes: string | null
}

export interface ConfirmationRecord {
  sha256: string
  base64: string
  byteLength: number
  sentAt: number
  identity: ConfirmationIdentity
}

export interface FrozenRecord {
  taskId: string | null
  revision: number | null
}

export interface IntakeSnapshot {
  sessionKey: string | undefined
  phase: IntakePhase
  form: IntakeFormState
  validation: FormCheck
  sent: SentRequestRecord | null
  card: IntakeDraftCard | null
  /** True once any edit made the displayed card unusable (before a new send). */
  cardExpired: boolean
  confirmable: boolean
  confirmation: ConfirmationRecord | null
  frozen: FrozenRecord | null
  status: IntakeStatus | null
  busy: boolean
  polling: boolean
  lastCheckedAt: number | null
}

export interface IntakeCommands {
  prompt?: (blocks: IntakeBlock[]) => Promise<unknown>
  followUp?: (blocks: IntakeBlock[]) => Promise<unknown>
}

/**
 * Per-session store for the UNSENT input draft only. Persisting keeps the
 * user's typed form values across a page reload; it never stores cards, hashes,
 * confirmation or frozen state — after a restore the user must re-run 「让 AI
 * 检查这些要求」 and re-confirm, exactly as with fresh input.
 */
export interface IntakeDraftStore {
  read: (sessionKey: string) => string | null
  write: (sessionKey: string, value: string) => void
  clear: (sessionKey: string) => void
}

/** Drafts older than this are ignored (and cleared) instead of resurrecting stale input. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Stored JSON is untrusted input. Accept incomplete typed values, but require
// the form's full data shape before validation/rendering touches nested fields.
const DRAFT_FORM_SHAPE = createEmptyForm()
DRAFT_FORM_SHAPE.environment.cylinders = [{ id: '', x: '', y: '', radius: '', zMin: '', zMax: '' }]
DRAFT_FORM_SHAPE.environment.screwHeads = [{ holeIndex: '', radius: '', zMin: '', zMax: '' }]

function matchesDraftShape(value: unknown, shape: unknown): boolean {
  if (Array.isArray(shape)) {
    return Array.isArray(value) && value.every((item) => matchesDraftShape(item, shape[0]))
  }
  if (shape !== null && typeof shape === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    const actual = value as Record<string, unknown>
    const fields = Object.entries(shape)
    return Object.keys(actual).length === fields.length && fields.every(
      ([key, field]) => Object.hasOwn(actual, key) && matchesDraftShape(actual[key], field),
    )
  }
  return typeof value === typeof shape
}

export interface IntakeControllerOptions {
  call: (name: string, input: Record<string, unknown>) => Promise<unknown>
  commands: IntakeCommands
  /** Busy detection reads the host's own session UI projection (`opState !== null`). */
  isBusy: () => Promise<boolean>
  now?: () => number
  setTimer?: (handler: () => void, ms: number) => number
  clearTimer?: (handle: number) => void
  intervalMs?: number
  timeoutMs?: number
  createRequestId?: () => string
  /** Optional per-session unsent-draft store (input data only, never confirmation state). */
  draftStore?: IntakeDraftStore
}

const OUTCOME_STATUS: Record<string, { kind: IntakeStatus['kind']; title: string }> = {
  READY_TO_CONFIRM: { kind: 'info', title: '程序已整理出需求草稿，待你核对：输入完整一致' },
  NEEDS_INPUT: { kind: 'warn', title: '程序草稿待补充信息：请按问题修改输入后重新整理' },
  CONFLICTING_INPUT: { kind: 'warn', title: '程序草稿发现输入冲突：请先解决冲突' },
  UNSUPPORTED_REQUEST: { kind: 'warn', title: '程序草稿超出目前支持范围' },
}

/** Human label for an outcome value (diagnostics keep the raw token). */
const OUTCOME_TITLE: Record<string, string> = {
  READY_TO_CONFIRM: '输入完整一致（可核对确认）',
  NEEDS_INPUT: '待补充信息',
  CONFLICTING_INPUT: '输入冲突',
  UNSUPPORTED_REQUEST: '超出支持范围',
}

/** Service reasons that mean "still waiting", not "broken". */
const WAITING_REASONS = new Set(['REQUEST_NOT_STAGED', 'NO_STAGED_REQUEST_FOR_SESSION'])

/** Reasons that describe a service-side state problem: show it, stop polling. */
const STATE_ERROR_REASONS = new Set([
  'SESSION_MISMATCH',
  'SNAPSHOT_MISSING',
  'SNAPSHOT_STALE',
  'SNAPSHOT_TAMPERED',
  'SNAPSHOT_INVALID',
  'REGISTRY_INDEX_INVALID',
  'REGISTRY_NOT_AVAILABLE',
  'INTAKE_FILE_TOO_LARGE',
  'INTAKE_FILE_UNAVAILABLE',
])

function errorText(error: unknown): { message: string; code?: string } {
  if (error instanceof IntakeUiError) return { message: error.message, code: error.code }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const message = typeof record.message === 'string' && record.message ? record.message : String(error)
    const code = typeof record.code === 'string' ? record.code : undefined
    return code ? { message, code } : { message }
  }
  return { message: String(error) }
}

export class IntakeController {
  private snapshot: IntakeSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly call: IntakeControllerOptions['call']
  private readonly commands: IntakeCommands
  private readonly isBusy: () => Promise<boolean>
  private readonly now: () => number
  private readonly setTimer: (handler: () => void, ms: number) => number
  private readonly clearTimer: (handle: number) => void
  private readonly intervalMs: number
  private readonly timeoutMs: number
  private readonly newRequestId: () => string

  /** Bumped on every session switch: every in-flight answer from before is dropped. */
  private generation = 0
  /** Bumped on every send/confirm: earlier poll ticks become no-ops. */
  private token = 0
  private timer: number | null = null
  private pollKind: 'draft' | 'commit' | null = null
  private pollStartedAt = 0
  private pollToken = -1
  private disposed = false
  private readInFlight: Promise<void> | null = null
  private readonly draftStore: IntakeDraftStore | null

  constructor(options: IntakeControllerOptions) {
    this.call = options.call
    this.commands = options.commands
    this.isBusy = options.isBusy
    this.draftStore = options.draftStore ?? null
    this.now = options.now ?? (() => Date.now())
    this.setTimer =
      options.setTimer ?? ((handler, ms) => globalThis.setTimeout(handler, ms) as unknown as number)
    this.clearTimer = options.clearTimer ?? ((handle) => globalThis.clearTimeout(handle))
    this.intervalMs = options.intervalMs ?? 1500
    this.timeoutMs = options.timeoutMs ?? 120_000
    this.newRequestId = options.createRequestId ?? (() => createRequestId())
    const form = createEmptyForm()
    this.snapshot = {
      sessionKey: undefined,
      phase: 'no-session',
      form,
      validation: validateForm(form),
      sent: null,
      card: null,
      cardExpired: false,
      confirmable: false,
      confirmation: null,
      frozen: null,
      status: { kind: 'info', title: '请先在 AGH 中选择或创建一个会话' },
      busy: false,
      polling: false,
      lastCheckedAt: null,
    }
  }

  // -- store ---------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): IntakeSnapshot => this.snapshot

  private update(patch: Partial<IntakeSnapshot>): void {
    if (this.disposed) return
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of [...this.listeners]) listener()
  }

  private isCurrent(generation: number, token?: number): boolean {
    if (this.disposed || generation !== this.generation) return false
    if (token !== undefined && token !== this.token) return false
    return true
  }

  // -- session -------------------------------------------------------------

  /** Read the stored UNSENT draft for a session; anything odd is dropped and cleared. */
  private readDraft(sessionKey: string): IntakeFormState | null {
    if (!this.draftStore) return null
    let raw: string | null = null
    try {
      raw = this.draftStore.read(sessionKey)
    } catch {
      return null
    }
    if (raw === null) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape')
      const record = parsed as Record<string, unknown>
      if (Object.keys(record).length !== 2 || !matchesDraftShape(record.form, DRAFT_FORM_SHAPE)) throw new Error('shape')
      const savedAt = typeof record.savedAt === 'number' ? record.savedAt : 0
      const age = this.now() - savedAt
      if (!Number.isFinite(savedAt) || savedAt <= 0 || age < 0 || age > DRAFT_TTL_MS) throw new Error('stale')
      return record.form as IntakeFormState
    } catch {
      try {
        this.draftStore.clear(sessionKey)
      } catch { /* storage failures must not break the panel */ }
      return null
    }
  }

  /** Persist the current UNSENT form values for this session (input data only). */
  private saveDraft(): void {
    if (!this.draftStore || !this.snapshot.sessionKey) return
    try {
      this.draftStore.write(this.snapshot.sessionKey, JSON.stringify({ form: this.snapshot.form, savedAt: this.now() }))
    } catch { /* storage failures must not break editing */ }
  }

  /** Drop the stored draft once the session itself carries the truth (dispatched or frozen). */
  private clearDraft(): void {
    if (!this.draftStore || !this.snapshot.sessionKey) return
    try {
      this.draftStore.clear(this.snapshot.sessionKey)
    } catch { /* storage failures must not break the flow */ }
  }

  setSession(sessionKey: string | undefined): void {
    if (this.disposed || sessionKey === this.snapshot.sessionKey) return
    this.generation += 1
    this.token += 1
    this.stopTimer()
    this.pollKind = null
    // Restore ONLY input data from a previous unsent draft. Cards, sent state,
    // confirmation and frozen state always start empty and are re-derived from
    // the session/service — a reload never revives confirmation privileges.
    const restored = sessionKey ? this.readDraft(sessionKey) : null
    const form = restored ?? createEmptyForm()
    this.update({
      sessionKey,
      phase: sessionKey ? 'editing' : 'no-session',
      form,
      validation: validateForm(form),
      sent: null,
      card: null,
      cardExpired: false,
      confirmable: false,
      confirmation: null,
      frozen: null,
      status: sessionKey
        ? restored
          ? {
              kind: 'info',
              title: '已从本浏览器恢复未发送的填写',
              detail: '恢复的只是表单输入数据；请重新点击“让 AI 检查这些要求”生成草稿，此前的确认状态不会恢复。换一个浏览器不会带来这份草稿。',
            }
          : null
        : { kind: 'info', title: '请先在 AGH 中选择或创建一个会话' },
      busy: false,
      polling: false,
      lastCheckedAt: null,
    })
  }

  dispose(): void {
    this.disposed = true
    this.generation += 1
    this.stopTimer()
    this.listeners.clear()
  }

  // -- form ----------------------------------------------------------------

  /**
   * Replace the form state. Every edit — even one that lands while a send is
   * still encoding or while the busy state is being read — immediately
   * invalidates anything not yet dispatched (the generation/token bump makes
   * the stale continuation a no-op), expires the displayed card and abandons
   * any wait. Nothing about the previous input may reach the session after an
   * edit. An *already dispatched* message cannot be withdrawn; the status says
   * so honestly instead of pretending.
   */
  updateForm(next: IntakeFormState): void {
    if (this.disposed) return
    const validation = validateForm(next)
    const card = this.snapshot.card
    const previous = this.snapshot
    const active =
      previous.sent !== null ||
      card !== null ||
      previous.confirmation !== null ||
      previous.busy ||
      previous.polling ||
      previous.phase === 'sending' ||
      previous.phase === 'confirming' ||
      previous.phase === 'awaiting-draft' ||
      previous.phase === 'awaiting-commit'
    this.token += 1
    this.stopTimer()
    this.pollKind = null
    const dispatched = previous.sent !== null || previous.confirmation !== null
    this.update({
      form: next,
      validation,
      cardExpired: card !== null ? true : previous.cardExpired,
      confirmable: false,
      phase: previous.phase === 'no-session' ? 'no-session' : 'editing',
      busy: false,
      polling: false,
      status: active
        ? {
            kind: 'warn',
            title: dispatched ? '输入已修改：先前发送的内容已作废，确认卡已过期' : '输入已修改：尚未发送的旧输入已作废',
            detail: dispatched
              ? '请点击“让 AI 检查这些要求”发送新的需求版本；已发出的旧附件无法撤回，程序以会话中最新的请求附件为准。'
              : '请完成修改后点击“让 AI 检查这些要求”发送新的需求版本。',
          }
        : previous.status?.kind === 'warn' || previous.status?.kind === 'error'
          ? null
          : previous.status,
    })
    // Persist ONLY the input values so a page reload cannot lose unsent typing.
    // The draft is cleared the moment the session itself carries the truth
    // (a dispatched request or a registered freeze).
    this.saveDraft()
  }

  /** Load the supervised public Banner example into the visible form. */
  loadDemo(): void {
    if (this.disposed || this.snapshot.phase === 'no-session') return
    this.updateForm(applyDemoPrefill(this.snapshot.form))
    this.update({
      status: {
        kind: 'info',
        title: '已载入公开规格演示：厂商设备规格＋自设底座/环境，无实物验证',
        detail: '这些数值是可检查的表单值，来源保持“设计假设（非实测）”；可自行修改后重新点击“让 AI 检查这些要求”。',
      },
    })
  }

  // -- sending -------------------------------------------------------------

  private sendBlockedReason(): IntakeStatus | null {
    if (!this.snapshot.sessionKey) return { kind: 'info', title: '请先在 AGH 中选择或创建一个会话' }
    if (this.snapshot.busy) return null // debounce: treated as "ignore"
    if (!this.commands.prompt && !this.commands.followUp) {
      return {
        kind: 'error',
        title: '当前宿主未提供会话命令，无法发送输入',
        detail: '本面板只通过宿主会话的正式命令发送真实用户消息，不会绕过宿主直接调用后端。',
        code: 'SESSION_COMMANDS_UNAVAILABLE',
      }
    }
    return null
  }

  /**
   * Fire the blocks through the official commands; busy sessions use followUp.
   *
   * The host binds `commands.prompt/followUp` to whatever session is current at
   * call time, so this method must not trust the closure it was created in:
   * after the (possibly slow) busy-state read it re-checks the caller's
   * generation/token *immediately before dispatch*. A session switch or an edit
   * in between returns without dispatching anything. `onDispatched` runs
   * synchronously after the command call — state that claims "sent" is only
   * written once the message actually went out. An unreadable busy state is
   * never treated as readiness: it falls back to the direct prompt, and a
   * refusal (e.g. session busy) is surfaced by the caller.
   */
  private async send(
    blocks: IntakeBlock[],
    generation: number,
    token: number,
    onDispatched: () => void,
  ): Promise<void> {
    let busy = false
    try {
      busy = await this.isBusy()
    } catch {
      busy = false
    }
    if (!this.isCurrent(generation, token)) return
    const command = busy ? this.commands.followUp : this.commands.prompt
    if (!command) throw new IntakeUiError('SESSION_COMMANDS_UNAVAILABLE', '当前 Host 未提供会话命令')
    const result = command(blocks)
    onDispatched()
    await result
  }

  async submitRequest(): Promise<void> {
    if (this.disposed) return
    if (this.snapshot.busy) return
    if (this.snapshot.phase === 'awaiting-draft' && this.snapshot.sent) {
      // The previous send is still awaiting its draft; a repeated click just
      // re-reads the service instead of shipping a duplicate attachment.
      void this.refresh()
      return
    }
    const blocked = this.sendBlockedReason()
    if (blocked) {
      this.update({ status: blocked })
      return
    }
    const form = this.snapshot.form
    const validation = validateForm(form)
    if (!validation.ok && !validation.canSubmitForClarification) {
      this.update({
        validation,
        status: {
          kind: 'error',
          title: `表单还有 ${validation.issues.length} 项待修正，尚未发送`,
          detail: validation.issues[0]?.message,
        },
      })
      return
    }

    const generation = this.generation
    const token = ++this.token
    this.update({ busy: true, phase: 'sending', status: { kind: 'pending', title: '正在通过会话发送请求附件…' } })
    try {
      // Revision policy: the request id is stable; the revision only advances
      // when the serialized bytes differ from the last send. Same bytes are a
      // plain retry; changed bytes are always a new revision.
      const previous = this.snapshot.sent
      const requestId = previous?.requestId ?? this.newRequestId()
      let revision = previous?.revision ?? 1
      let document = buildRequestDocument(form, { requestId, revision })
      let encoded = await encodeDocument(document)
      if (previous && encoded.sha256 !== previous.sha256) {
        revision += 1
        document = buildRequestDocument(form, { requestId, revision })
        encoded = await encodeDocument(document)
      }
      if (!this.isCurrent(generation, token)) return

      const sent: SentRequestRecord = {
        requestId,
        revision,
        sha256: encoded.sha256,
        base64: encoded.base64,
        byteLength: encoded.byteLength,
        sentAt: this.now(),
      }
      const blocks: IntakeBlock[] = [
        buildFileBlock(REQUEST_FILENAME, ATTACHMENT_MIME, encoded.base64),
        { type: 'text', text: buildRequestPromptText({ requestId, revision }) },
      ]
      // `prompt` resolves at turn end — possibly minutes from now. The send is
      // fire-and-forget for UI state; a rejection is surfaced honestly. The
      // "sent" state is written only inside onDispatched, so a send that is
      // superseded while the busy state is being read leaves zero trace.
      const sendPromise = this.send(blocks, generation, token, () => {
        this.update({
          sent,
          card: null,
          cardExpired: false,
          confirmable: false,
          confirmation: null,
          frozen: null,
          phase: 'awaiting-draft',
          busy: false, // the send action itself is done; the turn runs in the background (phase says so)
          status: { kind: 'pending', title: '已发送请求附件，等待程序登记草稿…', detail: `需求版本 ${revision}` },
        })
        // The session now carries the request; the local unsent draft is redundant.
        this.clearDraft()
        this.startPolling('draft', token)
      })
      sendPromise.catch((error) => this.onSendFailure(generation, token, error))
    } catch (error) {
      if (!this.isCurrent(generation, token)) return
      const { message, code } = errorText(error)
      this.update({
        busy: false,
        phase: 'editing',
        status: { kind: 'error', title: `发送失败：${message}`, ...(code ? { code } : {}) },
      })
    }
  }

  private onSendFailure(generation: number, token: number, error: unknown): void {
    if (!this.isCurrent(generation, token)) return
    const phase = this.snapshot.phase
    if (phase === 'awaiting-commit') {
      // The confirmation message's turn ended in failure: the freeze may never
      // have happened. Say so — never claim a state the registry cannot show.
      const { message, code } = errorText(error)
      this.update({
        status: {
          kind: 'warn',
          title: `确认消息的回合以失败结束：${message}`,
          detail: '若程序实际收到确认并冻结，登记状态稍后会显示结果；可点“刷新状态”观察。',
          ...(code ? { code } : {}),
        },
      })
      return
    }
    if (phase === 'confirming') {
      // The confirmation never went out (e.g. the host lost its command surface
      // mid-flight): nothing was dispatched, so the card stays confirmable and
      // the failure is shown as-is.
      const { message, code } = errorText(error)
      this.update({
        busy: false,
        phase: 'draft',
        status: { kind: 'error', title: `确认发送未成功：${message}`, ...(code ? { code } : {}) },
      })
      return
    }
    if (phase !== 'sending' && phase !== 'awaiting-draft') return // late turn-end noise; state already settled
    const { message, code } = errorText(error)
    this.stopTimer()
    this.pollKind = null
    this.update({
      busy: false,
      polling: false,
      phase: 'editing',
      status: {
        kind: 'error',
        title: `发送未确认成功：${message}`,
        detail: '表单内容已保留。若后台实际收到了附件，会话中的最新输入仍以附件字节为准。',
        ...(code ? { code } : {}),
      },
    })
  }

  // -- confirmation --------------------------------------------------------

  /**
   * Confirm the displayed card. A final service re-read happens first; the
   * confirmation document is built from that verified identity, and any
   * mismatch cancels the click without sending anything.
   */
  async confirm(): Promise<void> {
    if (this.disposed || this.snapshot.busy) return
    const snapshot = this.snapshot
    const sent = snapshot.sent
    const card = snapshot.card
    if (snapshot.phase !== 'draft' || !snapshot.confirmable || !sent || !card) {
      if (snapshot.phase === 'draft' && card && card.outcome !== 'READY_TO_CONFIRM') {
        this.update({
          status: {
            kind: 'warn',
            title: '当前草稿还不能确认',
            detail: '“输入完整一致”只表示可以核对确认，不表示有解或已通过；请先按问题补齐输入。',
          },
        })
      }
      return
    }
    const blocked = this.sendBlockedReason()
    if (blocked) {
      this.update({ status: blocked })
      return
    }

    const generation = this.generation
    const token = ++this.token
    this.update({ busy: true, phase: 'confirming', status: { kind: 'pending', title: '正在核对当前草稿…' } })
    try {
      // The final re-read uses exactly the closed service input schema
      // (`session_key` + `request_id`); the host rejects any other key.
      const payload = await this.readIntake({ request_id: sent.requestId })
      if (!this.isCurrent(generation, token)) return
      if (!payload.found) {
        this.update({
          busy: false,
          phase: 'editing',
          confirmable: false,
          cardExpired: true,
          status: {
            kind: 'warn',
            title: '尚未登记与本轮发送一致的草稿',
            detail: `服务状态：${payload.reason}（${payload.message}）；未生成确认文件。`,
            code: payload.reason,
          },
        })
        return
      }
      const refusal = this.inspectFinalRead(sent, card, payload)
      if (refusal) {
        this.stopTimer()
        this.pollKind = null
        this.update({
          busy: false,
          polling: false,
          phase: 'editing',
          confirmable: false,
          cardExpired: true,
          sent: refusal.drift ? this.adoptServiceRevision(sent, payload) : sent,
          status: { kind: 'warn', title: refusal.message, detail: '未生成确认文件；请重新点击“让 AI 检查这些要求”。' },
        })
        return
      }

      const identity: ConfirmationIdentity = {
        requestId: payload.requestId,
        requestRevision: payload.requestRevision,
        draftHash: payload.draftHash,
        requestAttachmentRef: payload.attachmentRef,
        requestAttachmentSha256: payload.attachmentSha256,
      }
      const document = buildConfirmationDocument(identity)
      const encoded = await encodeDocument(document)
      if (!this.isCurrent(generation, token)) return
      const blocks: IntakeBlock[] = [
        buildFileBlock(CONFIRMATION_FILENAME, ATTACHMENT_MIME, encoded.base64),
        {
          type: 'text',
          text: buildConfirmationPromptText({
            requestId: identity.requestId,
            requestRevision: identity.requestRevision,
            draftHash: identity.draftHash,
            requestAttachmentRef: identity.requestAttachmentRef,
            requestAttachmentSha256: identity.requestAttachmentSha256,
            confirmationSha256: encoded.sha256,
          }),
        },
      ]
      const sendPromise = this.send(blocks, generation, token, () => {
        this.update({
          confirmation: {
            sha256: encoded.sha256,
            base64: encoded.base64,
            byteLength: encoded.byteLength,
            sentAt: this.now(),
            identity,
          },
          phase: 'awaiting-commit',
          busy: false,
          status: { kind: 'pending', title: '确认已发送：稍后会出现宿主审批（第二道）；等待程序登记冻结结果…' },
        })
        this.startPolling('commit', token)
      })
      sendPromise.catch((error) => this.onSendFailure(generation, token, error))
    } catch (error) {
      if (!this.isCurrent(generation, token)) return
      const { message, code } = errorText(error)
      this.update({
        busy: false,
        phase: 'draft',
        status: { kind: 'error', title: `确认失败：${message}`, code },
      })
    }
  }

  /**
   * The final re-read must reproduce the *whole* confirmable identity: the
   * exact sent bytes, the displayed attachment ref, the displayed draft hash
   * and a draft that is still READY_TO_CONFIRM. Anything else — a drifted
   * revision, a different ref (the attachment contract binds ref to the bytes,
   * so a same-ref content change cannot legitimately occur), a recompiled
   * draft, a downgraded outcome — is a refusal, never a confirmation. `drift`
   * marks mismatches where our bytes are no longer the current revision for
   * this id, so the caller adopts the service revision before the next send.
   */
  private inspectFinalRead(
    sent: SentRequestRecord,
    card: IntakeDraftCard,
    payload: IntakeStagedPayload,
  ): { message: string; drift: boolean } | null {
    if (payload.requestId !== sent.requestId) {
      return { message: `查询服务返回的是另一个请求（${payload.requestId}），本面板不会把它当作当前草稿`, drift: true }
    }
    if (payload.requestRevision !== sent.revision || payload.attachmentSha256 !== sent.sha256) {
      return {
        message: `会话中的当前请求已更新（需求版本 ${payload.requestRevision}），与本面板发送的输入不一致；旧输入不能被确认`,
        drift: true,
      }
    }
    if (payload.outcome !== 'READY_TO_CONFIRM') {
      return { message: `当前草稿状态已变为“${OUTCOME_TITLE[payload.outcome] ?? payload.outcome}”，不能确认`, drift: false }
    }
    if (payload.attachmentRef !== card.attachmentRef) {
      return { message: '当前请求附件的引用与显示卡片不一致；不能确认', drift: false }
    }
    if (payload.draftHash !== card.draftHash) {
      return { message: '当前草稿已变化，请刷新后再决定', drift: false }
    }
    return null
  }

  /**
   * After the service reports bytes/revision we did not send, our bytes are no
   * longer the current revision for this id: adopt the service's revision (so
   * ids stay monotonic) and blank the hash so the next send always bumps the
   * revision — never re-using the revision a foreign byte content now occupies.
   */
  private adoptServiceRevision(sent: SentRequestRecord, payload: IntakeStagedPayload): SentRequestRecord {
    return { ...sent, revision: Math.max(sent.revision, payload.requestRevision), sha256: '' }
  }

  // -- polling -------------------------------------------------------------

  private stopTimer(): void {
    if (this.timer !== null) {
      this.clearTimer(this.timer)
      this.timer = null
    }
  }

  private startPolling(kind: 'draft' | 'commit', token: number): void {
    this.stopTimer()
    this.pollKind = kind
    this.pollToken = token
    this.pollStartedAt = this.now()
    this.update({ polling: true })
    this.schedulePoll()
  }

  private schedulePoll(): void {
    if (this.disposed || this.pollKind === null) return
    this.timer = this.setTimer(() => {
      this.timer = null
      void this.pollTick()
    }, this.intervalMs)
  }

  private async pollTick(): Promise<void> {
    if (this.disposed || this.pollKind === null) return
    const kind = this.pollKind
    const token = this.pollToken
    const outcome = await this.readOnce(kind, token)
    if (!this.isCurrent(this.generation, token) || this.pollKind !== kind) return
    if (outcome === 'settled') {
      this.pollKind = null
      this.update({ polling: false })
      return
    }
    if (this.now() - this.pollStartedAt >= this.timeoutMs) {
      this.pollKind = null
      this.update({
        polling: false,
        status: {
          kind: 'warn',
          title: kind === 'draft' ? '等待程序登记超时' : '尚未观察到冻结结果',
          detail:
            kind === 'draft'
              ? '登记状态还没有给出与本面板发送字节完全一致的草稿；可稍后点“刷新状态”，或重新点击“让 AI 检查这些要求”。'
              : '确认已发出，但登记状态尚未出现对应任务修订；提交时的真实重扫仍是最终边界，稍后可刷新状态。',
        },
      })
      return
    }
    this.schedulePoll()
  }

  /** One manual re-read; safe to call any time (e.g. from a projection hint). */
  async refresh(): Promise<void> {
    if (this.disposed || !this.snapshot.sessionKey) return
    if (this.pollKind !== null && this.pollTimerActive()) return // a timed tick owns the flow
    if (this.readInFlight) return this.readInFlight
    const phase = this.snapshot.phase
    // Never re-read after an edit ('editing') or while sending: a late service
    // answer must not resurrect a card for input the user has already changed.
    const kind =
      this.pollKind ??
      (phase === 'awaiting-commit' || phase === 'committed'
        ? 'commit'
        : (phase === 'draft' || phase === 'awaiting-draft') && this.snapshot.sent
          ? 'draft'
          : null)
    if (!kind) return
    const task = this.readOnce(kind, this.token).then((outcome) => {
      if (outcome === 'settled' && this.pollKind === kind) {
        this.pollKind = null
        this.update({ polling: false })
      }
    })
    this.readInFlight = task
    try {
      await task
    } finally {
      if (this.readInFlight === task) this.readInFlight = null
    }
  }

  private pollTimerActive(): boolean {
    return this.timer !== null
  }

  /**
   * One service read with exactly the closed input schema — `session_key` plus
   * optionally `request_id`. The narrowed type makes a misspelled key a
   * compile-time error, not a host refusal at runtime.
   */
  private async readIntake(input: { request_id?: string } = {}): Promise<IntakeServicePayload> {
    const raw = await this.call(INTAKE_SERVICE, { session_key: this.snapshot.sessionKey, ...input })
    return parseIntakeServicePayload(raw)
  }

  /**
   * One identity read. Returns 'settled' when this kind of wait is finished
   * (matched, stale or state-broken), 'waiting' to try again.
   */
  private async readOnce(kind: 'draft' | 'commit', token: number): Promise<'settled' | 'waiting'> {
    const sent = this.snapshot.sent
    if (!sent) return 'settled'
    try {
      const payload = await this.readIntake({ request_id: sent.requestId })
      if (!this.isCurrent(this.generation, token)) return 'settled'
      this.update({ lastCheckedAt: this.now() })
      if (!payload.found) {
        if (WAITING_REASONS.has(payload.reason)) return 'waiting'
        this.update({
          status: {
            kind: 'error',
            title: '查询服务报告的登记状态异常，暂不能核对草稿',
            detail: `${payload.reason}：${payload.message}`,
            code: payload.reason,
          },
        })
        return 'settled'
      }
      if (kind === 'draft') return this.handleDraftPayload(sent, payload)
      return this.handleCommitPayload(payload)
    } catch (error) {
      if (!this.isCurrent(this.generation, token)) return 'settled'
      const { message, code } = errorText(error)
      this.update({
        status: {
          kind: 'error',
          title: `暂时读不到草稿状态：${message}`,
          detail: '未观察到可核对的状态；稍后将重试或请手动刷新。',
          ...(code ? { code } : {}),
        },
      })
      return 'waiting'
    }
  }

  private handleDraftPayload(sent: SentRequestRecord, payload: IntakeStagedPayload): 'settled' | 'waiting' {
    if (payload.requestId !== sent.requestId) {
      // The workspace's newest staged request for this session is a different
      // id than the one this panel sent: not ours to confirm.
      this.update({
        status: { kind: 'warn', title: '会话中登记的草稿来自另一份请求，本面板不会显示为可确认' },
      })
      return 'settled'
    }
    if (payload.requestRevision < sent.revision && this.snapshot.phase === 'awaiting-draft') {
      // Staging follows the model's tool call: until that call runs, a read for the stable
      // request id can still return the PREVIOUS revision. It cannot supersede the newer
      // bytes we just sent. Keep their identity for the real approval, and keep waiting;
      // no older card is confirmable. Equal-revision hash drift and newer revisions still
      // follow the fail-closed mismatch path below.
      this.update({
        confirmable: false,
        status: {
          kind: 'pending',
          title: `等待程序整理本次需求版本 ${sent.revision}…`,
          detail: `查询服务暂时仍是较早版本 ${payload.requestRevision}；不会用旧草稿替代本次输入或用于确认。`,
        },
      })
      return 'waiting'
    }
    if (payload.requestRevision !== sent.revision || payload.attachmentSha256 !== sent.sha256) {
      // A newer revision (or different bytes) replaced this panel's input: any earlier
      // confirmation/frozen result belonged to a draft that no longer exists, so it is cleared
      // here too — a stale frozen record must never keep reading as "committed".
      this.update({
        phase: 'editing',
        confirmable: false,
        cardExpired: this.snapshot.card !== null,
        confirmation: null,
        frozen: null,
        sent: this.adoptServiceRevision(sent, payload),
        status: {
          kind: 'warn',
          title: `会话中的当前需求已更新为版本 ${payload.requestRevision}（或附件字节不一致）`,
          detail: '本面板显示的本轮输入已被更新的输入取代；不会显示为可确认，请修改后重新整理。',
        },
      })
      return 'settled'
    }
    const card: IntakeDraftCard = {
      requestId: payload.requestId,
      requestRevision: payload.requestRevision,
      outcome: payload.outcome,
      stagedAt: payload.stagedAt,
      attachmentRef: payload.attachmentRef,
      attachmentSha256: payload.attachmentSha256,
      draftHash: payload.draftHash,
      draft: payload.draft,
      deviceCard: payload.deviceCard,
      task: payload.task,
      notes: payload.notes,
    }
    // The service recompiled the draft (same sent request identity, a NEW draft_hash): the previous
    // confirmation/frozen were bound to the old draft and can never be committed now, so they are
    // cleared while the sent request identity is preserved. A fresh confirmable card is shown.
    const previousCard = this.snapshot.card
    const draftChanged = previousCard !== null && previousCard.draftHash !== payload.draftHash
    const outcomeStatus = OUTCOME_STATUS[payload.outcome] ?? { kind: 'warn' as const, title: `未知草稿状态：${payload.outcome}` }
    this.update({
      phase: 'draft',
      card,
      cardExpired: false,
      busy: false,
      confirmable: payload.outcome === 'READY_TO_CONFIRM',
      ...(draftChanged ? { confirmation: null, frozen: null } : {}),
      status: {
        kind: outcomeStatus.kind,
        title: outcomeStatus.title,
        detail:
          payload.outcome === 'READY_TO_CONFIRM'
            ? draftChanged
              ? '程序已按当前输入重新编译草稿（draft_hash 变化）；先前对该草稿的确认/冻结已作废，请重新核对当前草稿。'
              : '“输入完整一致”只表示可以核对确认，不表示有解或已通过验证。'
            : '请按下方程序给出的缺失/冲突修改输入，然后重新点击“让 AI 检查这些要求”（会生成新的需求版本）。',
      },
    })
    return 'settled'
  }

  private handleCommitPayload(payload: IntakeStagedPayload): 'settled' | 'waiting' {
    const confirmation = this.snapshot.confirmation
    if (!confirmation) return 'settled'
    // The draft was recompiled after we confirmed (same request id, a different draft_hash): the
    // old confirmation can never be committed, so it must not keep being read as "committed".
    // Refuse explicitly and clear the stale confirmation; a new draft card is shown.
    if (payload.draftHash !== confirmation.identity.draftHash) {
      this.stopTimer()
      this.pollKind = null
      this.update({
        phase: 'editing',
        polling: false,
        confirmable: false,
        cardExpired: this.snapshot.card !== null,
        confirmation: null,
        frozen: null,
        status: {
          kind: 'warn',
          title: '草稿在确认后已重新编译（draft_hash 变化），先前确认作废',
          detail: '旧的确认文件不再对应当前草稿；请重新整理并核对当前草稿后再确认。',
        },
      })
      return 'settled'
    }
    const match = payload.task.revisions.find(
      (row) =>
        row.requestRevision === confirmation.identity.requestRevision && row.draftHash === confirmation.identity.draftHash,
    )
    if (!match) return 'waiting'
    this.update({
      phase: 'committed',
      frozen: { taskId: payload.task.taskId, revision: match.revision },
      status: {
        kind: 'info',
        title: `程序已登记冻结：任务修订 ${match.revision ?? '未知'}`,
        detail: '该结果来自只读登记查询；几何运行与验证请继续在下方或对话中推进（任务身份见诊断区）。',
      },
    })
    // Frozen in the session registry: no unsent draft remains for this input.
    this.clearDraft()
    return 'settled'
  }
}
