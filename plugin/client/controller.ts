/**
 * Panel controller: session-scoped loading, polling and artifact downloads.
 *
 * It is deliberately free of React and three.js. The panel subscribes through
 * `useSyncExternalStore`, and `controller.test.mjs` drives the same object with
 * a fake service caller to pin the behaviours that matter:
 *
 *  - switching session clears the previous run/model/report immediately;
 *  - a reply that arrives after a session switch is dropped, never applied;
 *  - polling stops at a terminal run state and resumes on manual refresh;
 *  - a mesh that does not bind to the requested candidate/STEP is rejected
 *    (the run and report stay visible, the canvas does not get fake geometry);
 *  - artifact downloads are chunked, hash-verified and refuse failure versions
 *    unless the caller explicitly confirms.
 */

import {
  AdapterError,
  classifyRunState,
  classifyServiceError,
  createRequestGate,
  fetchArtifactBytes,
  normalizeRunPayload,
  normalizeScenePayload,
  SERVICE_ARTIFACT,
  SERVICE_RUN,
  SERVICE_SCENE,
  type ArtifactRef,
  type FetchedArtifact,
  type RunVersion,
  type RunView,
  type SceneView,
  type ServiceCaller,
} from './adapter.ts'
import { decodeMeshPayload, MeshRejection, type DecodedMesh } from './mesh.ts'
import {
  describeDesignChange,
  reportFreshness,
  resolveDevicePose,
  resolvePlateThickness,
  buildEnvelopes,
  type EnvelopeBox,
  type EnvelopeCylinder,
  type PoseInfo,
  type ReportFreshness,
  type ReportView,
  type TaskView,
} from './scene-model.ts'

export type PanelPhase = 'no-session' | 'loading' | 'empty' | 'ready' | 'error'

export interface PanelNotice {
  kind: 'info' | 'warn' | 'error'
  title: string
  detail?: string
  code?: string
}

export interface SceneState {
  identity: { runId: string; candidateId: string; stepSha256: string }
  mesh: DecodedMesh | null
  meshRejection: { code: string; message: string; detail: string } | null
  task: TaskView | null
  scene: unknown
  report: ReportView | null
  /** Where the report shown next to this candidate came from. */
  reportSource: 'scene' | 'run-summary' | 'none'
  reportFreshness: ReportFreshness
  /** Run-visible identity at the time this complete scene/report was read. */
  reportFingerprint: string
  evidence: unknown
  design: unknown
  pose: PoseInfo
  envelopes: (EnvelopeBox | EnvelopeCylinder)[]
  envelopeNotes: string[]
  plateThickness: { thicknessMm: number | null; source: string }
}

export interface VersionRow {
  version: RunVersion
  report: ReportView | null
  freshness: ReportFreshness
  changeLines: string[]
}

export interface PanelSnapshot {
  phase: PanelPhase
  notice: PanelNotice | null
  sessionKey: string | undefined
  run: RunView | null
  versions: VersionRow[]
  selectedCandidateId: string | null
  selectedVersion: RunVersion | null
  scene: SceneState | null
  sceneError: PanelNotice | null
  /**
   * Measured-pose change between the selected candidate and the previous
   * version, once both poses have been observed in this session. The run list
   * carries no design summary, so this is the honest substitute: it compares
   * what the validator measured, not what a design document claimed.
   */
  poseChangeText: string | null
  busy: boolean
  autoRefresh: boolean
  polling: boolean
  lastUpdatedAt: number | null
  download: { artifactId: string; received: number; total: number | null } | null
  downloadError: PanelNotice | null
  /** P02-07 comparison baseline: the candidate chosen as "previous" (null = off). */
  compareBaselineId: string | null
  /** The baseline candidate's own scene (identity-checked, token-gated). */
  baselineScene: SceneState | null
  baselineNotice: PanelNotice | null
  baselineBusy: boolean
  /** Measured-centre delta between baseline and current, when both were measured. */
  comparePoseText: string | null
}

export interface ControllerOptions {
  call: ServiceCaller
  intervalMs?: number
  now?: () => number
  setTimer?: (handler: () => void, ms: number) => number
  clearTimer?: (handle: number) => void
  /** Delay before a projection hint triggers a re-read (throttle). */
  projectionThrottleMs?: number
}

const EMPTY_SNAPSHOT: PanelSnapshot = Object.freeze({
  phase: 'no-session',
  notice: null,
  sessionKey: undefined,
  run: null,
  versions: [],
  selectedCandidateId: null,
  selectedVersion: null,
  scene: null,
  sceneError: null,
  poseChangeText: null,
  busy: false,
  autoRefresh: true,
  polling: false,
  lastUpdatedAt: null,
  download: null,
  downloadError: null,
  compareBaselineId: null,
  baselineScene: null,
  baselineNotice: null,
  baselineBusy: false,
  comparePoseText: null,
})

/** Cheap identity of the report metadata, used to avoid needless re-renders. */
const sceneFingerprint = (run: RunView, version: RunVersion): string => JSON.stringify([
  run.runId, run.taskRevision, version.candidateId, version.stepSha256,
  version.report?.reportId ?? null, version.report?.overall ?? null,
  version.report?.createdAt ?? null, version.report?.validatorVersion ?? null,
  version.reportFileSha256, version.reportSha256,
])

function noticeFromError(error: AdapterError): PanelNotice {
  const kind = error.code === 'SERVICE_UNAVAILABLE' || error.code === 'NO_SESSION' ? 'info' : 'error'
  return { kind, title: error.message, detail: error.detail || undefined, code: error.code }
}

/**
 * The identity basis of a comparison baseline (P02-07/030). Every identity
 * field the run exposes about that candidate takes part — run id, frozen task
 * revision, candidate, STEP hash, lifecycle status and the run-visible report
 * identity (id / overall / created / validator / summary flag). A pending or
 * loaded baseline scene is bound to one fingerprint; when the run changes any
 * of it (a new STEP, a re-published report with the same STEP, a new task
 * revision), the scene no longer describes the live candidate and must not be
 * accepted or kept — no matter whether it is still in flight or on screen.
 */
const baselineFingerprint = (run: RunView, version: RunVersion): string =>
  JSON.stringify([
    run.runId,
    run.taskRevision,
    version.candidateId,
    version.stepSha256,
    version.status,
    version.parentCandidateId,
    version.report?.reportId ?? null,
    version.report?.overall ?? null,
    version.report?.createdAt ?? null,
    version.report?.validatorVersion ?? null,
    version.reportIsSummary,
    version.reportFileSha256,
    version.reportSha256,
  ])

export class FitplateController {
  private snapshot: PanelSnapshot = EMPTY_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private readonly gate = createRequestGate()
  private readonly call: ServiceCaller
  private readonly intervalMs: number
  private readonly now: () => number
  private readonly setTimer: (handler: () => void, ms: number) => number
  private readonly clearTimer: (handle: number) => void
  private readonly projectionThrottleMs: number

  private sessionKey: string | undefined
  /** Measured device centres seen in this session, per candidate (never invented). */
  private readonly poseHistory = new Map<string, [number, number]>()
  /** The candidate whose pose was displayed last, for the on-screen comparison. */
  private lastDisplayedPose: { candidateId: string; center: [number, number] } | null = null
  private runId: string | null = null
  private timer: number | null = null
  private disposed = false
  private inFlight: Promise<void> | null = null
  private inFlightToken = -1
  private sceneToken = 0
  private runRequestToken = 0
  private projectionTimer: number | null = null
  private lastProjectionRefresh = 0
  /** Bumped on every compare change: a late baseline answer from before is dropped. */
  private compareToken = 0
  /** Identity fingerprint (see `baselineFingerprint`) of the accepted/expected baseline scene. */
  private baselineFingerprint: string | null = null
  /** The freshest run this controller has fetched (the identity baseline verification reads). */
  private liveRun: RunView | null = null

  constructor(options: ControllerOptions) {
    this.call = options.call
    this.intervalMs = options.intervalMs ?? 1000
    this.now = options.now ?? (() => Date.now())
    this.setTimer =
      options.setTimer ??
      ((handler, ms) => globalThis.setTimeout(handler, ms) as unknown as number)
    this.clearTimer = options.clearTimer ?? ((handle) => globalThis.clearTimeout(handle))
    this.projectionThrottleMs = options.projectionThrottleMs ?? 400
  }

  // -- store ---------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): PanelSnapshot => this.snapshot

  private update(patch: Partial<PanelSnapshot>): void {
    if (this.disposed) return
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of [...this.listeners]) listener()
  }

  // -- session lifecycle ----------------------------------------------------

  /**
   * Bind to a session (or unbind). Any in-flight reply from the previous
   * session is invalidated by the generation gate, and the visible state is
   * cleared synchronously so old PASS badges cannot survive the switch.
   */
  setSession(sessionKey: string | undefined): void {
    if (this.disposed) return
    if (sessionKey === this.sessionKey) return
    this.gate.next()
    this.sessionKey = sessionKey
    this.runId = null
    this.poseHistory.clear()
    this.lastDisplayedPose = null
    this.sceneToken += 1
    this.compareToken += 1
    this.baselineFingerprint = null
    this.liveRun = null
    this.stopPolling()
    if (!sessionKey) {
      this.update({ ...EMPTY_SNAPSHOT, autoRefresh: this.snapshot.autoRefresh })
      return
    }
    this.update({
      phase: 'loading',
      notice: null,
      sessionKey,
      run: null,
      versions: [],
      selectedCandidateId: null,
      selectedVersion: null,
      scene: null,
      sceneError: null,
      busy: true,
      download: null,
      downloadError: null,
      lastUpdatedAt: null,
      polling: false,
      compareBaselineId: null,
      baselineScene: null,
      baselineNotice: null,
      baselineBusy: false,
      comparePoseText: null,
    })
    void this.refresh({ reason: 'session' })
  }

  dispose(): void {
    this.disposed = true
    this.gate.next()
    this.compareToken += 1
    this.stopPolling()
    if (this.projectionTimer !== null) {
      this.clearTimer(this.projectionTimer)
      this.projectionTimer = null
    }
    this.listeners.clear()
  }

  // -- polling --------------------------------------------------------------

  setAutoRefresh(enabled: boolean): void {
    if (this.disposed) return
    this.update({ autoRefresh: enabled })
    if (!enabled) this.stopPolling()
    else if (this.sessionKey) this.scheduleNext()
  }

  private scheduleNext(): void {
    if (this.disposed || this.timer !== null || !this.snapshot.autoRefresh) return
    if (this.snapshot.run && classifyRunState(this.snapshot.run.state) === 'terminal') {
      this.update({ polling: false })
      return
    }
    this.update({ polling: true })
    this.timer = this.setTimer(() => {
      this.timer = null
      void this.refresh({ reason: 'poll' }).then(() => this.scheduleNext())
    }, this.intervalMs)
  }

  stopPolling(): void {
    if (this.timer !== null) {
      this.clearTimer(this.timer)
      this.timer = null
    }
    if (this.snapshot.polling) this.update({ polling: false })
  }

  /** The host projection emitted a hint (e.g. a tool call finished) — re-read. */
  notifyProjection(): void {
    if (this.disposed || !this.sessionKey) return
    const elapsed = this.now() - this.lastProjectionRefresh
    if (elapsed >= this.projectionThrottleMs) {
      this.lastProjectionRefresh = this.now()
      void this.refresh({ reason: 'projection' })
      return
    }
    if (this.projectionTimer !== null) return
    this.projectionTimer = this.setTimer(() => {
      this.projectionTimer = null
      this.lastProjectionRefresh = this.now()
      void this.refresh({ reason: 'projection' })
    }, this.projectionThrottleMs - elapsed)
  }

  // -- loading --------------------------------------------------------------

  selectCandidate(candidateId: string): void {
    if (this.disposed || candidateId === this.snapshot.selectedCandidateId) return
    this.update({ selectedCandidateId: candidateId, comparePoseText: null })
    void this.refresh({ reason: 'selection', forceScene: true })
  }

  async refresh(options: { reason?: string; forceScene?: boolean; manual?: boolean } = {}): Promise<void> {
    if (this.disposed) return
    const sessionKey = this.sessionKey
    if (!sessionKey) {
      this.update({ phase: 'no-session', busy: false })
      return
    }
    // A manual refresh (or an explicit scene re-read) also re-tries a missing
    // baseline scene; automatic polls do not hammer a failing service.
    const compareRun = this.snapshot.run
    const baselineId = this.snapshot.compareBaselineId
    if (
      compareRun &&
      baselineId !== null &&
      this.snapshot.baselineScene === null &&
      !this.snapshot.baselineBusy &&
      (options.manual === true || options.forceScene === true)
    ) {
      const version = compareRun.versions.find((row) => row.candidateId === baselineId)
      if (version) {
        const fingerprint = baselineFingerprint(compareRun, version)
        this.compareToken += 1
        this.baselineFingerprint = fingerprint
        this.update({ baselineBusy: true })
        void this.loadBaselineScene(baselineId, compareRun.runId, fingerprint, this.compareToken, this.gate.token)
      }
    }
    // Coalesce overlapping reads for the same session generation so a poll tick
    // and a projection hint cannot double-fetch the 512 KiB scene response.
    // An explicit manual refresh keeps the right to run on its own.
    if (this.inFlight && this.inFlightToken === this.gate.token && options.forceScene !== true) {
      await this.inFlight
      return
    }
    const token = this.gate.token
    const task = this.runRefresh(sessionKey, token, options)
    this.inFlight = task
    this.inFlightToken = token
    try {
      await task
    } finally {
      if (this.inFlight === task) {
        this.inFlight = null
        this.inFlightToken = -1
      }
    }
  }

  private async runRefresh(
    sessionKey: string,
    token: number,
    options: { reason?: string; forceScene?: boolean; manual?: boolean },
  ): Promise<void> {
    this.update({ busy: true })
    const requestToken = ++this.runRequestToken
    const run = await this.loadRun(sessionKey, token, options, requestToken)
    if (!run) return
    const selected = this.pickVersion(run)
    if (!selected) {
      this.update({
        phase: 'empty',
        run,
        versions: [],
        selectedCandidateId: null,
        selectedVersion: null,
        scene: null,
        notice: {
          kind: 'info',
          title: `运行 ${run.runId} 尚无候选版本`,
          detail: '等待模型调用 fitplate_build_candidate 后刷新。',
        },
        busy: false,
        lastUpdatedAt: this.now(),
      })
      return
    }
    const versions = this.buildVersionRows(run)
    this.update({
      phase: 'ready',
      run,
      versions,
      selectedCandidateId: selected.candidateId,
      selectedVersion: selected,
      notice: run.note ? { kind: 'info', title: run.note } : this.snapshot.notice?.kind === 'error' ? null : this.snapshot.notice,
      busy: false,
      lastUpdatedAt: this.now(),
    })
    await this.loadScene(run, selected, token, options.forceScene === true)
    if (!this.isCurrent(token) || requestToken !== this.runRequestToken) return
    this.update({ poseChangeText: this.describePoseChange(selected) })
    if (!this.snapshot.autoRefresh) this.stopPolling()
    else this.scheduleNext()
  }

  /**
   * Compare the measured device centre of the selected candidate with the one
   * displayed before it — the comparison the person actually sees when switching
   * versions. Both centres must have been measured in this session; nothing is
   * inferred from design documents.
   */
  private describePoseChange(selected: RunVersion): string | null {
    const current = this.poseHistory.get(selected.candidateId)
    const previous = this.lastDisplayedPose
    if (!current) return null
    if (!previous || previous.candidateId === selected.candidateId) {
      this.lastDisplayedPose = { candidateId: selected.candidateId, center: current }
      return null
    }
    const [previousX, previousY] = previous.center
    const [x, y] = current
    this.lastDisplayedPose = { candidateId: selected.candidateId, center: current }
    const dx = x - previousX
    const dy = y - previousY
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return null
    const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(3))
    return `与上一个显示版本 ${previous.candidateId} 相比，设备实测中心 (${format(previousX)}, ${format(previousY)}) → (${format(
      x,
    )}, ${format(y)}) mm（G04 实测位姿；Δ=(${format(dx)}, ${format(dy)})）`
  }

  private async loadRun(
    sessionKey: string,
    token: number,
    options: { reason?: string },
    requestToken: number,
  ): Promise<RunView | null> {
    try {
      const raw = await this.call(SERVICE_RUN, { session_key: sessionKey })
      if (!this.isCurrent(token) || requestToken !== this.runRequestToken) return null
      const run = normalizeRunPayload(raw, { sessionKey })
      this.liveRun = run
      // A different run is a different comparison universe: the baseline and
      // its scene are dropped (never re-used across runs). Within the same run
      // the baseline is re-validated: a baseline candidate that disappeared,
      // or whose STEP/revision/report identity changed, resets or refetches it.
      if (this.runId !== null && this.runId !== run.runId) {
        this.resetCompare('运行已切换：版本对比已重置。')
      }
      this.runId = run.runId
      this.revalidateCompareBaseline(run)
      return run
    } catch (error) {
      if (!this.isCurrent(token) || requestToken !== this.runRequestToken) return null
      const adapterError = error instanceof AdapterError ? error : classifyServiceError(SERVICE_RUN, error)
      const empty =
        adapterError.code === 'SERVICE_UNAVAILABLE' ||
        adapterError.code === 'NO_SESSION' ||
        adapterError.code === 'NO_RUN'
      this.update({
        phase: empty ? 'empty' : 'error',
        run: null,
        versions: [],
        selectedCandidateId: null,
        selectedVersion: null,
        scene: null,
        notice: {
          ...noticeFromError(adapterError),
          kind: empty ? 'info' : 'error',
          title: adapterError.message,
        },
        busy: false,
        lastUpdatedAt: this.now(),
      })
      if (options.reason !== 'poll') this.stopPolling()
      return null
    }
  }

  private pickVersion(run: RunView): RunVersion | null {
    if (run.versions.length === 0) return null
    const wanted = this.snapshot.selectedCandidateId
    if (wanted) {
      const current = run.versions.find((version) => version.candidateId === wanted)
      if (current) return current
    }
    if (run.latestCandidateId) {
      const latest = run.versions.find((version) => version.candidateId === run.latestCandidateId)
      if (latest) return latest
    }
    return run.versions.at(-1) ?? null
  }

  private buildVersionRows(run: RunView): VersionRow[] {
    return run.versions.map((version, index) => {
      const report = version.report ?? null
      const previous = index > 0 ? run.versions[index - 1] : null
      const changeLines: string[] = []
      if (version.changeSummary) changeLines.push(version.changeSummary)
      if (previous) changeLines.push(...describeDesignChange(previous.designSummary, version.designSummary))
      return {
        version,
        report,
        freshness: reportFreshness(report, run.taskRevision, version.stepSha256, version.candidateId),
        changeLines,
      }
    })
  }

  private isCurrent(token: number): boolean {
    return !this.disposed && this.gate.isCurrent(token)
  }

  private async loadScene(run: RunView, version: RunVersion, token: number, force: boolean): Promise<void> {
    const current = this.snapshot.scene
    const fingerprint = sceneFingerprint(run, version)
    const sameIdentity =
      current !== null &&
      current.identity.runId === run.runId &&
      current.identity.candidateId === version.candidateId &&
      (!version.stepSha256 || current.identity.stepSha256 === version.stepSha256)
    // A run summary is only a locator. It must never replace complete measurements.
    // A new report (including validate after build on the SAME STEP) refetches the scene.
    if (sameIdentity && current.reportFingerprint === fingerprint && !force) return
    const sceneToken = ++this.sceneToken
    this.update({ scene: null, sceneError: null })
    const isLive = (): boolean => {
      const liveRun = this.snapshot.run
      const liveVersion = liveRun?.versions.find((item) => item.candidateId === version.candidateId)
      return this.isCurrent(token) && sceneToken === this.sceneToken
        && this.snapshot.selectedCandidateId === version.candidateId
        && liveRun !== null && liveVersion !== undefined && sceneFingerprint(liveRun, liveVersion) === fingerprint
    }
    try {
      const raw = await this.call(SERVICE_SCENE, {
        session_key: this.sessionKey,
        run_id: run.runId,
        candidate_id: version.candidateId,
      })
      if (!isLive()) return
      const sceneView: SceneView = normalizeScenePayload(raw, {
        runId: run.runId,
        candidateId: version.candidateId,
        stepSha256: version.stepSha256,
        reportId: version.report?.reportId,
        reportFileSha256: version.reportFileSha256,
        reportSha256: version.reportSha256,
      })
      this.update({ scene: this.buildSceneState(sceneView, version, run), sceneError: null })
      this.refreshComparePose()
    } catch (error) {
      if (!isLive()) return
      const adapterError =
        error instanceof AdapterError
          ? error
          : error instanceof MeshRejection
            ? new AdapterError('SHAPE', `网格被拒绝：${error.message}`, error.detail)
            : classifyServiceError(SERVICE_SCENE, error)
      this.update({
        scene: null,
        sceneError: {
          kind: 'error',
          title: adapterError.message,
          detail: adapterError.detail || undefined,
          code: adapterError.code,
        },
      })
    }
  }

  private buildSceneState(sceneView: SceneView, version: RunVersion, run: RunView): SceneState {
    const report = sceneView.report ?? version.report
    const reportSource: SceneState['reportSource'] = sceneView.report
      ? 'scene'
      : version.report
        ? 'run-summary'
        : 'none'
    const freshness: ReportFreshness = sceneView.binding?.verified === false
      ? { state: 'unverified-metadata', label: '产物完整性未核实，不能作为当前通过结果' }
      : reportFreshness(report, run.taskRevision, version.stepSha256, version.candidateId)
    let mesh: DecodedMesh | null = null
    let meshRejection: SceneState['meshRejection'] = null
    if (sceneView.meshBlocked) {
      // The service explained why it did not send geometry; keep the reason.
      meshRejection = {
        code: sceneView.meshBlocked.reason,
        message: sceneView.meshBlocked.message,
        detail: sceneView.meshBlocked.artifactId
          ? `可通过 fitplate.artifact 分块下载 ${sceneView.meshBlocked.artifactId}${
              sceneView.meshBlocked.totalBytes === null ? '' : `（${(sceneView.meshBlocked.totalBytes / 1024).toFixed(0)}KiB）`
            }`
          : '',
      }
    } else if (sceneView.mesh) {
      try {
        mesh = decodeMeshPayload(sceneView.mesh, {
          candidateId: sceneView.identity.candidateId,
          stepSha256: sceneView.identity.stepSha256,
        })
      } catch (error) {
        if (error instanceof MeshRejection) {
          meshRejection = { code: error.code, message: error.message, detail: error.detail }
        } else {
          throw error
        }
      }
    } else {
      meshRejection = { code: 'MESH_MISSING', message: '服务响应中没有网格，也没有说明原因', detail: '' }
    }
    const pose = resolveDevicePose({
      report,
      evidence: sceneView.evidence,
      design: sceneView.design,
      device: sceneView.device,
    })
    const plateThickness = resolvePlateThickness(report, sceneView.task)
    const plateTopZ = plateThickness.thicknessMm
    const { envelopes, notes } = buildEnvelopes({
      scene: sceneView.scene,
      task: sceneView.task,
      pose,
      plateTopZ,
    })
    if (pose.center) this.poseHistory.set(sceneView.identity.candidateId, [pose.center[0], pose.center[1]])
    return {
      identity: sceneView.identity,
      mesh,
      meshRejection,
      task: sceneView.task,
      scene: sceneView.scene,
      report,
      reportSource,
      reportFreshness: freshness,
      reportFingerprint: sceneFingerprint(run, version),
      evidence: sceneView.evidence,
      design: sceneView.design,
      pose,
      envelopes,
      envelopeNotes: notes,
      plateThickness,
    }
  }

  // -- downloads ------------------------------------------------------------

  /**
   * Download one registered artifact. A version whose report is not PASS is
   * marked as a failure build: the caller must confirm, and the suggested file
   * name carries a FAILED- prefix so a diagnostic copy cannot be mistaken for
   * an accepted artefact.
   */
  async readArtifact(
    artifact: ArtifactRef,
    options: { confirmedFailure?: boolean } = {},
  ): Promise<FetchedArtifact | null> {
    const snapshot = this.snapshot
    const run = snapshot.run
    const version = snapshot.selectedVersion
    if (!run || !version || !this.sessionKey) {
      this.update({ downloadError: { kind: 'error', title: '没有可下载的候选版本' } })
      return null
    }
    const report = snapshot.scene?.report ?? version.report
    const failing = report !== null && report.overall !== 'PASS'
    if (failing && !options.confirmedFailure) {
      this.update({
        downloadError: {
          kind: 'warn',
          title: `候选 ${version.candidateId} 未通过（overall=${report.overall}），下载已取消`,
          detail: '失败版本只用于诊断；确认后文件名会带 FAILED- 前缀。',
        },
      })
      return null
    }
    this.update({ download: { artifactId: artifact.artifactId, received: 0, total: artifact.bytes }, downloadError: null })
    try {
      const fetched = await fetchArtifactBytes(this.call, {
        sessionKey: this.sessionKey,
        runId: run.runId,
        candidateId: version.candidateId,
        artifactId: artifact.artifactId,
        expectedSha256: artifact.sha256,
        onProgress: (received, total) => {
          this.update({ download: { artifactId: artifact.artifactId, received, total } })
        },
      })
      this.update({ download: null })
      return fetched
    } catch (error) {
      const adapterError = error instanceof AdapterError ? error : classifyServiceError(SERVICE_ARTIFACT, error)
      this.update({ download: null, downloadError: noticeFromError(adapterError) })
      return null
    }
  }

  clearDownloadError(): void {
    this.update({ downloadError: null })
  }

  /** True when the selected version must be treated as a failure build. */
  isFailureVersion(): boolean {
    const report = this.snapshot.scene?.report ?? this.snapshot.selectedVersion?.report ?? null
    return report !== null && report.overall !== 'PASS'
  }

  // -- version comparison (P02-07) ------------------------------------------

  /** Choose (or clear) the comparison baseline; it must be a candidate of the current run. */
  setCompareBaseline(candidateId: string | null): void {
    if (this.disposed) return
    const run = this.snapshot.run
    if (candidateId !== null && (!run || !run.versions.some((version) => version.candidateId === candidateId))) {
      this.update({ baselineNotice: { kind: 'warn', title: '该版本不在本次运行中，不能作为对比基准。' } })
      return
    }
    if (candidateId === this.snapshot.compareBaselineId) return
    this.compareToken += 1
    if (candidateId === null || !run) {
      this.baselineFingerprint = null
      this.update({
        compareBaselineId: candidateId,
        baselineScene: null,
        baselineNotice: null,
        baselineBusy: false,
        comparePoseText: null,
      })
      return
    }
    const version = run.versions.find((row) => row.candidateId === candidateId) as RunVersion
    const fingerprint = baselineFingerprint(run, version)
    this.baselineFingerprint = fingerprint
    this.update({
      compareBaselineId: candidateId,
      baselineScene: null,
      baselineNotice: null,
      baselineBusy: true,
      comparePoseText: null,
    })
    void this.loadBaselineScene(candidateId, run.runId, fingerprint, this.compareToken, this.gate.token)
  }

  /** Drop the comparison (run/session change or an explicit clear). */
  private resetCompare(reason: string): void {
    this.compareToken += 1
    this.baselineFingerprint = null
    if (this.snapshot.compareBaselineId === null && this.snapshot.baselineScene === null) return
    this.update({
      compareBaselineId: null,
      baselineScene: null,
      baselineNotice: { kind: 'info', title: reason },
      baselineBusy: false,
      comparePoseText: null,
    })
  }

  /**
   * Re-verify the baseline against the run that was just read. The fingerprint
   * covers run id, frozen task revision, candidate, STEP hash and the
   * run-visible report identity; when it changes — including while a baseline
   * scene is still in flight — whatever was loaded or pending is void: its
   * token is bumped (so a late answer can never be accepted), the loaded scene
   * is cleared, and the scene is re-requested against the LIVE run. A failed
   * load at an unchanged fingerprint is retried only by the manual refresh
   * path, not by every 1 s poll.
   */
  private revalidateCompareBaseline(run: RunView): void {
    const baselineId = this.snapshot.compareBaselineId
    if (baselineId === null) return
    const version = run.versions.find((row) => row.candidateId === baselineId)
    if (!version) {
      this.resetCompare('对比基准已不在本次运行中：对比已重置。')
      return
    }
    const fingerprint = baselineFingerprint(run, version)
    if (this.baselineFingerprint === fingerprint) return
    this.compareToken += 1
    this.baselineFingerprint = fingerprint
    this.update({ baselineScene: null, baselineBusy: true, baselineNotice: null, comparePoseText: null })
    void this.loadBaselineScene(baselineId, run.runId, fingerprint, this.compareToken, this.gate.token)
  }

  /**
   * Load the baseline candidate's own scene through the same identity-checked
   * path as the main scene. The request is bound to (session generation,
   * compare token, run id, candidate, fingerprint), and completion is checked
   * against the LIVE run — the STEP hash and task revision used for
   * verification and freshness are the ones the current run exposes, never
   * the snapshot captured at request time. A late answer whose live identity
   * no longer matches is dropped outright (the invalidation path owns the
   * state); it can never surface as the main scene, as another candidate's
   * baseline, or as a verified comparison under new requirements.
   */
  private async loadBaselineScene(
    candidateId: string,
    expectedRunId: string,
    expectedFingerprint: string,
    compareToken: number,
    generation: number,
  ): Promise<void> {
    const live = (): { run: RunView; version: RunVersion } | null => {
      if (!this.isCurrent(generation)) return null
      if (compareToken !== this.compareToken) return null
      if (this.baselineFingerprint !== expectedFingerprint) return null
      if (this.snapshot.compareBaselineId !== candidateId) return null
      // The freshest run the controller has fetched — not necessarily the one
      // already copied into the snapshot: a scene answer can complete in the
      // same microtask batch as the run fetch that invalidated it, so the
      // snapshot may still hold the previous run at this instant.
      const run = this.liveRun
      if (!run || run.runId !== expectedRunId) return null
      const version = run.versions.find((row) => row.candidateId === candidateId)
      if (!version) return null
      if (baselineFingerprint(run, version) !== expectedFingerprint) return null
      return { run, version }
    }
    try {
      const raw = await this.call(SERVICE_SCENE, {
        session_key: this.sessionKey,
        run_id: expectedRunId,
        candidate_id: candidateId,
      })
      const context = live()
      if (!context) return
      const sceneView = normalizeScenePayload(raw, {
        runId: context.run.runId,
        candidateId,
        stepSha256: context.version.stepSha256,
        reportId: context.version.report?.reportId,
        reportFileSha256: context.version.reportFileSha256,
        reportSha256: context.version.reportSha256,
      })
      const state = this.buildSceneState(sceneView, context.version, context.run)
      if (!live()) return
      this.update({ baselineScene: state, baselineBusy: false, baselineNotice: null })
      this.refreshComparePose()
    } catch (error) {
      if (!live()) return
      const adapterError = error instanceof AdapterError ? error : classifyServiceError(SERVICE_SCENE, error)
      this.update({
        baselineScene: null,
        baselineBusy: false,
        baselineNotice: {
          kind: 'warn',
          title: `基准版本 ${candidateId} 的场景不可用：${adapterError.message}`,
          detail: '对比只展示报告差异；不会用示意网格替代真实 STEP 网格。',
          code: adapterError.code,
        },
      })
    }
  }

  /** Measured-centre delta between baseline and current — only when both were measured. */
  private refreshComparePose(): void {
    const baselineId = this.snapshot.compareBaselineId
    const currentId = this.snapshot.selectedCandidateId
    const baseline = baselineId !== null ? this.poseHistory.get(baselineId) : undefined
    const currentPose = currentId !== null ? this.poseHistory.get(currentId) : undefined
    if (baselineId === null || currentId === null || baselineId === currentId || !baseline || !currentPose) {
      if (this.snapshot.comparePoseText !== null) this.update({ comparePoseText: null })
      return
    }
    const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))
    const dx = currentPose[0] - baseline[0]
    const dy = currentPose[1] - baseline[1]
    const text =
      Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6
        ? `实测中心（各版本自身场景的 G04 位姿）：基准 ${baselineId} 与当前 ${currentId} 相同 (${format(currentPose[0])}, ${format(currentPose[1])}) mm`
        : `实测中心（各版本自身场景的 G04 位姿）：基准 ${baselineId} (${format(baseline[0])}, ${format(baseline[1])}) → 当前 ${currentId} (${format(currentPose[0])}, ${format(currentPose[1])}) mm，Δ=(${format(dx)}, ${format(dy)}) mm`
    this.update({ comparePoseText: text })
  }
}

