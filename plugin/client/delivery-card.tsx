import type { ReactNode } from 'react'
import type { ArtifactRef, RunVersion, RunView } from './adapter.ts'
import type { ReportFreshness, ReportView } from './scene-model.ts'
import { clearanceFactLines, deliveryFacts } from '../src/report-facts.mjs'

/** Deterministic, version-bound facts; the assistant's prose is assessed separately. */
export function DeliveryCard({ run, version, report, freshness, change, busy, onDownload }: {
  run: RunView
  version: RunVersion
  report: ReportView | null
  freshness: ReportFreshness | null
  change: string | null
  busy: boolean
  onDownload: (artifact: ArtifactRef) => void
}): ReactNode {
  const facts = deliveryFacts(report?.raw, {
    candidateId: version.candidateId, taskRevision: run.taskRevision,
    stepSha256: version.stepSha256, reportId: version.report?.reportId ?? null,
  })
  const current = freshness?.state === 'current' && facts.bindingState === 'current'
  const accepted = current && facts.accepted
  const matchingExport = run.exports.filter((entry) => entry.candidateId === version.candidateId
    && entry.reportId === facts.identity.reportId && !entry.failed && entry.exportDir !== null)
  const exported = accepted && version.reportFileSha256 !== null && version.reportSha256 !== null
    && matchingExport.some((entry) => entry.stepSha256 === version.stepSha256
      && entry.reportFileSha256 === version.reportFileSha256 && entry.reportSha256 === version.reportSha256)
  const state = !current ? 'unverified' : !accepted ? 'failed' : exported ? 'exported' : 'validated'
  const title = !current ? '报告待核实' : !accepted ? '几何验收尚未通过' : exported ? '检查通过，当前版本已导出'
    : matchingExport.length ? '几何检查通过，交付包绑定待核实' : '几何检查通过，待导出交付包'
  const downloads = version.artifacts.filter((entry) => ['model.step', 'report.json', 'model.stl'].includes(entry.artifactId))
  const objectName = (id: string): string => ({ sensor_body: '设备外壳', connector_access: '接线预留空间', plate: '安装板', plate_top: '板面' }[id] ?? (/^post/.test(id) ? `固定柱 ${id}` : id))
  const gap = facts.clearance
  const failureChecks = current ? report?.checks.filter((check) => check.status !== 'PASS') ?? [] : []
  const checkNames: Record<string, string> = { G01: '实体有效性', G02: '板尺寸', G03: '底座孔', G04: '设备安装孔', G05: '孔边与孔间材料', G06: '装配空间', G07: '固定条件', G08: '导出一致性' }
  return (
    <section className={`fp-delivery-card fp-delivery-${state}`} data-fitplate="delivery-card" data-delivery-state={state}>
      <div className="fp-delivery-main">
        <h2>{title}</h2>

        {change ? <p>{change}</p> : null}
        <p className="fp-result-next">{!current ? '请稍候，正在核对这个版本的报告。'
          : !accepted ? '这个方案还不能作为合格结果。查看下方未通过项，以及上方 AI 的处理说明。'
          : exported ? '下载 STEP 继续编辑，STL 用于切片预览；报告可核对检查结果。'
          : '几何已通过，交付包仍待导出或核实；可先查看当前模型与报告。'}</p>
        {current && gap.measuredMm !== null ? <div className="fp-gap-readout">
          <span>最小自由间隙</span><strong>{gap.measuredMm}<small> mm</small></strong><span>要求 {gap.requiredMm === null ? '未提供' : `≥ ${gap.requiredMm} mm`}</span>
          <p>{gap.pair ? `${objectName(gap.pair.moving)} ↔ ${objectName(gap.pair.fixed)}` : '对象对未提供'}</p>
        </div> : <p className="fp-warn">{!current ? freshness?.label ?? '报告待核实' : '报告未提供可用的自由间隙数值，请展开验证明细。'}</p>}
        {failureChecks.length ? <p className="fp-warn">未通过项：{failureChecks.map((check) => `${checkNames[check.id] ?? check.id}（${check.status === 'BORDERLINE' ? '处在边界' : check.status === 'FAIL' ? '未通过' : '尚不确定'}）`).join('、')}</p> : null}
        <p className="fp-muted">仅软件几何检查，未验证实物。</p>
      </div>
      <div className="fp-delivery-actions">
        {downloads.map((entry) => (
          <button key={entry.artifactId} type="button" disabled={!accepted || busy} onClick={() => onDownload(entry)} data-fitplate={`delivery-download-${entry.kind}`}>
            下载 {entry.kind === 'step' ? 'STEP' : entry.kind === 'stl' ? 'STL' : '报告'}
          </button>
        ))}
        {!accepted ? <span className="fp-muted">当前报告未核实或未通过；诊断下载见版本记录。</span> : null}
      </div>
      <details className="fp-details fp-delivery-details">
        <summary>测量原文与验证明细</summary>
        <p>方案 {version.candidateId} · 要求修订 {run.taskRevision ?? '未知'}</p>
        {current ? clearanceFactLines(facts.clearance).map((line) => <p key={line}>{line}</p>) : null}
        <p>仅验证确认输入下的软件几何；未做实物装配、强度或制造公差实测。厂商设备规格与自设条件按报告分别标注。</p>
        <p>报告：{facts.identity.reportId ?? '未提供'}；逐项检查：{facts.checksComplete ? '8 项齐全' : '尚不完整'}；{freshness?.label ?? '未核实'}</p>
        <p>STEP SHA-256：{facts.identity.stepSha256 ?? '未提供'}</p>
        <p>报告文件 SHA-256：{version.reportFileSha256 ?? '未提供'}</p>
        <p>报告内容摘要：{version.reportSha256 ?? '未提供'}</p>
      </details>
    </section>
  )
}
