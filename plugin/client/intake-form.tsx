/**
 * P02-05 intake form + confirmation card (React view layer).
 *
 * The user fills one finite, unit-explicit form; the panel serializes the
 * request bytes, ships them as a real user-message file attachment through the
 * host's own SessionService commands, and renders the program's draft (from
 * the read-only fitplate.intake query) as a confirmation card. There is no
 * JSON editor anywhere: requests and confirmations are always program-built.
 *
 * Everything safety-relevant lives in intake-model.ts / intake-controller.ts;
 * this file only renders that state and forwards user intent. Refs, hashes and
 * module names stay inside the collapsed diagnostics block — the main flow
 * speaks in conditions, sources and revisions.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { IntakeController, IntakeDraftCard, IntakeSnapshot, IntakeStatus } from './intake-controller.ts'
import {
  LICENSE_LABELS,
  OUTCOME_LABELS,
  REGISTERED_DEVICE_CARDS,
  SOURCE_KINDS,
  SOURCE_LABELS,
  UNITS,
  cloneForm,
  describeLicense,
  toMillimeters,
  type IntakeFormState,
} from './intake-model.ts'

const approx = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''))

const OUTCOME_BADGE: Record<string, string> = {
  READY_TO_CONFIRM: 'fp-outcome-ready',
  NEEDS_INPUT: 'fp-outcome-needs',
  CONFLICTING_INPUT: 'fp-outcome-conflict',
  UNSUPPORTED_REQUEST: 'fp-outcome-unsupported',
}

/** Phases where the intake flow is actively working: it stays fully visible. */
const ACTIVE_PHASES = new Set(['sending', 'awaiting-draft', 'draft', 'confirming', 'awaiting-commit'])

export function IntakeRegion({
  controller,
  sessionKey,
  disabled,
  hasRun,
  collapsedOverride,
  onCollapsedChange,
  compact = false,
}: {
  controller: IntakeController
  sessionKey: string | undefined
  disabled: boolean
  /** True while the panel is showing a run: confirmed inputs default to collapsed. */
  hasRun: boolean
  collapsedOverride?: boolean | null
  onCollapsedChange?: (collapsed: boolean) => void
  compact?: boolean
}): ReactNode {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  // P02-07: during the run stage the confirmed input material is folded away by
  // default (expand to view/edit a new request), but while a draft/confirm flow
  // is under way it must stay clearly visible — an old task's PASS never stands
  // in for the new request's state.
  const regionRef = useRef<HTMLElement | null>(null)
  const [step, setStep] = useState<number | null>(null)
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null)
  useEffect(() => setStep(null), [sessionKey])
  useEffect(() => { if (snapshot.card && !snapshot.cardExpired) setStep(3); if (snapshot.card && !snapshot.cardExpired) regionRef.current?.scrollTo({ top: 0 }) }, [snapshot.card, snapshot.cardExpired])
  useEffect(() => setExpandedOverride(null), [sessionKey])
  const activeLock = ACTIVE_PHASES.has(snapshot.phase) || snapshot.busy
  const override = onCollapsedChange ? collapsedOverride : expandedOverride
  const changeCollapsed = onCollapsedChange ?? setExpandedOverride
  const collapsed = !activeLock && (override ?? hasRun)
  if (collapsed) {
    return (
      <section className={compact ? 'fp-intake-inline' : 'fp-region fp-region-intake fp-intake-collapsed'} data-fitplate="intake-region" data-collapsed="true">
        {!compact ? <h2>
          输入与确认
        </h2> : null}
        {snapshot.status && (snapshot.status.kind === 'warn' || snapshot.status.kind === 'error' || snapshot.status.kind === 'pending') ? (
          <StatusBanner status={snapshot.status} />
        ) : null}
        {!compact ? <p className="fp-muted">
          当前结论仅适用于已确认输入；编辑后需重新确认。
        </p> : null}
        <button type="button" data-fitplate="intake-expand" onClick={() => changeCollapsed(false)}>
          {compact ? '编辑输入' : '展开输入（编辑新请求）'}
        </button>
      </section>
    )
  }

  const form = snapshot.form

  const set = (mutate: (draft: IntakeFormState) => void): void => {
    const next = cloneForm(form)
    mutate(next)
    controller.updateForm(next)
  }

  const unit = form.unit
  const decimalInput = (value: string, onChange: (text: string) => void, label: string): ReactNode => (
    <input className="fp-intake-num" inputMode="decimal" value={value} disabled={disabled} aria-label={label} onChange={(event) => onChange(event.target.value)} />
  )
  const lengthCell = (value: string, onChange: (text: string) => void, label: string): ReactNode => (
    <span className="fp-intake-length">
      <input className="fp-intake-num" inputMode="decimal" value={value} disabled={disabled} aria-label={label} onChange={(event) => onChange(event.target.value)} />
      <span className="fp-intake-unit">{unit}</span>
    </span>
  )

  const card = snapshot.card
  const visibleStep = step ?? (form.deviceCardId || card ? 3 : -1)
  const waiting = snapshot.busy || snapshot.polling
  const reviewing = Boolean(card && !snapshot.cardExpired && visibleStep === 3)
  const steps = ['设备与板尺寸', '安装孔与移动范围', '周围空间与要求', '核对并开始']
  const go = (next: number): void => { setStep(next); regionRef.current?.scrollTo({ top: 0 }) }
  const loadExample = (): void => { controller.loadDemo(); go(3) }
  const guidance = snapshot.phase === 'no-session' ? '请先在左侧选择 FitPlate 体验会话。'
    : snapshot.phase === 'sending' ? '正在发送要求，请稍候。'
    : snapshot.phase === 'awaiting-draft' ? 'AI 正在检查要求。若上方出现权限卡，请核对工具后点 Allow once（允许一次）。'
    : snapshot.phase === 'confirming' ? '正在核对本次确认，请稍候。核对通过后会开始设计。'
    : snapshot.phase === 'awaiting-commit' ? '确认已发出，正在开始设计。若上方出现权限卡，请核对后允许一次，无需重复点击。'
    : reviewing ? (snapshot.confirmable ? '请核对下方条件；无误后点「确认条件，开始设计」。输入完整不代表设计已通过。' : '这些要求还不能开始设计。请按下方问题修改，再重新检查。')
    : visibleStep === 3 ? '核对这些输入，然后让 AI 检查要求。AI 会在你允许的范围内选择位置。'
    : '按步骤提供已有尺寸；没有测量的数据请留空并说明，不需要猜数值。'

  return (
    <section ref={regionRef} className="fp-region fp-region-intake fp-guided-intake" data-fitplate="intake-region" data-collapsed="false" data-input-step={visibleStep} data-input-waiting={waiting ? 'true' : 'false'}>
      <div className="fp-guide-heading">
        <div><span className="fp-eyebrow">安装板设计助手</span><h2>{visibleStep < 0 ? '先体验一次，或填写自己的要求' : waiting ? 'AI 正在处理，请查看当前进度' : reviewing ? '请确认这次设计的条件' : steps[visibleStep]}</h2></div>
        {hasRun ? <button type="button" data-fitplate="intake-collapse" onClick={() => changeCollapsed(true)}>返回已有结果</button> : null}
      </div>
      {visibleStep < 0 ? (
        <div className="fp-welcome" data-fitplate="welcome">
          <p>把传感器装到板上：你提供尺寸与限制，AI 选择位置、生成模型、检查碰撞，并在允许范围内修正。</p>
          <div className="fp-start-options">
            <button type="button" className="fp-start-card fp-start-recommended" data-fitplate="intake-demo" disabled={disabled} onClick={loadExample}>
              <strong>用示例体验</strong><span>无需先填写参数。核对示例条件后，走一次真实设计流程。</span><small>厂商设备规格 + 自设环境，未做实物验证</small>
            </button>
            <button type="button" className="fp-start-card" data-fitplate="intake-custom" disabled={disabled} onClick={() => go(0)}>
              <strong>填写我的安装要求</strong><span>分三步填写尺寸、安装范围和周围障碍。</span><small>目前支持 Banner Q20PD 设备与矩形板</small>
            </button>
          </div>
          <p className="fp-muted">流程：检查要求 → 你确认条件 → AI 建模与验证 → 查看和下载结果。</p>
        </div>
      ) : (
        <nav className="fp-input-steps" aria-label="填写步骤">
          {steps.map((label, index) => <button type="button" key={label} aria-current={visibleStep === index ? 'step' : undefined}
            disabled={waiting} data-fitplate={`input-step-${index}`} onClick={() => go(index)}><b>{index + 1}</b>{label}</button>)}
        </nav>
      )}
      {visibleStep >= 0 ? <p className="fp-next-action" role="status" data-fitplate="next-action">{guidance}</p> : null}
      {snapshot.status && visibleStep >= 0 ? <StatusBanner status={snapshot.status} /> : null}
      {card && visibleStep === 3 ? <ConfirmationCard card={card} snapshot={snapshot} onConfirm={() => void controller.confirm()} /> : null}
      {visibleStep === 3 && !reviewing ? <InputReview form={form} onEdit={go} /> : null}

      <div className="fp-intake-toolbar">
        <label className="fp-intake-common-unit">
          统一单位
          <select
            value={unit}
            disabled={disabled}
            aria-label="统一单位"
            onChange={(event) => {
              const next = event.target.value as IntakeFormState['unit']
              set((draft) => {
                draft.unit = next
              })
            }}
          >
            {UNITS.map((unitOption) => (
              <option key={unitOption} value={unitOption}>
                {unitOption}
              </option>
            ))}
          </select>
        </label>
        <span className="fp-muted">切换单位会重新解释已填数字，请先选好单位。</span>
        {visibleStep >= 0 && !waiting && !form.deviceCardId ? (
          <button type="button" data-fitplate="intake-demo" onClick={loadExample}>
            载入公开规格演示
          </button>
        ) : null}

      </div>


      {/* ---------------- 需求文本与设备卡 ---------------- */}
      <fieldset className="fp-intake-fieldset" data-form-step="0">
        <legend>需求与设备</legend>
        <p className="fp-field-help">选择当前支持的设备。用一句话说明安装目标；精确尺寸填写在下方。</p>
        <div className="fp-intake-rows">
          <label className="fp-intake-wide">
            这次想完成什么？
            <textarea
              rows={2}
              maxLength={4000}
              value={form.text}
              disabled={disabled}
              data-fitplate="intake-text"
              placeholder="例如：在允许范围内选择合适的安装位置，满足间隙与孔边材料要求。"
              onChange={(event) => {
                const text = event.target.value
                set((draft) => {
                  draft.text = text
                })
              }}
            />
          </label>
          <label>
            要安装的设备
            <select
              value={form.deviceCardId}
              disabled={disabled}
              data-fitplate="intake-card-select"
              onChange={(event) => {
                const id = event.target.value
                set((draft) => {
                  draft.deviceCardId = id
                })
              }}
            >
              <option value="">（请选择）</option>
              {REGISTERED_DEVICE_CARDS.map((deviceCard) => (
                <option key={deviceCard.id} value={deviceCard.id}>
                  {deviceCard.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.deviceCardId ? <DeviceCardSummary cardId={form.deviceCardId} /> : null}
      </fieldset>

      {/* ---------------- 板体 ---------------- */}
      <fieldset className="fp-intake-fieldset" data-form-step="0">
        <legend>板体</legend>
        <p className="fp-field-help">从上方看板：左下角为原点，X 向右、Y 向上。板高指平面内的 Y 尺寸，板厚指 Z 方向。</p>
        <div className="fp-intake-rows">
          <label>板宽 {lengthCell(form.plate.width, (text) => set((d) => (d.plate.width = text)), '板宽')}</label>
          <label>板高 {lengthCell(form.plate.height, (text) => set((d) => (d.plate.height = text)), '板高')}</label>
          <label>
            板厚 {lengthCell(form.plate.thickness, (text) => set((d) => (d.plate.thickness = text)), '板厚')}
            <span className="fp-intake-lock">锁定（新入口不允许改板厚）</span>
          </label>
        </div>
        <div className="fp-intake-rows">
          <label className="fp-toggle">
            <input
              type="checkbox"
              checked={form.plate.widthEditable}
              disabled={disabled}
              onChange={(event) => {
                const checked = event.target.checked
                set((d) => (d.plate.widthEditable = checked))
              }}
            />
            板宽允许在范围内调整
          </label>
          {form.plate.widthEditable ? (
            <span className="fp-intake-range">
              {decimalInput(form.plate.widthMin, (text) => set((d) => (d.plate.widthMin = text)), '板宽许可下限')}
              <span className="fp-intake-unit">{unit}</span> ≤ 板宽 ≤
              {decimalInput(form.plate.widthMax, (text) => set((d) => (d.plate.widthMax = text)), '板宽许可上限')}
              <span className="fp-intake-unit">{unit}</span>
            </span>
          ) : null}
        </div>
        <div className="fp-intake-rows">
          <label className="fp-toggle">
            <input
              type="checkbox"
              checked={form.plate.heightEditable}
              disabled={disabled}
              onChange={(event) => {
                const checked = event.target.checked
                set((d) => (d.plate.heightEditable = checked))
              }}
            />
            板高允许在范围内调整
          </label>
          {form.plate.heightEditable ? (
            <span className="fp-intake-range">
              {decimalInput(form.plate.heightMin, (text) => set((d) => (d.plate.heightMin = text)), '板高许可下限')}
              <span className="fp-intake-unit">{unit}</span> ≤ 板高 ≤
              {decimalInput(form.plate.heightMax, (text) => set((d) => (d.plate.heightMax = text)), '板高许可上限')}
              <span className="fp-intake-unit">{unit}</span>
            </span>
          ) : null}
        </div>
      </fieldset>

      {/* ---------------- 底座孔 ---------------- */}
      <fieldset className="fp-intake-fieldset" data-form-step="1">
        <legend>底座孔（冻结不动）</legend>
        <p className="fp-field-help">这些是板连接到底座的现有孔。填写孔中心距左边、下边的距离；AI 不会移动它们。</p>
        <div className="fp-intake-rows">
          <label>孔径 {lengthCell(form.baseHoles.diameter, (text) => set((d) => (d.baseHoles.diameter = text)), '底座孔径')}</label>
        </div>
        <table className="fp-intake-table">
          <thead>
            <tr>
              <th>#</th>
              <th>中心 X</th>
              <th>中心 Y</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {form.baseHoles.centers.map((center, index) => (
              <tr key={index}>
                <td>{index}</td>
                <td>{lengthCell(center.x, (text) => set((d) => (d.baseHoles.centers[index].x = text)), `孔 ${index} 中心 X`)}</td>
                <td>{lengthCell(center.y, (text) => set((d) => (d.baseHoles.centers[index].y = text)), `孔 ${index} 中心 Y`)}</td>
                <td>
                  <button
                    type="button"
                    disabled={disabled || form.baseHoles.centers.length <= 1}
                    onClick={() =>
                      set((d) => {
                        d.baseHoles.centers.splice(index, 1)
                      })
                    }
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            set((d) => {
              d.baseHoles.centers.push({ x: '', y: '' })
            })
          }
        >
          添加底座孔
        </button>
      </fieldset>

      {/* ---------------- 设备安装 ---------------- */}
      <fieldset className="fp-intake-fieldset" data-form-step="1">
        <legend>设备安装</legend>
        <p className="fp-field-help">这里填写传感器允许安装的范围。允许移动时只需给范围，具体位置由 AI 选择。</p>
        <div className="fp-intake-rows">
          <label>
            板侧安装通孔直径 {lengthCell(form.mounting.holeDiameter, (text) => set((d) => (d.mounting.holeDiameter = text)), '板侧安装孔径')}
            <span className="fp-muted">填数值；M3 等螺纹规格不是孔径</span>
          </label>
          <label>
            旋转
            <input value="0°（P0 固定）" readOnly aria-label="旋转" className="fp-intake-num" />
          </label>
        </div>
        <div className="fp-intake-rows">
          <label>
            移动许可（事实来自本表单，助手不得臆测）
            <select
              value={form.mounting.licenseMode}
              disabled={disabled}
              data-fitplate="intake-license"
              onChange={(event) => {
                const mode = event.target.value as IntakeFormState['mounting']['licenseMode']
                set((d) => (d.mounting.licenseMode = mode))
              }}
            >
              <option value="">（请选择）</option>
              {(Object.keys(LICENSE_LABELS) as Array<keyof typeof LICENSE_LABELS>).map((mode) => (
                <option key={mode} value={mode}>
                  {LICENSE_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form.mounting.licenseMode === 'fixed' ? (
          <div className="fp-intake-rows">
            <label>固定中心 X {lengthCell(form.mounting.centerX, (t) => set((d) => (d.mounting.centerX = t)), '固定中心 X')}</label>
            <label>固定中心 Y {lengthCell(form.mounting.centerY, (t) => set((d) => (d.mounting.centerY = t)), '固定中心 Y')}</label>
          </div>
        ) : null}
        {form.mounting.licenseMode === 'x_range' || form.mounting.licenseMode === 'xy_range' ? (
          <div className="fp-intake-rows">
            <span className="fp-intake-range">
              X ∈ {lengthCell(form.mounting.xMin, (t) => set((d) => (d.mounting.xMin = t)), 'X 许可下限')} …
              {lengthCell(form.mounting.xMax, (t) => set((d) => (d.mounting.xMax = t)), 'X 许可上限')}
            </span>
          </div>
        ) : null}
        {form.mounting.licenseMode === 'y_range' || form.mounting.licenseMode === 'xy_range' ? (
          <div className="fp-intake-rows">
            <span className="fp-intake-range">
              Y ∈ {lengthCell(form.mounting.yMin, (t) => set((d) => (d.mounting.yMin = t)), 'Y 许可下限')} …
              {lengthCell(form.mounting.yMax, (t) => set((d) => (d.mounting.yMax = t)), 'Y 许可上限')}
            </span>
          </div>
        ) : null}
        {form.mounting.licenseMode === 'x_range' ? (
          <div className="fp-intake-rows">
            <label>中心 Y（固定） {lengthCell(form.mounting.centerY, (t) => set((d) => (d.mounting.centerY = t)), '中心 Y')}</label>
          </div>
        ) : null}
        {form.mounting.licenseMode === 'y_range' ? (
          <div className="fp-intake-rows">
            <label>中心 X（固定） {lengthCell(form.mounting.centerX, (t) => set((d) => (d.mounting.centerX = t)), '中心 X')}</label>
          </div>
        ) : null}
      </fieldset>

      {/* ---------------- 环境 ---------------- */}
      <fieldset className="fp-intake-fieldset" data-form-step="2">
        <legend>环境（显式输入；缺字段不等于空环境）</legend>
        <p className="fp-field-help">填写板附近的立柱、螺钉头和接线空间。坐标均相对板左下角；只有确认不存在时才留空列表。</p>
        <div className="fp-intake-rows">
          <label>
            环境来源
            <select
              value={form.environment.source}
              disabled={disabled}
              data-fitplate="intake-env-source"
              onChange={(event) => {
                const source = event.target.value as IntakeFormState['environment']['source']
                set((d) => (d.environment.source = source))
              }}
            >
              <option value="">（请选择）</option>
              {SOURCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {SOURCE_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="fp-intake-wide">
            备注（可选，≤300 字）
            <input
              value={form.environment.note}
              maxLength={300}
              disabled={disabled}
              onChange={(event) => {
                const note = event.target.value
                set((d) => (d.environment.note = note))
              }}
            />
          </label>
        </div>
        <h3>固定柱（场景合同要求至少 1 个）</h3>
        <table className="fp-intake-table">
          <thead>
            <tr>
              <th>id</th>
              <th>轴心 X</th>
              <th>轴心 Y</th>
              <th>半径</th>
              <th>Z 下限</th>
              <th>Z 上限</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {form.environment.cylinders.map((cylinder, index) => (
              <tr key={index}>
                <td>
                  <input
                    value={cylinder.id}
                    disabled={disabled}
                    aria-label={`固定柱 ${index} id`}
                    onChange={(event) => {
                      const id = event.target.value
                      set((d) => (d.environment.cylinders[index].id = id))
                    }}
                  />
                </td>
                <td>{lengthCell(cylinder.x, (t) => set((d) => (d.environment.cylinders[index].x = t)), `固定柱 ${index} X`)}</td>
                <td>{lengthCell(cylinder.y, (t) => set((d) => (d.environment.cylinders[index].y = t)), `固定柱 ${index} Y`)}</td>
                <td>{lengthCell(cylinder.radius, (t) => set((d) => (d.environment.cylinders[index].radius = t)), `固定柱 ${index} 半径`)}</td>
                <td>{lengthCell(cylinder.zMin, (t) => set((d) => (d.environment.cylinders[index].zMin = t)), `固定柱 ${index} Z 下限`)}</td>
                <td>{lengthCell(cylinder.zMax, (t) => set((d) => (d.environment.cylinders[index].zMax = t)), `固定柱 ${index} Z 上限`)}</td>
                <td>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      set((d) => {
                        d.environment.cylinders.splice(index, 1)
                      })
                    }
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            set((d) => {
              d.environment.cylinders.push({ id: '', x: '', y: '', radius: '', zMin: '', zMax: '' })
            })
          }
        >
          添加固定柱
        </button>

        <h3>螺钉头包络（每个底座孔恰好 1 个）</h3>
        <table className="fp-intake-table">
          <thead>
            <tr>
              <th>底座孔 #</th>
              <th>半径</th>
              <th>Z 下限</th>
              <th>Z 上限</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {form.environment.screwHeads.map((head, index) => (
              <tr key={index}>
                <td>
                  <select
                    value={head.holeIndex}
                    disabled={disabled}
                    aria-label={`螺钉头 ${index} 底座孔`}
                    onChange={(event) => {
                      const holeIndex = event.target.value
                      set((d) => (d.environment.screwHeads[index].holeIndex = holeIndex))
                    }}
                  >
                    <option value="">（选择孔）</option>
                    {form.baseHoles.centers.map((_, holeIndex) => (
                      <option key={holeIndex} value={String(holeIndex)}>
                        #{holeIndex}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{lengthCell(head.radius, (t) => set((d) => (d.environment.screwHeads[index].radius = t)), `螺钉头 ${index} 半径`)}</td>
                <td>{lengthCell(head.zMin, (t) => set((d) => (d.environment.screwHeads[index].zMin = t)), `螺钉头 ${index} Z 下限`)}</td>
                <td>{lengthCell(head.zMax, (t) => set((d) => (d.environment.screwHeads[index].zMax = t)), `螺钉头 ${index} Z 上限`)}</td>
                <td>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      set((d) => {
                        d.environment.screwHeads.splice(index, 1)
                      })
                    }
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            set((d) => {
              const used = new Set(d.environment.screwHeads.map((row) => row.holeIndex))
              d.baseHoles.centers.forEach((_, holeIndex) => {
                if (!used.has(String(holeIndex))) {
                  d.environment.screwHeads.push({ holeIndex: String(holeIndex), radius: '', zMin: '', zMax: '' })
                }
              })
            })
          }
        >
          按底座孔补齐一行
        </button>

        <h3>连接器空间</h3>
        <div className="fp-intake-rows">
          {(
            [
              ['', '未填写（由程序追问）'],
              ['box', '给出一个盒范围'],
              ['not_covered', '明确未覆盖（不假装已验）'],
            ] as const
          ).map(([value, label]) => (
            <label className="fp-toggle" key={value || 'empty'}>
              <input
                type="radio"
                name="fp-intake-connector"
                checked={form.environment.connectorMode === value}
                disabled={disabled}
                onChange={() =>
                  set((d) => {
                    d.environment.connectorMode = value
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        {form.environment.connectorMode === 'box' ? (
          <div className="fp-intake-rows">
            <span className="fp-intake-range">
              局部 X ∈ {lengthCell(form.environment.connector.xMin, (t) => set((d) => (d.environment.connector.xMin = t)), '连接器 X 下限')} …
              {lengthCell(form.environment.connector.xMax, (t) => set((d) => (d.environment.connector.xMax = t)), '连接器 X 上限')}
            </span>
            <span className="fp-intake-range">
              局部 Y ∈ {lengthCell(form.environment.connector.yMin, (t) => set((d) => (d.environment.connector.yMin = t)), '连接器 Y 下限')} …
              {lengthCell(form.environment.connector.yMax, (t) => set((d) => (d.environment.connector.yMax = t)), '连接器 Y 上限')}
            </span>
            <span className="fp-intake-range">
              绝对 Z ∈ {lengthCell(form.environment.connector.zMin, (t) => set((d) => (d.environment.connector.zMin = t)), '连接器 Z 下限')} …
              {lengthCell(form.environment.connector.zMax, (t) => set((d) => (d.environment.connector.zMax = t)), '连接器 Z 上限')}
            </span>
          </div>
        ) : null}
        <label className="fp-toggle">
          <input
            type="checkbox"
            checked={form.environment.support}
            disabled={disabled}
            onChange={(event) => {
              const checked = event.target.checked
              set((d) => (d.environment.support = checked))
            }}
          />
          声明直接支撑：设备底面 ↔ 板顶面（P0 支撑模型）
        </label>
      </fieldset>

      {/* ---------------- 验收要求 ---------------- */}
      <fieldset className="fp-intake-fieldset" data-form-step="2">
        <legend>验收要求（四项 + 来源）</legend>
        <p className="fp-field-help">自由间隙是设备与障碍之间的空隙；孔边材料是孔到板边的剩余宽度；孔间材料是孔与孔之间的剩余宽度。</p>
        <div className="fp-intake-rows">
          <label>
            要求来源
            <select
              value={form.requirements.source}
              disabled={disabled}
              data-fitplate="intake-req-source"
              onChange={(event) => {
                const source = event.target.value as IntakeFormState['requirements']['source']
                set((d) => (d.requirements.source = source))
              }}
            >
              <option value="">（请选择）</option>
              {SOURCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {SOURCE_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="fp-intake-rows">
          <label>最小自由间隙 {lengthCell(form.requirements.clearance, (t) => set((d) => (d.requirements.clearance = t)), '最小自由间隙')}</label>
          <label>最小边缘余量 {lengthCell(form.requirements.edge, (t) => set((d) => (d.requirements.edge = t)), '最小边缘余量')}</label>
          <label>最小孔间材料 {lengthCell(form.requirements.hole, (t) => set((d) => (d.requirements.hole = t)), '最小孔间材料')}</label>
          <label>尺寸公差 {lengthCell(form.requirements.tolerance, (t) => set((d) => (d.requirements.tolerance = t)), '尺寸公差')}</label>
        </div>
      </fieldset>

      {/* ---------------- 操作 ---------------- */}
      {visibleStep >= 0 && !reviewing ? <div className="fp-intake-actions">
        <button type="button" disabled={waiting || disabled} data-fitplate="input-back" onClick={() => go(visibleStep - 1)}>{visibleStep === 0 ? '返回选择' : '上一步'}</button>
        {visibleStep < 3 ? <button type="button" className="fp-intake-primary" data-fitplate="input-next" disabled={waiting || disabled} onClick={() => go(visibleStep + 1)}>下一步：{steps[visibleStep + 1]}</button> : null}
        <button
          type="button"
          className="fp-intake-primary"
          data-fitplate="intake-submit"
          hidden={visibleStep !== 3}
          disabled={disabled || waiting || (!snapshot.validation.ok && !snapshot.validation.canSubmitForClarification)}
          onClick={() => void controller.submitRequest()}
        >
          {snapshot.phase === 'sending' ? '发送中…' : '让 AI 检查这些要求'}
        </button>
        <button type="button" data-fitplate="intake-refresh" disabled={disabled || snapshot.busy} onClick={() => void controller.refresh()}>
          刷新状态
        </button>
        <span className="fp-muted" data-fitplate="intake-validation" hidden={visibleStep !== 3}>
          {snapshot.validation.ok
            ? '表单校验通过（发送后仍由程序复核）'
            : snapshot.validation.canSubmitForClarification
              ? `缺少 ${snapshot.validation.issues.length} 项数值，可先点“让 AI 检查这些要求”并按程序追问补充；补齐前不能确认`
              : `还有 ${snapshot.validation.issues.length} 项待修正`}
        </span>
      </div> : null}
      {visibleStep === 3 && !snapshot.validation.ok ? (
        <details className="fp-intake-issues" data-fitplate="intake-issues" open>
          <summary>查看待修正项</summary>
          <ul>
            {snapshot.validation.issues.slice(0, 20).map((issue, index) => (
              <li key={index}>
                <code>{issue.path}</code>：{issue.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}


    </section>
  )
}

function InputReview({ form, onEdit }: { form: IntakeFormState; onEdit: (step: number) => void }): ReactNode {
  const device = REGISTERED_DEVICE_CARDS.find((item) => item.id === form.deviceCardId)
  return <div className="fp-input-review" data-fitplate="input-review">
    <p className="fp-review-request">{form.text || '尚未填写安装要求'}</p>
    <div className="fp-review-cards">
      <section><h3>安装对象 <button type="button" onClick={() => onEdit(0)}>修改</button></h3>
        <p>{device?.name || '设备未选择'}</p><strong>板 {form.plate.width || '待填'} × {form.plate.height || '待填'} × {form.plate.thickness || '待填'} {form.unit}</strong>
        <p>宽{form.plate.widthEditable ? '允许调整' : '固定'} · 高{form.plate.heightEditable ? '允许调整' : '固定'} · 厚度固定</p></section>
      <section><h3>AI 可以调整什么 <button type="button" onClick={() => onEdit(1)}>修改</button></h3>
        <p>{describeLicense(form)}</p><p>底座孔 {form.baseHoles.centers.length} 个，孔径 {form.baseHoles.diameter || '待填'} {form.unit}，孔位保持不变。</p></section>
      <section><h3>周围环境与检查 <button type="button" onClick={() => onEdit(2)}>修改</button></h3>
        <p>{form.environment.cylinders.length} 个固定柱 · {form.environment.screwHeads.length} 个螺钉头包络</p>
        <p>最小自由间隙 {form.requirements.clearance || '待填'} {form.unit} · 孔边材料 {form.requirements.edge || '待填'} {form.unit}</p>
        <p>环境来源：{form.environment.source ? SOURCE_LABELS[form.environment.source] : '未填写'}；要求来源：{form.requirements.source ? SOURCE_LABELS[form.requirements.source] : '未填写'}</p></section>
    </div>
    <p className="fp-field-help">设备卡来自厂商规格；示例的周围环境和检查要求为设计假设。当前仅检查软件几何，尚未验证实物装配。</p>
  </div>
}

function StatusBanner({ status }: { status: IntakeStatus }): ReactNode {
  const role = status.kind === 'error' ? 'alert' : 'status'
  return (
    <p className={`fp-alert ${status.kind === 'error' ? 'fp-alert-error' : status.kind === 'warn' ? 'fp-alert-warn' : 'fp-alert-info'}`} role={role} data-fitplate="intake-status">
      {status.title}
      {status.detail ? <span className="fp-detail">（{status.detail}）</span> : null}
    </p>
  )
}

function DeviceCardSummary({ cardId }: { cardId: string }): ReactNode {
  const card = REGISTERED_DEVICE_CARDS.find((entry) => entry.id === cardId)
  if (!card) return null
  return (
    <div className="fp-intake-device" data-fitplate="intake-device-card">
      <p className="fp-muted">
        登记设备卡：{card.name}（当前仅此 1 张，不会虚构其他卡片）。外壳包络 {card.bodySizeMm.join('×')} mm · 孔距{' '}
        {card.holePitchMm} mm · {card.threadInterface}
      </p>
      <p className="fp-muted">
        板侧通孔设计选择 ⌀{card.designHoleDiameterMm} mm（本项目设计值，非原厂尺寸）；设备来源级别：{card.sourceLevel}。
      </p>
      <p className="fp-warn">{card.note}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// confirmation card
// ---------------------------------------------------------------------------

interface DraftQuestion {
  path: string
  question: string
}
interface DraftConflict {
  path: string
  formText: string
  textText: string
}
interface DraftProposal {
  fieldPath: string
  disposition: string
  valueMm: number | null
  unitIn: string | null
  sourceKind: string
  sourceRef: string
  reason: string | null
}
interface DraftUnsupported {
  feature: string
  ref: string
}
/** A program-verified text interpretation (P1 `text_interpretations`): the model quoted real text,
 *  the program re-derived the mm value, unit and source. It is a CONSTRAINT, never a new nominal. */
interface DraftInterpretation {
  fieldPath: string
  kind: string
  quote: string
  start: number | null
  end: number | null
  valueMm: number | null
  unitIn: string | null
  sourceRef: string
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const asRecordRaw = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

function parseDraft(card: IntakeDraftCard): {
  questions: DraftQuestion[]
  conflicts: DraftConflict[]
  unsupported: DraftUnsupported[]
  proposals: DraftProposal[]
  interpretations: DraftInterpretation[]
  program: string
} {
  const draft = card.draft ?? {}
  const questions: DraftQuestion[] = asArray(draft.missing_fields).flatMap((entry) => {
    const row = asRecordRaw(entry)
    return row && typeof row.path === 'string' && typeof row.question === 'string' ? [{ path: row.path, question: row.question }] : []
  })
  const conflicts: DraftConflict[] = asArray(draft.conflicts).flatMap((entry) => {
    const row = asRecordRaw(entry)
    if (!row || typeof row.path !== 'string') return []
    const describe = (value: unknown): string => {
      const source = asRecordRaw(value)
      if (!source) return String(value ?? '')
      const kind = typeof source.kind === 'string' ? source.kind : ''
      const ref = typeof source.ref === 'string' ? source.ref : ''
      const literal = source.value !== undefined ? `=${JSON.stringify(source.value)}` : ''
      return `${kind}${ref ? `:${ref}` : ''}${literal}`
    }
    return [{ path: row.path, formText: describe(row.form), textText: describe(row.text) }]
  })
  const unsupported: DraftUnsupported[] = asArray(draft.unsupported_features).flatMap((entry) => {
    const row = asRecordRaw(entry)
    return row && typeof row.feature === 'string' ? [{ feature: row.feature, ref: typeof row.ref === 'string' ? row.ref : '' }] : []
  })
  const proposals: DraftProposal[] = asArray(draft.field_proposals).flatMap((entry) => {
    const row = asRecordRaw(entry)
    if (!row || typeof row.field_path !== 'string') return []
    const source = asRecordRaw(row.source)
    return [
      {
        fieldPath: row.field_path,
        disposition: typeof row.disposition === 'string' ? row.disposition : '',
        valueMm: typeof row.value_mm === 'number' ? row.value_mm : null,
        unitIn: typeof row.unit_in === 'string' ? row.unit_in : null,
        sourceKind: source && typeof source.kind === 'string' ? source.kind : '',
        sourceRef: source && typeof source.ref === 'string' ? source.ref : '',
        reason: typeof row.reason === 'string' ? row.reason : null,
      },
    ]
  })
  const interpretations: DraftInterpretation[] = asArray(draft.text_interpretations).flatMap((entry) => {
    const row = asRecordRaw(entry)
    if (!row || typeof row.field_path !== 'string') return []
    const quoteRow = asRecordRaw(row.quote)
    const literal = quoteRow && typeof quoteRow.literal === 'string' ? quoteRow.literal : ''
    // A verified interpretation must carry a real quote literal and a re-derived mm value; anything
    // else is dropped rather than shown as a plausible-looking fact.
    if (!literal) return []
    return [
      {
        fieldPath: row.field_path,
        kind: typeof row.kind === 'string' ? row.kind : '',
        quote: literal,
        start: quoteRow && Number.isInteger(quoteRow.start) ? (quoteRow.start as number) : null,
        end: quoteRow && Number.isInteger(quoteRow.end) ? (quoteRow.end as number) : null,
        valueMm: typeof row.value_mm === 'number' ? row.value_mm : null,
        unitIn: typeof row.unit_in === 'string' ? row.unit_in : null,
        sourceRef: typeof row.source_ref === 'string' ? row.source_ref : '',
      },
    ]
  })
  const programRow = asRecordRaw(draft.program)
  const program = programRow && typeof programRow.id === 'string' ? `${programRow.id} ${String(programRow.version ?? '')}` : ''
  return { questions, conflicts, unsupported, proposals, interpretations, program }
}

function ConfirmationCard({
  card,
  snapshot,
  onConfirm,
}: {
  card: IntakeDraftCard
  snapshot: IntakeSnapshot
  onConfirm: () => void
}): ReactNode {
  const { questions, conflicts, unsupported, proposals, interpretations, program } = parseDraft(card)
  const form = snapshot.form
  const unit = form.unit
  const factor = unit === 'mm' ? '1' : unit === 'in' ? '25.4' : unit === 'cm' ? '10' : unit === 'm' ? '1000' : '0.001'
  const ready = card.outcome === 'READY_TO_CONFIRM'
  const expired = snapshot.cardExpired

  return (
    <div className={`fp-intake-card ${expired ? 'fp-intake-card-expired' : ''}`} data-fitplate="intake-card" data-outcome={card.outcome}>
      <div className="fp-intake-card-head">
        <span className={`fp-badge ${OUTCOME_BADGE[card.outcome] ?? 'fp-outcome-unknown'}`}>{OUTCOME_LABELS[card.outcome] ?? card.outcome}</span>
        <span className="fp-muted">
          需求版本 {card.requestRevision}
          {expired ? '（已过期：输入已修改）' : ''}
        </span>
      </div>
      {expired ? <p className="fp-alert fp-alert-warn">输入已修改，这张卡不再可用于确认；请重新点击“让 AI 检查这些要求”。</p> : null}

      <div className="fp-intake-summary">
        <dl className="fp-facts">
          <dt>锁定尺寸</dt>
          <dd>
            {form.plate.width} × {form.plate.height} × {form.plate.thickness} {unit}
            {form.plate.widthEditable ? `（宽可在 [${form.plate.widthMin}, ${form.plate.widthMax}] ${unit} 内调整）` : '（宽高锁定）'}
            {form.plate.heightEditable ? `（高可在 [${form.plate.heightMin}, ${form.plate.heightMax}] ${unit} 内调整）` : ''}
          </dd>
          <dt>底座孔</dt>
          <dd>
            ⌀{form.baseHoles.diameter} {unit} × {form.baseHoles.centers.length} 个（冻结不动）
          </dd>
          <dt>设备安装</dt>
          <dd>
            通孔 ⌀{form.mounting.holeDiameter} {unit} · 旋转 0°
            {card.deviceCard ? ` · 设备卡 ${card.deviceCard.id}` : ''}
          </dd>
          <dt>允许移动范围</dt>
          <dd>{describeLicense(form)}</dd>
          <dt>单位换算</dt>
          <dd>
            发送单位 {unit}；固定换算 1 {unit} = {factor} mm，程序草稿按 mm 编译（下方 value_mm 即换算结果）
          </dd>
          <dt>验收要求</dt>
          <dd>
            间隙 ≥ {form.requirements.clearance} · 边距 ≥ {form.requirements.edge} · 孔边 ≥ {form.requirements.hole} · 公差 ±
            {form.requirements.tolerance} {unit}（来源：{form.requirements.source ? SOURCE_LABELS[form.requirements.source] : '未填'}）
            · 换算 mm：{[form.requirements.clearance, form.requirements.edge, form.requirements.hole, form.requirements.tolerance]
              .map((value) => approx(toMillimeters(Number(value) || 0, unit)))
              .join(' / ')}
          </dd>
          <dt>环境</dt>
          <dd>
            {form.environment.source ? SOURCE_LABELS[form.environment.source] : '未填'} · 固定柱 {form.environment.cylinders.length} · 螺钉头{' '}
            {form.environment.screwHeads.length} · 连接器空间{' '}
            {form.environment.connectorMode === 'not_covered' ? '明确未覆盖' : form.environment.connectorMode === 'box' ? '盒范围' : '未填写'}
          </dd>
        </dl>
      </div>

      {questions.length > 0 ? (
        <div className="fp-intake-block">
          <h3>程序待澄清（{questions.length}）</h3>
          <ul>
            {questions.map((question, index) => (
              <li key={index}>
                <code>{question.path}</code>：{question.question}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {conflicts.length > 0 ? (
        <div className="fp-intake-block fp-warn">
          <h3>程序发现冲突（{conflicts.length}）</h3>
          <ul>
            {conflicts.map((conflict, index) => (
              <li key={index}>
                <code>{conflict.path}</code>：表单 {conflict.formText} ↔ 文本 {conflict.textText}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {unsupported.length > 0 ? (
        <div className="fp-intake-block fp-warn">
          <h3>超出现有支持范围（{unsupported.length}）</h3>
          <ul>
            {unsupported.map((item, index) => (
              <li key={index}>
                {item.feature}（{item.ref}）
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {questions.length === 0 && conflicts.length === 0 && unsupported.length === 0 ? (
        <p className="fp-muted">程序未给出待澄清/冲突/超范围项；草稿状态：{OUTCOME_LABELS[card.outcome] ?? card.outcome}。</p>
      ) : null}

      {interpretations.length > 0 ? (
        <div className="fp-intake-block fp-intake-interpretations" data-fitplate="intake-interpretations">
          <h3>程序已核验的原文约束（{interpretations.length}）</h3>
          <p className="fp-muted">
            下列条目是模型从真实附件原文中引用的文本片段，程序已重新核对原文并复算毫米值。它们是<strong>约束</strong>，不是新的名义尺寸：
            例如板宽锁定 80 且原文给出上限 90 时，仍以锁定的 80 为准，上限只是“不得超过”。来源均为软件几何，未做实物验证。
          </p>
          <ul>
            {interpretations.map((item, index) => (
              <li key={index} data-fitplate="intake-interpretation">
                <div>
                  <code>{item.fieldPath}</code>
                  <span className="fp-muted"> · {item.kind === 'upper_bound' ? '上限（不得超过）' : item.kind || '未标注'}</span>
                </div>
                <blockquote className="fp-intake-quote">
                  原文：{item.quote}
                  {item.start !== null && item.end !== null ? `（字符偏移 ${item.start}–${item.end}）` : ''}
                </blockquote>
                <div className="fp-muted">
                  程序复算：≤ {item.valueMm === null ? '—' : approx(item.valueMm)} mm
                  {item.unitIn ? `（原文单位 ${item.unitIn}）` : ''}
                  {item.sourceRef ? ` · 来源 ${item.sourceRef}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {proposals.length > 0 ? (
        <details className="fp-intake-block">
          <summary>程序字段提议（{proposals.length}，只读）</summary>
          <table className="fp-intake-table">
            <thead>
              <tr>
                <th>字段</th>
                <th>处置</th>
                <th>value_mm</th>
                <th>输入单位</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {proposals.slice(0, 40).map((proposal, index) => (
                <tr key={index}>
                  <td>
                    <code>{proposal.fieldPath}</code>
                    {proposal.valueMm === null && proposal.reason ? (
                      // A movable domain has no program-selected scalar: show the program's own
                      // reason (the licensed range) as wrapped plain text instead of a bare dash.
                      <div className="fp-muted fp-intake-proposal-reason" data-fitplate="intake-proposal-reason">
                        {proposal.reason}
                      </div>
                    ) : null}
                  </td>
                  <td>{proposal.disposition}</td>
                  <td>{proposal.valueMm === null ? '—' : approx(proposal.valueMm)}</td>
                  <td>{proposal.unitIn ?? '—'}</td>
                  <td>
                    {proposal.sourceKind}
                    {proposal.sourceRef ? `:${proposal.sourceRef}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}

      <div className="fp-intake-confirm">
        <button
          type="button"
          className="fp-intake-primary"
          data-fitplate="intake-confirm"
          disabled={snapshot.busy || !snapshot.confirmable || expired}
          onClick={onConfirm}
        >
          {snapshot.phase === 'confirming' ? '核对中…' : '确认条件，开始设计'}
        </button>
        <p className="fp-muted">
          {ready
            ? '“输入完整一致”只表示可以核对确认，不表示有解或已通过验证。'
            : '当前草稿还不能确认：请先按上面的问题修改输入，再重新点“让 AI 检查这些要求”。'}
        </p>
        <p className="fp-muted">
          确认后，AI 会建模并检查。若上方出现权限卡，请核对工具后点 Allow once（允许一次）。结果会显示在本面板。
        </p>
      </div>

      {snapshot.confirmation || snapshot.frozen ? (
        <div className="fp-intake-block">
          <h3>冻结状态</h3>
          <p className="fp-muted">
            {snapshot.frozen
              ? `程序已登记冻结：任务修订 ${snapshot.frozen.revision ?? '未知'}（上一版本的结果不代表本版本；任务身份见诊断区）`
              : '确认已发出，等待程序登记冻结结果…'}
          </p>
        </div>
      ) : null}

      <details className="fp-intake-block fp-intake-diagnostics" data-fitplate="intake-diagnostics">
        <summary>诊断信息（引用与哈希）</summary>
        <ul className="fp-muted">
          <li>request_id：{card.requestId}</li>
          <li>请求附件引用：{card.attachmentRef}</li>
          <li>请求附件字节 SHA-256：{card.attachmentSha256}</li>
          <li>草稿 draft_hash：{card.draftHash}</li>
          {snapshot.confirmation ? <li>确认附件字节 SHA-256：{snapshot.confirmation.sha256}</li> : null}
          {snapshot.frozen ? (
            <li>
              任务身份：{snapshot.frozen.taskId ?? '未知'} · 修订 {snapshot.frozen.revision ?? '未知'}
            </li>
          ) : null}
          {card.stagedAt ? <li>登记时间：{card.stagedAt}</li> : null}
          {program ? <li>编译器：{program}</li> : null}
          {card.notes ? <li>服务说明：{card.notes}</li> : null}
        </ul>
      </details>
    </div>
  )
}
