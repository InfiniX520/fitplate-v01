/**
 * FitPlate workbench panel (Plan1 section 11): one desktop surface with four
 * regions — task & frozen constraints, 3D view, G01–G08 validation list, and
 * versions/actions.
 *
 * The panel is a normal `workbench.panel` client module: it registers through
 * the host slot registry, talks to the backend only through
 * `ctx.agnes.services.call`, and follows the host session/theme/locale services.
 * It never writes into host DOM, never keeps a second copy of the state after a
 * session switch, and never presents a stale or unverified result as PASS.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { ClientContext } from '@agnes/web-client'
import { BUILD_INFO, describeBuild } from './build-info.ts'
import { IntakeController } from './intake-controller.ts'
import { IntakeRegion } from './intake-form.tsx'
import { DeliveryCard } from './delivery-card.tsx'
import { deliveryFacts } from '../src/report-facts.mjs'
import type { ArtifactRef } from './adapter.ts'
import {
  FitplateController,
  type PanelSnapshot,
  type SceneState,
  type VersionRow,
} from './controller.ts'
import {
  buildCompareView,
  checkObjects,
  checkSummary,
  CHECK_IDS,
  CHECK_TITLES,
  describeProvenance,
  describeReason,
  failingObjects,
  formatValue,
  orderedChecks,
  parseProvenance,
  summarizePairs,
  type CheckId,
  type CompareSide,
  type CompareView,
  type PairClearance,
  type ReportCheck,
  type ReportFreshness,
  type ReportView,
  type SummaryLine,
  type TaskView,
} from './scene-model.ts'
import { WorkbenchViewer, type CameraPreset, type VisibilityState } from './viewer.ts'

export interface WorkbenchPanelProps {
  sessionId?: string
}

const STATUS_LABEL: Record<string, string> = {
  PASS: '通过',
  FAIL: '失败',
  UNKNOWN: '未确定',
  BORDERLINE: '临界',
}

/** Short badge text for a report that is not current (full label goes in the meta line). */
const FRESHNESS_BADGE: Record<string, string> = {
  'stale-revision': '按旧要求',
  'stale-binding': '报告绑定失效',
  'unverified-metadata': '报告未核实',
}

const PANEL_STATE_TEXT: Record<string, (snapshot: PanelSnapshot) => string> = {
  'no-session': () => '等待会话：请先在 AGH 中选择或创建一个会话',
  loading: () => '正在读取 FitPlate 运行数据…',
  empty: (snapshot) => snapshot.notice?.title ?? '当前会话还没有 FitPlate 运行记录',
  error: (snapshot) => snapshot.notice?.title ?? '读取运行数据失败',
  ready: (snapshot) => `运行 ${snapshot.run?.runId ?? ''} · ${snapshot.run?.state ?? ''}`,
}

function StatusBadge({ status }: { status: string }): ReactNode {
  const tone = status.toLowerCase()
  return (
    <span className={`fp-badge fp-badge-${tone}`} data-status={status}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

/** All raw key=value entries of one block (nothing truncated away). */
function RawKeyValues({ values, empty }: { values: Record<string, unknown>; empty: string }): ReactNode {
  const entries = Object.entries(values)
  if (entries.length === 0) return <span className="fp-muted">{empty}</span>
  return (
    <span className="fp-chips">
      {entries.map(([key, value]) => (
        <span className="fp-chip" key={key} title={key}>
          {key}=<b>{formatValue(value)}</b>
        </span>
      ))}
    </span>
  )
}

function SummaryChips({ lines }: { lines: SummaryLine[] }): ReactNode {
  return (
    <div className="fp-summary">
      {lines.map((line) => (
        <span
          key={line.label}
          className={`fp-measure${line.tone ? ` fp-measure-${line.tone}` : ''}`}
          title={line.hint ?? undefined}
        >
          {line.label} <b>{line.value}</b>
        </span>
      ))}
    </div>
  )
}

function checkRowClass(check: ReportCheck | null): string {
  if (!check) return 'fp-check fp-check-missing'
  return `fp-check fp-check-${check.status.toLowerCase()}`
}

export function createFitplatePanel(ctx: ClientContext) {
  return function FitplatePanel(props: WorkbenchPanelProps): ReactNode {
    const sessionId = useSyncExternalStore(ctx.session.subscribe, ctx.session.getSnapshot)
    const effectiveSession = sessionId ?? props.sessionId
    const theme = useSyncExternalStore(ctx.theme.subscribe, () => ctx.theme.theme)

    const call = useMemo(
      () => (name: string, input: Record<string, unknown>) => ctx.agnes.services.call(name, input),
      [ctx],
    )
    const controller = useMemo(() => new FitplateController({ call }), [call])
    const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)

    // P02-05 intake: the form + confirmation card. Sending is only ever through
    // the host's own SessionService commands; busy sessions use followUp.
    const intakeController = useMemo(() => {
      const commands = ctx.session.commands
      // Per-session UNSENT input draft (input data only) in browser storage:
      // a page reload keeps typed values; it never carries cards/hashes/
      // confirmation across — those are always re-derived from the session.
      const draftStore = {
        read: (sessionKey: string): string | null => {
          try {
            return globalThis.localStorage?.getItem(`fitplate.intake-draft.v1.${sessionKey}`) ?? null
          } catch {
            return null
          }
        },
        write: (sessionKey: string, value: string): void => {
          try {
            globalThis.localStorage?.setItem(`fitplate.intake-draft.v1.${sessionKey}`, value)
          } catch { /* storage full/blocked: editing continues without persistence */ }
        },
        clear: (sessionKey: string): void => {
          try {
            globalThis.localStorage?.removeItem(`fitplate.intake-draft.v1.${sessionKey}`)
          } catch { /* ignore */ }
        },
      }
      return new IntakeController({
        call,
        commands: {
          ...(commands && typeof commands.prompt === 'function' ? { prompt: (blocks) => commands.prompt(blocks) } : {}),
          ...(commands && typeof commands.followUp === 'function' ? { followUp: (blocks) => commands.followUp(blocks) } : {}),
        },
        isBusy: async () => {
          const result = (await ctx.session.projection.read()) as
            | { status?: string; value?: { opState?: unknown } | null }
            | null
            | undefined
          const opState = result && result.status === 'available' ? result.value?.opState : undefined
          return opState !== null && opState !== undefined
        },
        draftStore,
      })
    }, [call, ctx])
    const intakeSnapshot = useSyncExternalStore(intakeController.subscribe, intakeController.getSnapshot)
    const [workbenchCollapsed, setWorkbenchCollapsed] = useState(false)
    const [workbenchFocused, setWorkbenchFocused] = useState(false)
    const [intakeCollapsedOverride, setIntakeCollapsedOverride] = useState<boolean | null>(null)
    const workspaceId = useId()
    useEffect(() => {
      const frozen = intakeSnapshot.frozen
      if (intakeSnapshot.phase === 'committed' && frozen?.taskId === snapshot.run?.task?.taskId
          && frozen?.revision === snapshot.run?.taskRevision) setIntakeCollapsedOverride(null)
    }, [intakeSnapshot.phase, intakeSnapshot.frozen, snapshot.run?.task?.taskId, snapshot.run?.taskRevision])


    useEffect(() => {
      setWorkbenchCollapsed(false)
      setWorkbenchFocused(false)
      setIntakeCollapsedOverride(null)
    }, [effectiveSession])

    useEffect(() => {
      controller.setSession(effectiveSession)
      intakeController.setSession(effectiveSession)
    }, [controller, intakeController, effectiveSession])

    useEffect(
      () => () => {
        controller.dispose()
        intakeController.dispose()
      },
      [controller, intakeController],
    )

    useEffect(() => {
      const projection = ctx.session.projection
      if (!projection || typeof projection.subscribe !== 'function') return undefined
      return projection.subscribe(() => {
        controller.notifyProjection()
        void intakeController.refresh()
      })
    }, [ctx, controller, intakeController])

    // -- viewer ------------------------------------------------------------
    const containerRef = useRef<HTMLDivElement | null>(null)
    const viewerRef = useRef<WorkbenchViewer | null>(null)
    const [viewerNotice, setViewerNotice] = useState<string | null>(null)
    const [animationLabel, setAnimationLabel] = useState<string | null>(null)
    const [visibility, setVisibility] = useState<VisibilityState>({
      plate: true,
      device: true,
      connector: true,
      environment: true,
    })
    const previousPoseRef = useRef<{ candidateId: string; center: [number, number] } | null>(null)
    const animationTimer = useRef<number | null>(null)

    useEffect(() => {
      const container = containerRef.current
      if (!container) return undefined
      const viewer = new WorkbenchViewer({
        container,
        onError: (message) => setViewerNotice(message),
      })
      viewerRef.current = viewer
      if (!viewer.available) setViewerNotice('当前浏览器环境不支持 WebGL，三维视图不可用（其余数据仍可查看）')
      // Read-only debug handle for browser acceptance and for the supervisor:
      // it exposes the live viewer/controller instead of hiding state in the DOM.
      ;(globalThis as unknown as Record<string, unknown>).__fitplateDebug = {
        viewer,
        controller,
        intakeController,
        build: BUILD_INFO,
      }
      return () => {
        viewer.dispose()
        viewerRef.current = null
        const handle = (globalThis as unknown as Record<string, unknown>).__fitplateDebug as
          | { viewer?: WorkbenchViewer }
          | undefined
        if (handle?.viewer === viewer) delete (globalThis as unknown as Record<string, unknown>).__fitplateDebug
      }
    }, [controller, intakeController])

    const scene = snapshot.scene
    const highlightIds = useMemo(() => failingObjects(scene?.report ?? null), [scene?.report])
    const [highlight, setHighlight] = useState<string[]>([])

    // P02-07 comparison (pure view model): each side is built from that
    // candidate's own facts — its design document, its own report, its own
    // measured pair evidence — never from the other side's values.
    const [referenceOn, setReferenceOn] = useState(true)
    const compareView: CompareView = useMemo(() => {
      const selected = snapshot.selectedVersion
      const selectedRow = snapshot.versions.find((row) => row.version.candidateId === snapshot.selectedCandidateId) ?? null
      const selectedFreshness: ReportFreshness =
        scene && selectedRow ? scene.reportFreshness : (selectedRow?.freshness ?? { state: 'unverified-metadata', label: '报告未核实' })
      const currentSide: CompareSide = {
        candidateId: selected?.candidateId ?? '（未选择）',
        stepSha256: selected?.stepSha256 ?? null,
        report: scene?.report ?? selected?.report ?? null,
        freshness: selectedFreshness,
        pairs: summarizePairs(scene?.evidence ?? null),
        design: scene?.design ?? null,
      }
      const baselineId = snapshot.compareBaselineId
      const baselineRow = baselineId ? (snapshot.versions.find((row) => row.version.candidateId === baselineId) ?? null) : null
      const baselineSide: CompareSide | null = baselineId
        ? {
            candidateId: baselineId,
            stepSha256: baselineRow?.version.stepSha256 ?? null,
            report: snapshot.baselineScene?.report ?? baselineRow?.report ?? null,
            freshness:
              snapshot.baselineScene?.reportFreshness ??
              baselineRow?.freshness ?? { state: 'unverified-metadata', label: '报告未核实' },
            pairs: summarizePairs(snapshot.baselineScene?.evidence ?? null),
            design: snapshot.baselineScene?.design ?? null,
          }
        : null
      return buildCompareView({ baseline: baselineSide, current: currentSide })
    }, [snapshot, scene])

    // Per-pair clearance evidence, used to show G06's real minimum free gap
    // (allowed support contacts, e.g. the device resting on the plate, excluded).
    const pairClearance = useMemo(() => summarizePairs(scene?.evidence ?? null), [scene?.evidence])
    // The run summary strips the task's provenance block; the frozen scene (also
    // part of the run input) keeps it, so the source row can still say where the
    // numbers come from.
    const sceneProvenance = useMemo(() => parseProvenance(scene?.scene), [scene?.scene])

    // A click-selected highlight belongs to the report it was taken from: when
    // the displayed candidate changes, drop it rather than showing the old
    // version's failing objects on the new one.
    const selectedCandidateId = scene?.identity.candidateId ?? null
    useEffect(() => {
      setHighlight([])
    }, [selectedCandidateId])

    useEffect(() => {
      const viewer = viewerRef.current
      if (!viewer || !viewer.available) return
      viewer.setMesh(scene?.mesh ?? null)
      viewer.setEnvelopes(scene?.envelopes ?? [])
      viewer.setVisibility(visibility)
      viewer.setHighlight(highlight.length > 0 ? highlight : highlightIds)
    }, [scene, visibility, highlight, highlightIds])

    // The comparison baseline is only ever the baseline candidate's own real
    // STEP mesh (ghost overlay). Camera state is untouched by this call; a
    // missing baseline mesh clears the overlay instead of drawing anything.
    useEffect(() => {
      const viewer = viewerRef.current
      if (!viewer || !viewer.available) return
      const baselineMesh = snapshot.baselineScene?.mesh ?? null
      viewer.setReferenceMesh(referenceOn && baselineMesh ? baselineMesh : null)
    }, [snapshot.baselineScene, referenceOn])

    // Version change: animate the moving envelopes from where they were to
    // where they are now — explicitly labelled as a schematic, not a motion plan.
    useEffect(() => {
      const viewer = viewerRef.current
      if (!viewer || !viewer.available || !scene) return
      const center = scene.pose.center
      const previous = previousPoseRef.current
      if (previous && center && previous.candidateId !== scene.identity.candidateId) {
        // The viewer starts at the previous pose relative to the new pose.
        // The label describes the physical displacement in the opposite direction.
        const startOffsetX = previous.center[0] - center[0]
        const startOffsetY = previous.center[1] - center[1]
        const displacementX = center[0] - previous.center[0]
        const displacementY = center[1] - previous.center[1]
        if (Math.abs(startOffsetX) > 1e-6 || Math.abs(startOffsetY) > 1e-6) {
          const label = `变化示意 ${previous.candidateId} → ${scene.identity.candidateId}：设备位移 Δ=(${displacementX.toFixed(2)}, ${displacementY.toFixed(2)}) mm（仅示意，不是无碰撞运动规划）`
          viewer.animatePoseDelta({ dx: startOffsetX, dy: startOffsetY, dz: 0, label })
          setAnimationLabel(label)
          if (animationTimer.current !== null) globalThis.clearTimeout(animationTimer.current)
          animationTimer.current = globalThis.setTimeout(() => {
            setAnimationLabel(null)
            animationTimer.current = null
          }, 2600)
        }
      }
      previousPoseRef.current = center
        ? { candidateId: scene.identity.candidateId, center: [center[0], center[1]] }
        : null
    }, [scene])

    useEffect(
      () => () => {
        if (animationTimer.current !== null) globalThis.clearTimeout(animationTimer.current)
      },
      [],
    )

    const applyCamera = useCallback((preset: CameraPreset) => {
      viewerRef.current?.setCamera(preset)
    }, [])

    const focusCheck = useCallback(
      (checkId: CheckId) => {
        const objects = checkObjects(scene?.report ?? null, checkId)
        setHighlight(objects)
        if (objects.length > 0) viewerRef.current?.focusObjects(objects)
      },
      [scene?.report],
    )

    const toggleVisibility = useCallback((key: keyof VisibilityState) => {
      setVisibility((current) => {
        const next = { ...current, [key]: !current[key] }
        viewerRef.current?.setVisibility(next)
        return next
      })
    }, [])

    // -- downloads ---------------------------------------------------------
    const [downloadBusy, setDownloadBusy] = useState<string | null>(null)

    const downloadArtifact = useCallback(
      async (artifact: ArtifactRef) => {
        const run = snapshot.run
        const version = snapshot.selectedVersion
        if (!run || !version) return
        const report = scene?.report ?? version.report
        const failing = report !== null && report.overall !== 'PASS'
        if (failing) {
          const confirmed = globalThis.confirm(
            `候选 ${version.candidateId} 未通过（overall=${report?.overall}）。失败版本只能用于诊断；下载文件名会带 FAILED- 前缀。仍要下载吗？`,
          )
          if (!confirmed) return
        }
        setDownloadBusy(artifact.artifactId)
        try {
          const fetched = await controller.readArtifact(artifact, { confirmedFailure: failing })
          if (!fetched) return
          const prefix = failing ? 'FAILED-' : ''
          const name = `${prefix}${run.runId}-${version.candidateId}-${artifact.name}`
          const mime = artifact.mime ?? guessMime(artifact.name)
          const blob = new Blob([fetched.bytes as unknown as BlobPart], { type: mime })
          const url = globalThis.URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = name
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 10_000)
        } finally {
          setDownloadBusy(null)
        }
      },
      [controller, scene?.report, snapshot.run, snapshot.selectedVersion],
    )

    const downloadReportCopy = useCallback(
      (report: ReportView, failing: boolean) => {
        const run = snapshot.run
        const version = snapshot.selectedVersion
        if (!run || !version) return
        const prefix = failing ? 'FAILED-' : ''
        const payload = JSON.stringify(report.raw, null, 2)
        const blob = new Blob([payload], { type: 'application/json' })
        const url = globalThis.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${prefix}${run.runId}-${version.candidateId}-report-response-copy.json`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 10_000)
      },
      [snapshot.run, snapshot.selectedVersion],
    )

    /** Baseline report response copy — explicitly labelled, never the current one. */
    const downloadBaselineReportCopy = useCallback(() => {
      const report = snapshot.baselineScene?.report
      const baselineId = snapshot.compareBaselineId
      const run = snapshot.run
      if (!report || !baselineId || !run) return
      const payload = JSON.stringify(report.raw, null, 2)
      const blob = new Blob([payload], { type: 'application/json' })
      const url = globalThis.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `BASELINE-${run.runId}-${baselineId}-report-response-copy.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 10_000)
    }, [snapshot.baselineScene, snapshot.compareBaselineId, snapshot.run])

    // -- render ------------------------------------------------------------
    const phaseText = PANEL_STATE_TEXT[snapshot.phase]?.(snapshot) ?? snapshot.phase
    const run = snapshot.run
    const task = scene?.task ?? run?.task ?? null
    const report = scene?.report ?? snapshot.selectedVersion?.report ?? null
    // A new request or confirmation always stays visible, even if the previous
    // run's workbench was folded. Folding only changes presentation, never facts.
    const inputActive = intakeCollapsedOverride === false || intakeSnapshot.busy || ['sending', 'awaiting-draft', 'draft', 'confirming', 'awaiting-commit'].includes(intakeSnapshot.phase)
    const showInput = !run || inputActive
    const layout = workbenchCollapsed ? 'collapsed' : workbenchFocused ? 'focused' : showInput ? 'input' : 'balanced'
    const accepted = scene?.reportFreshness.state === 'current' && deliveryFacts(report?.raw, {
      candidateId: snapshot.selectedVersion?.candidateId ?? null,
      taskRevision: run?.taskRevision ?? null,
      stepSha256: snapshot.selectedVersion?.stepSha256 ?? null,
      reportId: snapshot.selectedVersion?.report?.reportId ?? null,
    }).accepted

    return (
      <section
        className={`fitplate-panel fp-theme-${theme}`}
        data-fitplate="panel"
        data-phase={snapshot.phase}
        data-session={effectiveSession ?? ''}
        data-build-hash={BUILD_INFO.buildHash}
        // P3-05: a run exists, so the folded-input workspace layout applies (the
        // 3D canvas, result card and downloads must all be visible together).
        data-run-stage={snapshot.run !== null ? 'true' : 'false'}
        data-layout={layout}
        data-input-active={showInput ? 'true' : 'false'}
      >
        <header className="fp-header">
          <div className="fp-title">
            <strong>FitPlate <span className="fp-brand-cn">装得上</span></strong>
            <span className="fp-muted" title={run ? `运行 ${run.runId}` : undefined}>
              {run ? `候选 ${snapshot.selectedCandidateId ?? '未选择'} · 任务修订 ${run.taskRevision ?? '未知'}` : 'FDM 传感器安装板 · 装配检查'}
            </span>
          </div>
          <div className="fp-header-actions">
            <span className="fp-phase" data-fitplate="phase">
              {run ? ({ COMPLETED: '本轮已结束', RUNNING: '设计进行中', FAILED: '本轮未通过', BLOCKED: '需要处理' }[run.state] ?? '正在处理') : '从下方开始'}
            </span>
            <button type="button" data-fitplate="workbench-focus" aria-pressed={workbenchFocused && !workbenchCollapsed}
              onClick={() => { setWorkbenchCollapsed(false); setWorkbenchFocused((value) => !value) }}>
              {workbenchFocused && !workbenchCollapsed ? '恢复分屏' : '放大面板'}
            </button>
            <button type="button" data-fitplate="workbench-toggle" aria-expanded={!workbenchCollapsed} aria-controls={workspaceId}
              onClick={() => setWorkbenchCollapsed((value) => !value)}>
              {workbenchCollapsed ? '展开面板' : '收起面板'}
            </button>
            {run && !inputActive ? (
              <IntakeRegion controller={intakeController} sessionKey={effectiveSession} disabled={!effectiveSession}
                hasRun={true} compact={true} collapsedOverride={true} onCollapsedChange={setIntakeCollapsedOverride} />
            ) : null}
            <button type="button" onClick={() => void controller.refresh({ manual: true, forceScene: true })}>
              刷新
            </button>
            <details className="fp-refresh-settings">
              <summary>刷新设置</summary>
              <label className="fp-toggle">
              <input
                type="checkbox"
                checked={snapshot.autoRefresh}
                onChange={(event) => controller.setAutoRefresh(event.target.checked)}
              />
              自动刷新（1s，终态停止）
              </label>
            {snapshot.lastUpdatedAt ? (
              <span className="fp-muted">更新 {new Date(snapshot.lastUpdatedAt).toLocaleTimeString()}</span>
            ) : null}
            </details>
          </div>
        </header>

        {snapshot.notice?.kind === 'error' ? (
          <p className="fp-alert fp-alert-error" role="alert" data-fitplate="notice">
            {snapshot.notice.title}
            {snapshot.notice.detail ? <span className="fp-detail">（{snapshot.notice.detail}）</span> : null}
          </p>
        ) : null}
        {snapshot.sceneError || snapshot.downloadError ? (
          <p className="fp-alert fp-alert-error" role="alert" data-fitplate="visible-workbench-error">
            {snapshot.sceneError?.title ?? snapshot.downloadError?.title}
            {(snapshot.sceneError?.detail ?? snapshot.downloadError?.detail) || ''}
          </p>
        ) : null}

        {showInput ? <IntakeRegion
          controller={intakeController}
          sessionKey={effectiveSession}
          disabled={!effectiveSession}
          hasRun={snapshot.run !== null}
          collapsedOverride={intakeCollapsedOverride}
          onCollapsedChange={setIntakeCollapsedOverride}
        /> : null}

        {!showInput && !workbenchCollapsed ? <p className="fp-run-guidance" role="status">{run?.state === 'COMPLETED'
          ? '先看右侧结论和下载；要看 AI 如何修正，展开下方「版本与操作记录」。'
          : 'AI 正在设计或处理检查结果。上方聊天显示实际进度；若出现权限卡，请核对后允许一次。'}</p> : null}
        <div className="fp-grid" id={workspaceId}>
          <ViewerRegion
            containerRef={containerRef}
            viewerNotice={viewerNotice}
            scene={scene}
            visibility={visibility}
            onToggleVisibility={toggleVisibility}
            onCamera={applyCamera}
            onResetCamera={() => viewerRef.current?.resetCamera()}
            animationLabel={animationLabel}
            report={report}
            currentHighlight={highlight.length > 0 ? highlight : highlightIds}
            compareLegend={
              snapshot.compareBaselineId && snapshot.selectedCandidateId && snapshot.compareBaselineId !== snapshot.selectedCandidateId
                ? {
                    baselineId: snapshot.compareBaselineId,
                    currentId: snapshot.selectedCandidateId,
                    referenceAvailable: Boolean(snapshot.baselineScene?.mesh),
                    referenceOn: referenceOn && Boolean(snapshot.baselineScene?.mesh),
                  }
                : null
            }
            onToggleReference={setReferenceOn}
          />
          <ChecksRegion
            accepted={accepted}
            delivery={run && snapshot.selectedVersion ? (
              <DeliveryCard
                run={run} version={snapshot.selectedVersion} report={report}
                freshness={scene?.reportFreshness ?? null} change={snapshot.poseChangeText}
                busy={downloadBusy !== null} onDownload={downloadArtifact}
              />
            ) : null}
            report={report}
            freshness={scene?.reportFreshness ?? null}
            source={scene?.reportSource ?? 'none'}
            pairs={pairClearance}
            onFocus={focusCheck}
          />
          <div className="fp-secondary" data-fitplate="secondary-regions">
            <details className="fp-secondary-disclosure" data-fitplate="task-disclosure" key={`task-${effectiveSession}`}>
              <summary>任务与冻结约束{run ? ` · 修订 ${run.taskRevision ?? '未知'}` : ''}</summary>
              <TaskRegion task={task} run={run} snapshot={snapshot} sceneProvenance={sceneProvenance} />
            </details>
            <details className="fp-secondary-disclosure" data-fitplate="versions-disclosure" key={`versions-${effectiveSession}`}>
              <summary>版本与操作记录 · {snapshot.versions.length} 个候选
                {snapshot.versions.some((row) => row.report && row.report.overall !== 'PASS') ? <span className="fp-warn">（含未通过版本）</span> : null}
              </summary>
              <VersionsRegion
            snapshot={snapshot}
            sceneFreshness={scene?.reportFreshness ?? null}
            compareView={compareView}
            onSetBaseline={(candidateId) => controller.setCompareBaseline(candidateId)}
            onDownloadBaselineReport={downloadBaselineReportCopy}
            onSelect={(candidateId) => controller.selectCandidate(candidateId)}
            onDownload={downloadArtifact}
            onDownloadReportCopy={downloadReportCopy}
            downloadBusy={downloadBusy}
              />
            </details>
          </div>
        </div>
      </section>
    )
  }
}

function guessMime(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.step') || lower.endsWith('.stp')) return 'model/step'
  if (lower.endsWith('.stl')) return 'model/stl'
  if (lower.endsWith('.json')) return 'application/json'
  return 'application/octet-stream'
}

// ---------------------------------------------------------------------------
// Region 1: task & constraints
// ---------------------------------------------------------------------------

function TaskRegion({
  task,
  run,
  snapshot,
  sceneProvenance,
}: {
  task: TaskView | null
  run: PanelSnapshot['run']
  snapshot: PanelSnapshot
  /** Provenance recorded in the frozen scene input (task summaries omit it). */
  sceneProvenance: TaskView['provenance']
}): ReactNode {
  if (!task) {
    return (
      <section className="fp-region fp-region-task" data-fitplate="task-region">
        <h2>任务与约束</h2>
        <p className="fp-empty">尚未读取到冻结任务。{snapshot.phase === 'empty' ? '当前会话没有可展示的运行。' : ''}</p>
        {snapshot.notice && snapshot.notice.kind !== 'error' ? (
          <p className="fp-muted">{snapshot.notice.title}</p>
        ) : null}
      </section>
    )
  }
  const plate = task.plate
  const baseHoles = task.baseHoles
  const sensor = task.sensor
  const requirements = task.requirements
  const tolerances = task.tolerances
  const source = describeProvenance(task.provenance ?? sceneProvenance)

  return (
    <section className="fp-region fp-region-task" data-fitplate="task-region">
      <h2>任务与约束</h2>
      {task.requestText ? (
        <p className="fp-request" data-fitplate="task-request">
          “{task.requestText}”
        </p>
      ) : null}
      <dl className="fp-facts">
        <dt>任务</dt>
        <dd>
          {task.taskId ?? '未知'} · revision {task.revision ?? '未知'}
          {run?.taskRevision != null && task.revision !== null && task.revision !== run.taskRevision ? (
            <span className="fp-warn">（运行清单当前 revision {run.taskRevision}）</span>
          ) : null}
        </dd>
        <dt>冻结尺寸</dt>
        <dd>
          {plate && plate.locked.length > 0
            ? plate.locked
                .map((dim) => `${dim}=${formatValue(dim === 'width' ? plate.width : dim === 'height' ? plate.height : plate.thickness)}`)
                .join(' · ')
            : '无（全部可改）'}
        </dd>
        {plate && Object.keys(plate.editable).length > 0 ? (
          <>
            <dt>可改范围</dt>
            <dd>
              {Object.entries(plate.editable)
                .map(([dim, range]) => `${dim} ∈ [${formatValue(range.min)}, ${formatValue(range.max)}]`)
                .join(' · ')}
            </dd>
          </>
        ) : null}
        <dt>底座孔（冻结）</dt>
        <dd>
          ⌀{formatValue(baseHoles?.diameter ?? null)} · {baseHoles?.centers.length ?? 0} 个
          {baseHoles && baseHoles.centers.length > 0 ? (
            <span className="fp-muted">
              {' '}
              [{baseHoles.centers.slice(0, 6).map((c) => `(${c[0]},${c[1]})`).join(' ')}
              {baseHoles.centers.length > 6 ? ' …' : ''}]
            </span>
          ) : null}
        </dd>
        <dt>设备</dt>
        <dd>
          {sensor?.modelId ?? '未知'} · 外形 {sensor?.bodySize ? sensor.bodySize.join('×') : '?'} mm · 孔 ⌀
          {formatValue(sensor?.holeDiameter ?? null)} × {sensor?.holeOffsets.length ?? '?'}
        </dd>
        <dt>允许中心域</dt>
        <dd>
          x ∈ [{formatValue(sensor?.allowedCenterX?.min ?? null)}, {formatValue(sensor?.allowedCenterX?.max ?? null)}] · y ∈ [
          {formatValue(sensor?.allowedCenterY?.min ?? null)}, {formatValue(sensor?.allowedCenterY?.max ?? null)}] · 旋转{' '}
          {sensor?.allowedRotationDeg.join('/') ?? '0'}°
        </dd>
        <dt>要求值</dt>
        <dd>
          自由间隙 ≥ {formatValue(requirements?.minimum_free_clearance ?? null)}mm · 边距 ≥{' '}
          {formatValue(requirements?.minimum_edge_ligament ?? null)}mm · 孔间 ≥{' '}
          {formatValue(requirements?.minimum_hole_ligament ?? null)}mm
        </dd>
        <dt>容差</dt>
        <dd className="fp-muted">
          几何 ε {formatValue(tolerances?.geometry_epsilon_mm ?? null)}mm · 交集体积 ε{' '}
          {formatValue(tolerances?.interference_volume_epsilon_mm3 ?? null)}mm³ · 尺寸 ±
          {formatValue(tolerances?.dimensional_tolerance_mm ?? null)}mm
        </dd>
        <dt>数据源</dt>
        <dd className={source.warn ? 'fp-warn' : ''} data-fitplate="task-source" title={source.hint ?? undefined}>
          {source.text}
        </dd>
      </dl>
      {snapshot.phase === 'empty' && snapshot.notice ? <p className="fp-muted">{snapshot.notice.title}</p> : null}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Region 2: 3D view
// ---------------------------------------------------------------------------

function ViewerRegion({
  containerRef,
  viewerNotice,
  scene,
  visibility,
  onToggleVisibility,
  onCamera,
  onResetCamera,
  animationLabel,
  report,
  currentHighlight,
  compareLegend,
  onToggleReference,
}: {
  containerRef: React.MutableRefObject<HTMLDivElement | null>
  viewerNotice: string | null
  scene: SceneState | null
  visibility: VisibilityState
  onToggleVisibility: (key: keyof VisibilityState) => void
  onCamera: (preset: CameraPreset) => void
  onResetCamera: () => void
  animationLabel: string | null
  report: ReportView | null
  currentHighlight: string[]
  /** Two-version labels + ghost-overlay availability (P02-07). */
  compareLegend: {
    baselineId: string
    currentId: string
    referenceAvailable: boolean
    referenceOn: boolean
  } | null
  onToggleReference: (next: boolean) => void
}): ReactNode {
  const pose = scene?.pose ?? null
  const notes = scene?.envelopeNotes ?? []
  const freshness = scene?.reportFreshness ?? null
  return (
    <section className="fp-region fp-region-view" data-fitplate="view-region">
      <h2>
        三维视图
        <span className="fp-muted">真实 CAD 模型（来自 STEP 文件）</span>
      </h2>
      <div className="fp-view-toolbar">
        <button type="button" onClick={() => onCamera('top')}>
          俯视
        </button>
        <button type="button" onClick={() => onCamera('side')}>
          侧视
        </button>
        <button type="button" onClick={() => onCamera('front')}>
          正视
        </button>
        <button type="button" onClick={() => onCamera('iso')}>
          等轴
        </button>
        <button type="button" onClick={onResetCamera}>
          重置相机
        </button>
        <span className="fp-toolbar-sep" />
        {(
          [
            ['plate', '板'],
            ['device', '设备'],
            ['connector', '操作空间'],
            ['environment', '固定环境'],
          ] as [keyof VisibilityState, string][]
        ).map(([key, label]) => (
          <label className="fp-toggle" key={key}>
            <input type="checkbox" checked={visibility[key]} onChange={() => onToggleVisibility(key)} data-fitplate-toggle={key} />
            {label}
          </label>
        ))}
      </div>
      <div className="fp-view-body">
        <div className="fp-canvas-host" ref={containerRef} data-fitplate="canvas-host" />
        {!scene ? (
          <p className="fp-empty fp-canvas-overlay">
            {scene === null ? '尚未载入候选网格' : null}
          </p>
        ) : null}
        {viewerNotice ? (
          <p className="fp-alert fp-alert-warn fp-canvas-overlay" role="status">
            {viewerNotice}
          </p>
        ) : null}
        {scene?.meshRejection ? (
          <p className="fp-alert fp-alert-error fp-canvas-overlay" role="alert" data-fitplate="mesh-rejected">
            网格已拒绝渲染：{scene.meshRejection.message}
            {scene.meshRejection.detail ? `（${scene.meshRejection.detail}）` : ''}
          </p>
        ) : null}
        {animationLabel ? (
          <p className="fp-animation-label" data-fitplate="animation-label">
            {animationLabel}
          </p>
        ) : null}
      </div>
      <details className="fp-view-info">
      <summary>图例与模型说明：设备和操作空间为包络</summary>
      <div className="fp-legend" data-fitplate="compare-legend">
        {compareLegend ? (
          <>
            <span className="fp-legend-item" data-compare-label="current">
              <i className="fp-swatch fp-swatch-plate" />
              当前 {compareLegend.currentId}（STEP 网格·实色）
            </span>
            <span className="fp-legend-item" data-compare-label="baseline">
              <i className="fp-swatch fp-swatch-reference" />
              基准 {compareLegend.baselineId}（STEP 网格·半透明）
              {compareLegend.referenceAvailable ? '' : '：网格不可用，仅比对报告'}
            </span>
            <label className="fp-toggle">
              <input
                type="checkbox"
                checked={compareLegend.referenceOn}
                disabled={!compareLegend.referenceAvailable}
                onChange={(event) => onToggleReference(event.target.checked)}
                data-fitplate="reference-toggle"
              />
              叠加基准网格
            </label>
          </>
        ) : null}
        <span className="fp-legend-item">
          <i className="fp-swatch fp-swatch-plate" />板（STEP 实测网格）
        </span>
        <span className="fp-legend-item">
          <i className="fp-swatch fp-swatch-device" />设备包络{pose?.verified ? '（实测位姿）' : '（未验证）'}
        </span>
        <span className="fp-legend-item">
          <i className="fp-swatch fp-swatch-connector" />连接器操作空间（保守包络）
        </span>
        <span className="fp-legend-item">
          <i className="fp-swatch fp-swatch-fail" />失败/未确定对象
        </span>
      </div>
      {scene ? (
        <ul className="fp-view-notes" data-fitplate="view-notes">
          {freshness && freshness.state !== 'current' && report ? (
            <li className="fp-warn" data-fitplate="view-freshness">
              报告状态：{freshness.label}；此视图不代表当前要求下的通过结果
            </li>
          ) : null}
          <li className={pose?.verified ? '' : 'fp-warn'}>位姿：{pose?.note ?? '未知'}</li>
          <li>
            板顶基准：{scene.plateThickness.thicknessMm === null ? '缺失' : `${formatValue(scene.plateThickness.thicknessMm)}mm`}（
            {scene.plateThickness.source === 'report_g02' ? 'G02 实测' : scene.plateThickness.source === 'task_frozen' ? '任务冻结值' : '未知'}）
          </li>
          {scene.mesh ? (
            <li>
              网格：{scene.mesh.triangleCount} 三角面 · 顶点 {scene.mesh.vertexCount} · STEP{' '}
              {scene.mesh.stepSha256.slice(0, 12)}…
              {scene.mesh.toleranceMm !== null ? ` · 网格容差 ${formatValue(scene.mesh.toleranceMm)}mm` : ''}
            </li>
          ) : null}
          {notes.map((note) => (
            <li key={note} className="fp-warn">
              {note}
            </li>
          ))}
          <li className="fp-muted">
            操作空间是保守包络，仅表示所需空间；本面板不声明可打印强度，也不做无碰撞运动规划。当前高亮：
            {currentHighlight.length > 0 ? currentHighlight.join('、') : '无'}
            {report && report.overall !== 'PASS' ? '（当前候选未通过）' : ''}
          </li>
        </ul>
      ) : null}
      </details>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Region 3: G01–G08 checks
// ---------------------------------------------------------------------------

function ChecksRegion({
  accepted,
  delivery,
  report,
  freshness,
  source,
  pairs,
  onFocus,
}: {
  accepted: boolean
  delivery: ReactNode
  report: ReportView | null
  freshness: { state: string; label: string } | null
  source: string
  pairs: PairClearance | null
  onFocus: (id: CheckId) => void
}): ReactNode {
  const rows = orderedChecks(report)
  return (
    <section className="fp-region fp-region-checks" data-fitplate="checks-region">
      {delivery}
      <details className="fp-checks-disclosure" data-fitplate="checks-disclosure" key={`${report?.reportId}-${freshness?.state}`}>
      <summary>
        检查明细 G01–G08
        {report && freshness?.state === 'current' && (report.overall !== 'PASS' || accepted)
          ? <StatusBadge status={report.overall} /> : <span className="fp-badge fp-badge-unknown">{report ? '证据待核实' : '无报告'}</span>}
        {report && report.overall !== 'PASS' ? <span className="fp-warn">（含未通过项）</span> : null}
      </summary>
      <h2>
        验证清单 G01–G08
        {report && freshness?.state === 'current' && (report.overall !== 'PASS' || accepted)
          ? <StatusBadge status={report.overall} /> : <span className="fp-badge fp-badge-unknown">{report ? '通过证据待核实' : '无报告'}</span>}
        {report && freshness && FRESHNESS_BADGE[freshness.state] ? (
          <span className="fp-badge fp-badge-warn" title={freshness.label}>
            {FRESHNESS_BADGE[freshness.state]}
          </span>
        ) : null}
      </h2>
      {report ? (
        <p className="fp-muted" data-fitplate="report-meta">
          报告 {report.reportId} · 验证器 {report.validatorVersion ?? '未知'} ·{' '}
          {report.createdAt ? new Date(report.createdAt).toLocaleString() : '无时间'}
          {source === 'run-summary' ? ' · 报告摘要（未含逐项数据）' : ''}
          {freshness ? (
            <span className={freshness.state === 'current' ? 'fp-ok' : 'fp-warn'}> · {freshness.label}</span>
          ) : null}
        </p>
      ) : (
        <p className="fp-empty">尚无验证报告：本候选还没有经独立测量验收。</p>
      )}
      <ol className="fp-checks">
        {CHECK_IDS.map((id, index) => {
          const check = rows[index]
          const lines = check ? checkSummary(check, { pairs }) : []
          const reason = check && check.status !== 'PASS' ? describeReason(check.reasonCode) : null
          const measuredCount = check ? Object.keys(check.measured).length : 0
          const requiredCount = check ? Object.keys(check.required).length : 0
          // The objects a failing check points at stay in the collapsed card
          // (they are what the 3D highlight follows); a passing check keeps them
          // with the raw data so the default view stays short.
          const objectsInline = check !== null && check.status !== 'PASS' && check.objects.length > 0
          return (
            <li
              key={id}
              className={checkRowClass(check)}
              data-check={id}
              data-status={check?.status ?? 'MISSING'}
              onClick={() => onFocus(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onFocus(id)
              }}
            >
              <div className="fp-check-head">
                <b>{id}</b>
                <span>{CHECK_TITLES[id]}</span>
                {check ? <StatusBadge status={check.status} /> : <span className="fp-badge fp-badge-missing">未包含</span>}
              </div>
              {check ? (
                <>
                  {lines.length > 0 ? (
                    <SummaryChips lines={lines} />
                  ) : (
                    <div className="fp-note">报告未附实测数据。</div>
                  )}
                  {reason ? <div className="fp-reason">原因：{reason.label}</div> : null}
                  {check.objects.length > 0 ? (
                    <div className="fp-objects">对象：{check.objects.join('、')}</div>
                  ) : null}
                  <details className="fp-details" open={check.status === 'FAIL'}>
                    <summary>
                      详细测量数据（{measuredCount} 项实测
                      {requiredCount > 0 ? ` · ${requiredCount} 项要求` : ''}）
                    </summary>
                    <div className="fp-details-body">
                      <h4>实测</h4>
                      <RawKeyValues values={check.measured} empty="报告未附实测值" />
                      {requiredCount > 0 ? (
                        <>
                          <h4>要求</h4>
                          <RawKeyValues values={check.required} empty="报告未附要求值" />
                        </>
                      ) : null}
                      {check.reasonCode ? <p className="fp-detail-line">原因代码：{check.reasonCode}</p> : null}
                      {check.evidenceRef ? <p className="fp-detail-line">证据引用：{check.evidenceRef}</p> : null}
                      {check.note ? <p className="fp-detail-line">验证器备注：{check.note}</p> : null}
                    </div>
                  </details>
                </>
              ) : (
                <div className="fp-note">报告未包含该检查项，不能视为通过。</div>
              )}
            </li>
          )
        })}
      </ol>
      {report && report.errors.length > 0 ? (
        <div className="fp-errors">
          <h3>验证器错误</h3>
          <ul>
            {report.errors.map((error) => (
              <li key={`${error.code}-${error.message}`}>
                <b>{error.code}</b> {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </details>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Region 4: versions & actions
// ---------------------------------------------------------------------------

function VersionsRegion({
  snapshot,
  sceneFreshness,
  compareView,
  onSetBaseline,
  onDownloadBaselineReport,
  onSelect,
  onDownload,
  onDownloadReportCopy,
  downloadBusy,
}: {
  snapshot: PanelSnapshot
  /** Freshness of the currently displayed report (from the scene response). */
  sceneFreshness: { state: string; label: string } | null
  compareView: CompareView
  onSetBaseline: (candidateId: string | null) => void
  onDownloadBaselineReport: () => void
  onSelect: (candidateId: string) => void
  onDownload: (artifact: ArtifactRef) => void
  onDownloadReportCopy: (report: ReportView, failing: boolean) => void
  downloadBusy: string | null
}): ReactNode {
  const rows: VersionRow[] = snapshot.versions
  return (
    <section className="fp-region fp-region-versions" data-fitplate="versions-region">
      <h2>
        版本与操作记录
        <span className="fp-muted">选择版本对比；下载已登记产物</span>
      </h2>
      {snapshot.poseChangeText ? (
        <p className="fp-change-summary" data-fitplate="pose-change">
          {snapshot.poseChangeText}
        </p>
      ) : null}
      {snapshot.compareBaselineId ? (
        <CompareBlock
          view={compareView}
          snapshot={snapshot}
          onClear={() => onSetBaseline(null)}
          onDownloadBaselineReport={onDownloadBaselineReport}
        />
      ) : null}
      {rows.length === 0 ? (
        <p className="fp-empty">尚无候选版本。</p>
      ) : (
        <ol className="fp-versions">
          {rows.map((row) => {
            const selected = row.version.candidateId === snapshot.selectedCandidateId
            const report = selected ? snapshot.scene?.report ?? row.report : row.report
            const accepted = deliveryFacts(report?.raw, {
              candidateId: row.version.candidateId,
              taskRevision: snapshot.run?.taskRevision ?? null,
              stepSha256: row.version.stepSha256,
              reportId: row.version.report?.reportId ?? null,
            }).accepted
            const failing = report !== null && report.overall !== 'PASS'
            // Only the selected candidate has a full report (from the scene
            // response); its freshness is the authoritative one. Other rows only
            // carry the run list's summary, so they say exactly that.
            const freshness = selected && sceneFreshness ? sceneFreshness : row.freshness
            return (
              <li
                key={row.version.candidateId}
                className={`fp-version${selected ? ' fp-version-selected' : ''}`}
                data-candidate={row.version.candidateId}
                data-selected={selected ? 'true' : 'false'}
              >
                <div className="fp-version-head">
                  <button type="button" onClick={() => onSelect(row.version.candidateId)} disabled={selected}>
                    {row.version.candidateId}
                  </button>
                  {report && freshness.state === 'current' && (report.overall !== 'PASS' || accepted) ? (
                    <StatusBadge status={report.overall} />
                  ) : (
                    <span className="fp-badge fp-badge-unknown">未验证</span>
                  )}
                  {failing ? <span className="fp-badge fp-badge-fail">失败版</span> : null}
                  {freshness.state === 'stale-revision' ? <span className="fp-badge fp-badge-warn">按旧要求</span> : null}
                  {freshness.state === 'stale-binding' ? <span className="fp-badge fp-badge-warn">报告绑定失效</span> : null}
                  {snapshot.compareBaselineId === row.version.candidateId ? (
                    <span className="fp-badge fp-badge-compare">对比基准</span>
                  ) : null}
                  <span className="fp-muted">{row.version.createdAt ? new Date(row.version.createdAt).toLocaleString() : ''}</span>
                  <button
                    type="button"
                    className="fp-compare-pick"
                    data-compare-baseline={row.version.candidateId}
                    disabled={selected}
                    title={selected ? '基准与当前不能是同一版本' : '把该版本设为对比基准（同一运行内）'}
                    onClick={() =>
                      onSetBaseline(snapshot.compareBaselineId === row.version.candidateId ? null : row.version.candidateId)
                    }
                  >
                    {snapshot.compareBaselineId === row.version.candidateId ? '取消基准' : '设为对比基准'}
                  </button>
                </div>
                <div className="fp-version-meta">
                  STEP {row.version.stepSha256 ? `${row.version.stepSha256.slice(0, 12)}…` : '未知哈希'}
                  {row.version.parentCandidateId ? ` · 基于 ${row.version.parentCandidateId}` : ''}
                  {freshness.state !== 'current' ? ` · ${freshness.label}` : ''}
                  {!selected && row.freshness.state === 'unverified-metadata' ? ' · 摘要：选择该版本后读取完整报告' : ''}
                </div>
                {row.changeLines.length > 0 ? (
                  <ul className="fp-change">
                    {row.changeLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="fp-muted">无改动摘要（本版可能为首版）</div>
                )}
                {selected ? (
                  <div className="fp-artifacts">
                    <span className="fp-muted">下载：</span>
                    {row.version.artifacts.length === 0 ? (
                      <span className="fp-muted">该运行未登记可下载产物</span>
                    ) : (
                      row.version.artifacts.map((artifact) => (
                        <button
                          key={artifact.artifactId}
                          type="button"
                          className={failing ? 'fp-download fp-download-failing' : 'fp-download'}
                          onClick={() => onDownload(artifact)}
                          disabled={downloadBusy !== null}
                          data-artifact={artifact.artifactId}
                        >
                          {artifact.kind.toUpperCase()} {artifact.name}
                          {artifact.bytes !== null ? ` (${Math.round(artifact.bytes / 1024)}KiB)` : ''}
                          {failing ? ' · 未通过' : ''}
                        </button>
                      ))
                    )}
                    {report ? (
                      <button
                        type="button"
                        className={failing ? 'fp-download fp-download-failing' : 'fp-download'}
                        onClick={() => onDownloadReportCopy(report, failing)}
                        data-artifact="report-response-copy"
                        title="下载本次 scene 响应中的报告副本；已登记的报告产物请优先用上面的按钮"
                      >
                        报告 JSON（本次响应副本）
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
      {snapshot.download ? (
        <p className="fp-muted" data-fitplate="download-progress">
          正在读取 {snapshot.download.artifactId}：{Math.round(snapshot.download.received / 1024)}KiB
          {snapshot.download.total !== null ? ` / ${Math.round(snapshot.download.total / 1024)}KiB` : ''}
        </p>
      ) : null}
      {snapshot.downloadError ? (
        <p className="fp-alert fp-alert-warn" role="alert" data-fitplate="download-error">
          {snapshot.downloadError.title}
          {snapshot.downloadError.detail ? <span className="fp-detail">（{snapshot.downloadError.detail}）</span> : null}
        </p>
      ) : null}
      {snapshot.sceneError ? (
        <p className="fp-alert fp-alert-error" role="alert" data-fitplate="scene-error">
          {snapshot.sceneError.title}
          {snapshot.sceneError.detail ? <span className="fp-detail">（{snapshot.sceneError.detail}）</span> : null}
        </p>
      ) : null}
      <footer className="fp-footer">
        <details className="fp-tech" data-fitplate="tech-details">
          <summary>技术详情（构建信息与数据通道）</summary>
          <div className="fp-tech-body">
            <p title={BUILD_INFO.buildHash}>{describeBuild()}</p>
            <p>数据经宿主服务读取（fitplate.run / fitplate.scene / fitplate.artifact），面板不注入宿主 DOM。</p>
            <p>运行轨迹请在 AGH 宿主界面查看。</p>
          </div>
        </details>
      </footer>
    </section>
  )
}

// ---------------------------------------------------------------------------
// P02-07 comparison block: previous vs current inside one run
// ---------------------------------------------------------------------------

const COMPARE_STATUS_BADGE: Record<CompareView['status'], { label: string; className: string }> = {
  single: { label: '未选基准', className: 'fp-badge fp-badge-unknown' },
  ready: { label: '同运行·已核验对比', className: 'fp-badge fp-badge-pass' },
  unverified: { label: '未验证对比', className: 'fp-badge fp-badge-warn' },
}

function CompareBlock({
  view,
  snapshot,
  onClear,
  onDownloadBaselineReport,
}: {
  view: CompareView
  snapshot: PanelSnapshot
  onClear: () => void
  onDownloadBaselineReport: () => void
}): ReactNode {
  const g06Lines = (side: CompareSide | null): SummaryLine[] => {
    if (!side || !side.report) return []
    const check = orderedChecks(side.report)[CHECK_IDS.indexOf('G06')]
    return check ? checkSummary(check, { pairs: side.pairs }) : []
  }
  const baselineRow = view.baseline
  return (
    <div className="fp-compare" data-fitplate="compare-block" data-compare-status={view.status}>
      <div className="fp-compare-head">
        <b>版本对比</b>
        <span className={COMPARE_STATUS_BADGE[view.status].className}>{COMPARE_STATUS_BADGE[view.status].label}</span>
        <span className="fp-muted" data-compare-labels>
          基准 {baselineRow?.candidateId ?? '—'}
          {baselineRow ? `（${baselineRow.freshness.label}）` : ''} → 当前 {view.current.candidateId}（{view.current.freshness.label}）
        </span>
        <button type="button" onClick={onClear} data-fitplate="compare-clear">
          清除对比
        </button>
      </div>
      {snapshot.baselineBusy ? <p className="fp-muted">正在读取基准版本的场景（真实 STEP 网格与报告）…</p> : null}
      {snapshot.baselineNotice ? (
        <p className="fp-alert fp-alert-warn" role="status" data-fitplate="compare-notice">
          {snapshot.baselineNotice.title}
          {snapshot.baselineNotice.detail ? <span className="fp-detail">（{snapshot.baselineNotice.detail}）</span> : null}
        </p>
      ) : null}
      {view.notes.map((note) => (
        <p className="fp-detail-line fp-warn" key={note} data-compare-note>
          {note}
        </p>
      ))}
      {snapshot.comparePoseText ? (
        <p className="fp-change-summary" data-fitplate="compare-pose">
          {snapshot.comparePoseText}
        </p>
      ) : null}

      <h3>变动（来自两份设计文档）</h3>
      {view.designLines.length > 0 ? (
        <ul className="fp-change" data-fitplate="compare-design">
          {view.designLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <div className="fp-muted">两份设计在可比字段上没有差异，或设计文档缺失（见上方说明）。</div>
      )}

      <h3>板尺寸（各自报告的 G02 实测）</h3>
      <table className="fp-compare-table">
        <thead>
          <tr>
            <th>尺寸</th>
            <th>基准 {baselineRow?.candidateId ?? '—'}</th>
            <th>当前 {view.current.candidateId}</th>
          </tr>
        </thead>
        <tbody>
          {view.plateRows.length === 0 ? (
            <tr>
              <td colSpan={3} className="fp-muted">
                两侧都还没有报告实测值。
              </td>
            </tr>
          ) : (
            view.plateRows.map((row) => (
              <tr key={row.axis}>
                <td>{row.label}</td>
                <td>{row.baselineMm === null ? '未测量' : `${formatValue(row.baselineMm)} mm`}</td>
                <td>{row.currentMm === null ? '未测量' : `${formatValue(row.currentMm)} mm`}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h3>检查项变化（逐项状态，非裸 overall 字符串）</h3>
      <div className="fp-compare-checks">
        {view.checkRows.map((row) => (
          <span key={row.id} className={`fp-compare-check${row.changed ? ' fp-compare-check-changed' : ''}`} data-check={row.id}>
            <b>{row.id}</b> {row.baseline} → {row.current}
          </span>
        ))}
      </div>

      <h3>失败对象变化（来自两份报告的对象清单）</h3>
      <div className="fp-compare-failing">
        <span data-compare-gained>新增失败：{view.failingGained.length > 0 ? view.failingGained.join('、') : '无'}</span>
        <span data-compare-resolved>已消除失败：{view.failingResolved.length > 0 ? view.failingResolved.join('、') : '无'}</span>
      </div>

      <h3>G06 关键实测（各版本自身报告的核对结果）</h3>
      <div className="fp-compare-g06">
        <div data-compare-g06="baseline">
          <b className="fp-muted">基准 {baselineRow?.candidateId ?? '—'}</b>
          {g06Lines(baselineRow).length > 0 ? <SummaryChips lines={g06Lines(baselineRow)} /> : <div className="fp-muted">未测量（无报告或 G06 缺失）</div>}
        </div>
        <div data-compare-g06="current">
          <b className="fp-muted">当前 {view.current.candidateId}</b>
          {g06Lines(view.current).length > 0 ? <SummaryChips lines={g06Lines(view.current)} /> : <div className="fp-muted">未测量（无报告或 G06 缺失）</div>}
        </div>
      </div>

      {snapshot.baselineScene?.report ? (
        <div className="fp-artifacts">
          <button
            type="button"
            className="fp-download"
            onClick={onDownloadBaselineReport}
            data-artifact="baseline-report-response-copy"
            title="下载基准版本 scene 响应中的报告副本（带 BASELINE- 前缀；不是当前版本的报告）"
          >
            基准报告 JSON（本次响应副本）
          </button>
        </div>
      ) : null}
    </div>
  )
}

