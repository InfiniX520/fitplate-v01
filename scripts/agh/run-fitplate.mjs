// Real-model FitPlate session driver (T07/T10; Plan1 sections 7, 10, 13, 16).
//
// One session = one isolated workspace = one real model turn sequence through the official AGH
// SDK. What this file guarantees, because the teaching run and the A/B evaluation both rest on it:
//
//   * the model is driven through `client.session.*` (official SDK), never through a hand-written
//     request; `setModel` uses the route/model this instance's config actually serves, and the
//     thinking tier is resolved from that model's own declaration (highest declared tier; omitted
//     entirely when the model declares none - an override must be a declared tier);
//   * write-tool approvals are answered through the official SDK permission surface
//     (`session.onPermissionRequest`); the handler allows only the five `fitplate_*` tools and
//     rejects everything else. This is *not* a hard tool allow-list: the daemon build only raises
//     approval questions for tools whose preset marks them `requiresApproval`, and the documented
//     `tools.core` preset is not consumed by this runtime (review 008/009), so a tool that never
//     asks is never seen by the handler. The compensating control is the full tool-call audit below:
//     every observed call is checked against the workspace boundary and any touch of developer
//     material marks the trial contaminated. `--approval yolo` uses the documented full-permission
//     switch `session.setYolo(true)` instead - both are official, neither edits the profile or
//     fakes a ticket. Every question and decision is recorded;
//   * a session is bounded by the controller (`--timeout-ms`, default and maximum 5 minutes); on
//     timeout the turn is cancelled through `session.cancel()` and the outcome is recorded as
//     cancelled - never as "no solution";
//   * evidence is native: `agh export --format agnes` plus the HTML timeline, parsed for the
//     tool/call <-> tool/result pairs by `toolUseId`. Reasoning/thinking parts are never read,
//     printed or scored;
//   * the workspace receives *inputs only* (one task's task/scene/initial-design plus the generic
//     method skill). Copied files and their hashes are recorded; no label, no test, no Plan text
//     ever enters a session workspace, and every tool call is audited for contamination.
//
// Usage (teaching run):
//   <AGH_SOURCE_ROOT>/node_modules/.bin/tsx scripts/agh/run-fitplate.mjs \
//     --task sensor-swap-01 [--revision 1] [--workspace <dir>] [--timeout-ms 300000] \
//     [--approval handler|yolo] [--expect workflow|pass|normal|refuse] [--thinking <tier>]
//   --expect workflow  only the interface chain (load/build/validate paired, seed respected)
//   --expect pass      a repair completion: shipped seed FAILed, a different candidate PASSed
//   --expect normal    a normal completion: the final candidate is bound-PASS and exported
//   --expect refuse    a correct refusal: the program itself returned NEEDS_INPUT/INFEASIBLE and
//                       nothing was certified or exported (a transport error is never a refusal)
// Exit codes: 0 objective verified · 2 usage · 3 precondition (daemon/skill/workspace) ·
//             4 refused: native evidence missing or the objective was not met (honest negative)
//
// This file is also the session library for `scripts/evaluate-models.mjs` (see the exports at the
// bottom); the CLI entry only runs when the file is executed directly.

import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  EXIT,
  FITPLATE_ROOT,
  THINKING_ORDER,
  config,
  declaredThinkingLevels,
  fail,
  main,
  openClient,
  closeClient,
  printInfo,
  runAgnes,
} from './lib.mjs'
import { CASES_DIR, FIXTURES_DIR, TASK_ID_PATTERN, copyMethodSkill, copyTaskInputs } from '../prepare-workspace.mjs'

export { FITPLATE_ROOT }

export const SKILL_NAME = 'fitplate-design'
export const SKILL_SOURCE = join(FITPLATE_ROOT, '.agh', 'skills', SKILL_NAME, 'SKILL.md')
export const TOOL_NAMES = [
  'fitplate_load_task',
  'fitplate_build_candidate',
  'fitplate_validate_candidate',
  'fitplate_get_run',
  'fitplate_export_package',
]
export const SESSION_TIMEOUT_MAX_MS = 300_000
export const SESSION_TIMEOUT_DEFAULT_MS = 300_000

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
const sha256File = async (path) => sha256(await readFile(path))
/** A real SHA-256 in hex - a null, missing or short hash is missing evidence, never a pass. */
const isSha256Hex = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
const commandId = (kind) => `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const isInside = (root, candidate) => {
  const rel = relative(resolve(root), resolve(candidate))
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${sep}`))
}

// ---------------------------------------------------------------------------
// Workspace preparation (inputs only)
// ---------------------------------------------------------------------------

/**
 * Create one session workspace: `input/tasks/<task_id>/{task.json, <task_id>.scene.json,
 * initial-design.json}` plus `.agh/skills/fitplate-design/SKILL.md`.
 *
 * `taskFile` allows the M04 revision-2 variant to be installed under the frozen name
 * `task.json` - the workspace always looks like a normal task directory.
 */
export async function prepareSessionWorkspace({ name, caseDir, taskId, taskFile, workspaceRoot, includeInitial = true }) {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(name)) fail(EXIT.USAGE, `unsafe workspace name ${JSON.stringify(name)}`)
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(taskId)) fail(EXIT.USAGE, `unsafe task id ${JSON.stringify(taskId)}`)
  const root = workspaceRoot ?? join(FITPLATE_ROOT, 'runs', 'sessions', name)
  await mkdir(join(root, 'input', 'tasks', taskId), { recursive: true })

  const copied = []
  const copyOne = async (source, targetName) => {
    const target = join(root, 'input', 'tasks', taskId, targetName)
    await copyFile(source, target)
    copied.push({
      name: join('input', 'tasks', taskId, targetName),
      source,
      source_sha256: await sha256File(source),
      sha256: await sha256File(target),
    })
  }

  const taskPath = join(caseDir, taskFile ?? 'task.json')
  const taskDoc = JSON.parse(await readFile(taskPath, 'utf8'))
  if (taskDoc.task_id !== taskId) {
    fail(EXIT.REFUSED, `case dir ${caseDir} ships task ${taskDoc.task_id}, expected ${taskId}`)
  }
  await copyOne(taskPath, 'task.json')
  await copyOne(join(caseDir, taskDoc.scene_ref), taskDoc.scene_ref)
  let initialDesign = null
  if (includeInitial) {
    try {
      const initialName = taskFile ? taskFile.replace(/^task/, 'initial-design') : 'initial-design.json'
      const initialPath = join(caseDir, initialName)
      await stat(initialPath)
      await copyOne(initialPath, 'initial-design.json')
      initialDesign = JSON.parse(await readFile(initialPath, 'utf8'))
    } catch {
      // No initial candidate for this task (F01): nothing to copy, nothing to invent.
    }
  }

  const skillDir = join(root, '.agh', 'skills', SKILL_NAME)
  await mkdir(skillDir, { recursive: true })
  await copyFile(SKILL_SOURCE, join(skillDir, 'SKILL.md'))
  copied.push({
    name: join('.agh', 'skills', SKILL_NAME, 'SKILL.md'),
    source: SKILL_SOURCE,
    source_sha256: await sha256File(SKILL_SOURCE),
    sha256: await sha256File(join(skillDir, 'SKILL.md')),
  })

  const manifest = {
    schema_version: '1.0',
    kind: 'fitplate-session-workspace',
    name,
    workspace_root: root,
    task_id: taskId,
    task_revision: taskDoc.revision,
    task_file_installed: taskFile ?? 'task.json',
    case_dir: caseDir,
    created_at: new Date().toISOString(),
    copied,
    note: 'inputs only: the frozen task, the scene it pins, the initial candidate (when the task ships one) and the generic method skill',
  }
  await writeFile(join(root, 'workspace-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return { workspaceRoot: root, manifest, task: taskDoc, initialDesign }
}

/**
 * Where a `--case` id lives: exactly the public registration prepare-workspace.mjs uses (the dev
 * fixtures and the evaluation input cases - never `evaluation/private`, never an arbitrary path).
 */
export function resolveRegisteredCase(caseId) {
  if (typeof caseId !== 'string' || !TASK_ID_PATTERN.test(caseId)) fail(EXIT.USAGE, `--case id 非法：${JSON.stringify(caseId)}`)
  for (const base of [FIXTURES_DIR, CASES_DIR]) {
    const dir = join(base, caseId)
    if (existsSync(join(dir, 'task.json'))) return dir
  }
  fail(EXIT.REFUSED, `--case ${caseId} 不在公开输入注册中（fixtures/dev 或 evaluation/input-cases）；不接受任意路径`)
}

/**
 * Case-path workspace (the eight-gate调试 inputs): copies through the same public registration as
 * prepare-workspace.mjs (`copyTaskInputs`: frozen inputs, explicit unit conversion, refusal
 * instead of guessing) and installs the method skill. Inputs that are missing *on purpose*
 * (F01 has no hole spacing) are copied as-is - nothing local pre-empts the program refusal the
 * model must observe from fitplate_load_task.
 */
export async function prepareCaseWorkspace({ name, caseId, workspaceRoot }) {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(name)) fail(EXIT.USAGE, `unsafe workspace name ${JSON.stringify(name)}`)
  const caseDir = resolveRegisteredCase(caseId)
  const root = workspaceRoot ?? join(FITPLATE_ROOT, 'runs', 'sessions', name)
  await mkdir(root, { recursive: true })
  let copied
  let standardization = null
  try {
    ;({ copied, standardization } = await copyTaskInputs({ taskId: caseId, workspaceRoot: root }))
  } catch (error) {
    fail(error?.code === 2 ? EXIT.USAGE : EXIT.REFUSED, `--case ${caseId}: ${error?.message ?? error}`)
  }
  await copyMethodSkill({ workspaceRoot: root })
  const taskPath = join(root, 'input', 'tasks', caseId, 'task.json')
  const taskDoc = JSON.parse(await readFile(taskPath, 'utf8'))
  if (taskDoc.task_id !== caseId) fail(EXIT.REFUSED, `case ${caseId} ships task ${taskDoc.task_id}, expected ${caseId}`)
  let initialDesign = null
  try {
    initialDesign = JSON.parse(await readFile(join(root, 'input', 'tasks', caseId, 'initial-design.json'), 'utf8'))
  } catch {
    // No seed candidate in this case: nothing to copy, nothing to invent.
  }
  const manifest = {
    schema_version: '1.0',
    kind: 'fitplate-session-workspace',
    name,
    workspace_root: root,
    task_id: caseId,
    task_revision: taskDoc.revision,
    task_file_installed: 'task.json',
    case_dir: caseDir,
    created_at: new Date().toISOString(),
    copied: await Promise.all(
      [...new Set(copied)].map(async (file) => {
        const path = join(root, 'input', 'tasks', caseId, file)
        return { name: join('input', 'tasks', caseId, file), source: join(caseDir, file), sha256: await sha256File(path) }
      }),
    ),
    skill: { source: SKILL_SOURCE, sha256: await sha256File(join(root, '.agh', 'skills', SKILL_NAME, 'SKILL.md')) },
    standardization,
    note: 'inputs only via the public registration (fixtures/dev or evaluation/input-cases); no labels, no tests, no answers',
  }
  await writeFile(join(root, 'workspace-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return { workspaceRoot: root, manifest, task: taskDoc, initialDesign }
}

/** Install the M04 revision-2 task in place of revision 1 (a driver action, never a model one). */
export async function swapTaskRevision({ workspaceRoot, taskId, caseDir, taskFile = 'task.revision-2.json' }) {
  const source = join(caseDir, taskFile)
  const target = join(workspaceRoot, 'input', 'tasks', taskId, 'task.json')
  const before = await sha256File(target)
  await copyFile(source, target)
  const doc = JSON.parse(await readFile(source, 'utf8'))
  return { task_revision: doc.revision, sha256_before: before, sha256_after: await sha256File(target), source }
}

// ---------------------------------------------------------------------------
// Skill enablement (official resource-control client, never the interactive CLI)
// ---------------------------------------------------------------------------

async function loadResourceClient(cfg) {
  const entry = pathToFileURL(join(cfg.aghSourceRoot, 'packages', 'resource-control-client-node', 'src', 'index.ts')).href
  const mod = await import(entry)
  return mod.createResourceControlClient
}

async function waitResourceOperation(client, profile, receipt, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const operation = await client.resources.operation.get({ profile, operationId: receipt.operationId })
    if (['succeeded', 'failed', 'cancelled'].includes(operation.state)) {
      if (operation.state !== 'succeeded') {
        const detail = operation.lastSafeError ? `${operation.lastSafeError.code}: ${operation.lastSafeError.message}` : operation.state
        fail(EXIT.REFUSED, `${label} 未成功（${detail}，operationId=${receipt.operationId}）`)
      }
      return operation
    }
    if (Date.now() > deadline) fail(EXIT.REFUSED, `${label} 等待超时（operationId=${receipt.operationId}）`)
    await new Promise((done) => setTimeout(done, 300))
  }
}

/**
 * Register the workspace and make the method skill actually usable by a session: refresh the
 * workspace skill root, trust the revision, enable it, then verify trust/desired/actual/winner
 * from a fresh read. A skill on disk that was never trusted is not a skill the model may use.
 */
/**
 * Pick the ONE skill this call is about: the method skill registered in *this* workspace's
 * `workspace-agnes` root. Everything else - the same name in another workspace, a user/package
 * copy, a shadowed loser - is not a substitute: returning one of those would silently certify a
 * skill the model never gets. Returns null when the target is absent (the caller refuses).
 */
export function selectWorkspaceSkill(entries, { workspaceId, name = SKILL_NAME } = {}) {
  if (!Array.isArray(entries) || !workspaceId) return null
  return (
    entries.find(
      (item) =>
        item?.kind === 'skill' &&
        item.name === name &&
        item.workspaceId === workspaceId &&
        item.sourceIdentity?.scope === 'workspace' &&
        item.sourceIdentity?.rootKey === 'workspace-agnes',
    ) ?? null
  )
}

/** Every page of the resource list must be bound to the workspace the caller asked about. */
async function listWorkspaceSkills(resources, profile, workspaceId) {
  const entries = []
  let cursor
  for (;;) {
    const page = await resources.resources.list({
      profile,
      kind: 'skill',
      workspaceId,
      ...(cursor ? { cursor } : {}),
    })
    entries.push(...page.items)
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return entries
}

/**
 * One bounded refresh to let a just-trusted/enabled skill actually become ready: the store's
 * first scan can report `actual: disabled` even though trust/desired are already correct. Exactly
 * one refresh per call - never a retry loop, and it never rewrites `actual` or swallows an error.
 */
async function refreshWorkspaceSkills(resources, client, profile, clientId, workspaceId) {
  const receipt = await resources.skills.refresh({
    profile, clientId, commandId: commandId('skill-refresh'), rootKey: 'workspace-agnes', workspaceId,
  })
  await waitResourceOperation(client, profile, receipt, 'skills.refresh')
}

/**
 * The exact target identity a fresh read must still carry: the same resourceId and revision, the
 * same workspace, the method's own name, kind and workspace-agnes source scope. A read that loses
 * any of these is a different resource and is refused - never "close enough".
 */
function assertSkillTarget(descriptor, { workspaceId, resourceId, revision, where }) {
  const source = descriptor?.sourceIdentity ?? {}
  const problems = []
  if (descriptor?.resourceId !== resourceId) problems.push(`resourceId=${descriptor?.resourceId}`)
  if (descriptor?.kind !== 'skill') problems.push(`kind=${descriptor?.kind}`)
  if (descriptor?.name !== SKILL_NAME) problems.push(`name=${descriptor?.name}`)
  if (descriptor?.workspaceId !== workspaceId) problems.push(`workspaceId=${descriptor?.workspaceId}`)
  if (source.scope !== 'workspace') problems.push(`scope=${source.scope}`)
  if (source.rootKey !== 'workspace-agnes') problems.push(`rootKey=${source.rootKey}`)
  if (revision !== undefined && descriptor?.revision !== revision) problems.push(`revision=${descriptor?.revision}≠${revision}`)
  if (problems.length) {
    fail(EXIT.REFUSED, `skill ${SKILL_NAME} ${where}与目标不符：${problems.join(' ')}（${descriptor?.resourceId ?? '?'}）`)
  }
}

/**
 * Strict final check: the exact workspace/revision identity above, plus trusted, enabled,
 * actually ready and winner. `resolution.shadowed` lists the LOWER-priority copies this winner
 * shadows (see the runtime's `actualFor`): a winner with a non-empty shadowed list is the normal,
 * usable state - only `winner !== true` (this resource shadowed by a higher-priority source, its
 * `actual` then `unavailable`) is refused.
 */
function assertSkillReady(verified, { workspaceId, resourceId, revision }) {
  assertSkillTarget(verified, { workspaceId, resourceId, revision, where: '终态' })
  const problems = []
  if (verified?.trust !== 'trusted') problems.push(`trust=${verified?.trust}`)
  if (verified?.desired !== 'enabled') problems.push(`desired=${verified?.desired}`)
  if (verified?.actual !== 'ready') problems.push(`actual=${verified?.actual}`)
  if (verified?.resolution?.winner !== true) problems.push(`winner=${verified?.resolution?.winner}`)
  if (problems.length) {
    fail(EXIT.REFUSED, `skill ${SKILL_NAME} 状态不足：${problems.join(' ')}（${verified?.resourceId ?? '?'}）`)
  }
}

/**
 * Register the workspace and make the method skill actually usable by a session: refresh the
 * workspace skill root, trust the exact revision, enable it, then verify trust/desired/actual/
 * winner from a fresh read - bound to THIS workspace, never a same-named copy elsewhere.
 */
export async function ensureSkillReady({ client, profile, clientId, workspaceRoot, createResourceControlClient }) {
  const factory = createResourceControlClient ?? (await loadResourceClient(config()))
  const resources = factory(client)

  const added = await client.workspace.add(workspaceRoot)
  const workspaceId = added.workspace.workspaceId
  if (!workspaceId) fail(EXIT.REFUSED, `workspace.add 未返回 workspaceId（${workspaceRoot}）`)

  await refreshWorkspaceSkills(resources, client, profile, clientId, workspaceId)

  let skill = selectWorkspaceSkill(await listWorkspaceSkills(resources, profile, workspaceId), { workspaceId })
  if (!skill) {
    fail(EXIT.REFUSED, `refresh 后在 workspace ${workspaceId} 的 workspace-agnes 根下没有找到 ${SKILL_NAME}（同名其它目录的 skill 不算）`)
  }

  if (skill.trust !== 'trusted') {
    const trusted = await resources.skills.trustSet({
      profile, resourceId: skill.resourceId, expectedRevision: skill.revision, trust: 'trusted', clientId, commandId: commandId('skill-trust'),
    })
    await waitResourceOperation(client, profile, trusted, 'skills.trust.set')
  }
  if (skill.desired !== 'enabled') {
    const enabled = await resources.resources.desiredSet({
      profile, resourceId: skill.resourceId, state: 'enabled', expectedRevision: skill.revision,
      config: { kind: 'none' }, clientId, commandId: commandId('skill-enable'),
    })
    await waitResourceOperation(client, profile, enabled, 'resources.desired.set')
  }

  let verified = await resources.resources.get({ profile, resourceId: skill.resourceId })
  // The revision must not move under us: the trust/enable above were granted for ONE revision,
  // and a fresh read that names a different one is refused here rather than chased by approving
  // whatever the store now reports.
  assertSkillTarget(verified, { workspaceId, resourceId: skill.resourceId, revision: skill.revision, where: '校验时' })
  // The store's first scan can lag a fresh trust/enable: trust+desired read correct while actual
  // is still `disabled`. One refresh fixes that; it is never repeated and never forced.
  if (verified.trust === 'trusted' && verified.desired === 'enabled' && verified.actual !== 'ready') {
    await refreshWorkspaceSkills(resources, client, profile, clientId, workspaceId)
    verified = await resources.resources.get({ profile, resourceId: skill.resourceId })
  }
  assertSkillReady(verified, { workspaceId, resourceId: skill.resourceId, revision: skill.revision })
  return {
    workspaceId,
    skill: {
      resourceId: verified.resourceId,
      name: verified.name,
      revision: verified.revision,
      trust: verified.trust,
      desired: verified.desired,
      actual: verified.actual,
      winner: verified.resolution?.winner ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Session driving
// ---------------------------------------------------------------------------

/** The approval policy the driver answers permission questions with. */
export function allowlistPolicy({ allowedTools = TOOL_NAMES, verdict = 'allowed-session' } = {}) {
  return (request) => {
    const name = request?.toolCall?._meta?.['ai.agnes.harness']?.tool ?? request?.toolCall?.toolCallId
    if (allowedTools.includes(name)) return { verdict }
    return { verdict: 'rejected' }
  }
}

/**
 * Run one model session: create it, set the model, wire approval answering, prompt up to
 * `turns.length` times, cancel on the controller deadline.
 *
 * `onApproval(request, decision)` observes every question; `onBeforeToolExecution` is *not* a hook
 * here - deterministic fault injection uses the approval callback (see evaluate-models.mjs).
 */
export async function runModelSession({
  client,
  profile,
  workspaceRoot,
  route,
  model,
  thinking, // deliberately defaultless: an omitted tier must never be invented by a JS default
  turns,
  timeoutMs = SESSION_TIMEOUT_DEFAULT_MS,
  approvalMode = 'handler',
  onApproval = () => {},
  betweenTurns = async () => {},
  sessionId: requestedSessionId,
}) {
  if (!Array.isArray(turns) || turns.length === 0) fail(EXIT.USAGE, '至少需要一个 prompt')
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > SESSION_TIMEOUT_MAX_MS) {
    fail(EXIT.USAGE, `--timeout-ms 必须在 1..${SESSION_TIMEOUT_MAX_MS} 之间（controller 上限 5 分钟）`)
  }
  if (!['handler', 'yolo', 'deny'].includes(approvalMode)) fail(EXIT.USAGE, `未知 approval 模式 ${approvalMode}`)

  await client.workspace.add(workspaceRoot)
  const session = await client.session.new({ cwd: workspaceRoot, ...(requestedSessionId ? { sessionKey: requestedSessionId } : {}) })

  const approvals = []
  if (approvalMode === 'handler') {
    const decide = allowlistPolicy({ verdict: 'allowed-session' })
    session.onPermissionRequest(async (request) => {
      const name = request?.toolCall?._meta?.['ai.agnes.harness']?.tool ?? '(unknown)'
      const decision = decide(request)
      approvals.push({
        toolCallId: request?.toolCall?.toolCallId,
        tool: name,
        title: request?.toolCall?.title,
        verdict: decision.verdict,
        deadlineMs: request?.deadlineMs ?? null,
        decided_at: new Date().toISOString(),
      })
      // Awaited on purpose: the decision must not be returned before any pre-execution hook
      // (the F04 STEP truncation) has finished, or the tool could execute against the old bytes.
      // The daemon only proceeds to execution after this handler resolves - that ordering is the
      // deterministic part of the injection, not a race.
      await onApproval(request, decision)
      return decision
    })
  } else if (approvalMode === 'deny') {
    session.onPermissionRequest(async (request) => {
      const name = request?.toolCall?._meta?.['ai.agnes.harness']?.tool ?? '(unknown)'
      approvals.push({ toolCallId: request?.toolCall?.toolCallId, tool: name, verdict: 'rejected', decided_at: new Date().toISOString() })
      return { verdict: 'rejected' }
    })
  }

  // Never let a JS default smuggle a DS parameter onto a model that declares none: an omitted
  // tier is resolved from this instance's own account declaration (DS keeps its declared max),
  // and when that declaration cannot be read nothing is sent - the safe direction. An explicit
  // tier is sent as given. The resolveSessionThinking call is the same function run-fitplate's
  // caller uses, so both paths agree on "highest declared tier or none".
  let effectiveThinking = thinking
  if (effectiveThinking === undefined) {
    let snapshot = null
    try {
      snapshot = typeof client.config?.get === 'function' ? await client.config.get() : null
    } catch {
      snapshot = null
    }
    effectiveThinking = snapshot ? resolveSessionThinking(snapshot, undefined).thinking : undefined
  }
  const modelResult = await session.setModel({ slot: 'primary', route, model, ...(effectiveThinking ? { thinking: effectiveThinking } : {}) })
  let yolo = null
  if (approvalMode === 'yolo') yolo = await session.setYolo(true)

  const results = []
  const startedAt = Date.now()
  let cancelled = false
  for (const [index, text] of turns.entries()) {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      cancelled = true
      controller.abort()
    }, timeoutMs)
    const turnStart = Date.now()
    let outcome
    try {
      outcome = await session.prompt(text, { signal: controller.signal })
    } catch (error) {
      outcome = { reason: 'error', stopReason: 'error', error: error instanceof Error ? error.message : String(error) }
    } finally {
      clearTimeout(timer)
    }
    results.push({
      turn: index + 1,
      elapsed_ms: Date.now() - turnStart,
      stopReason: outcome?.stopReason,
      reason: outcome?.reason,
      // Honest terminal classification, reason-first: only `reason === 'completed'` is a normal
      // finish. `blocked` stays BLOCKED even when the SDK reports stopReason=end_turn - the
      // stop reason must never mask the outcome; a transport/internal failure is a model-side
      // error and a controller timeout is a cancellation - neither is a design result.
      classification: cancelled
        ? 'CANCELLED_TIMEOUT'
        : outcome?.reason === 'error'
          ? 'MODEL_ERROR'
          : outcome?.reason === 'completed'
            ? 'COMPLETED'
            : outcome?.reason === 'blocked'
              ? 'BLOCKED'
              : typeof outcome?.reason === 'string'
                ? `STOPPED:${outcome.reason}`
                : (outcome?.stopReason ?? null),
      credits: outcome?.credits ?? null,
      error: outcome?.error,
      timed_out: cancelled && index === turns.length - 1,
    })
    if (cancelled) break
    if (index < turns.length - 1) await betweenTurns(index)
  }
  if (cancelled) await session.cancel().catch(() => undefined)

  return {
    sessionId: session.id,
    model_set: modelResult ?? null,
    yolo,
    approvals,
    turns: results,
    elapsedMs: Date.now() - startedAt,
    cancelled,
    detach: () => session.detach().catch(() => undefined),
  }
}

// ---------------------------------------------------------------------------
// Deterministic F04 fault injection (evaluation-only)
// ---------------------------------------------------------------------------

/**
 * The F04 fault injector: when the model's `fitplate_validate_candidate` call raises a permission
 * question, this callback runs *before* the tool executes (the approval gate decides first), halves
 * the stored `model.step` and records the before/after hashes. That ordering is what makes the
 * injection deterministic - no file watching, no race: by the time the validator reads the STEP the
 * bytes are already truncated, so the model observes a real read/import fault.
 *
 * `state.record.mode === 'model'` marks the path where the hook actually fired; a validation call
 * that never raises a question (the pre-009 preset has write-only approval) leaves `record === null`
 * and the caller must fall back to the offline-only classification and mark the model half
 * unverified - never count it as a success.
 */
export function createStepTruncationInjector({ workspaceRoot, enabled = true }) {
  const state = { armed: Boolean(enabled), done: false, record: null }
  state.onApproval = async (request) => {
    if (!state.armed || state.done) return
    const tool = request?.toolCall?._meta?.['ai.agnes.harness']?.tool
    if (tool !== 'fitplate_validate_candidate') return
    const args = request?.toolCall?.rawInput
    if (!args?.run_id || !args?.candidate_id) return
    const stepPath = join(workspaceRoot, 'runs', args.run_id, 'candidates', args.candidate_id, 'model.step')
    try {
      const before = await readFile(stepPath)
      const truncated = before.subarray(0, Math.floor(before.length / 2))
      await writeFile(stepPath, truncated)
      state.done = true
      state.record = {
        path: stepPath,
        run_id: args.run_id,
        candidate_id: args.candidate_id,
        sha256_before: sha256(before),
        sha256_after: sha256(truncated),
        bytes_before: before.length,
        bytes_after: truncated.length,
        mode: 'model',
      }
    } catch (error) {
      // The fault was never injected: mark it as an injection error so the trial cannot count the
      // model-behaviour half as verified (only a completed truncation sets mode 'model').
      state.record = { mode: 'inject-error', error: error.message }
    }
  }
  return state
}

// ---------------------------------------------------------------------------
// Native evidence: export + analysis (never reads reasoning)
// ---------------------------------------------------------------------------

export async function exportSessionEvidence(sessionId, outDir) {
  await mkdir(outDir, { recursive: true })
  const jsonlPath = join(outDir, `${sessionId}.agnes.jsonl`)
  const htmlPath = join(outDir, `${sessionId}.html`)
  const agnes = await runAgnes(['export', sessionId, '--format', 'agnes', '-o', jsonlPath], { timeoutMs: 120_000 })
  if (agnes.code !== 0) fail(EXIT.REFUSED, `agnes 格式导出失败（exit ${agnes.code}）：${agnes.stderr.trim().slice(0, 300)}`)
  const html = await runAgnes(['export', sessionId, '--html', '-o', htmlPath], { timeoutMs: 120_000 })
  if (html.code !== 0) fail(EXIT.REFUSED, `HTML 导出失败（exit ${html.code}）`)
  return { jsonlPath, htmlPath, jsonl_sha256: await sha256File(jsonlPath), html_sha256: await sha256File(htmlPath) }
}

/**
 * Parse the native Agnes JSONL. Only observable actions are extracted; `thinking` parts are
 * dropped on sight so they can neither be printed nor scored.
 */
export function analyzeNativeEvents(jsonlText) {
  const rows = []
  for (const [index, line] of jsonlText.split('\n').entries()) {
    if (!line.trim()) continue
    try {
      rows.push(JSON.parse(line))
    } catch {
      return { ok: false, reason: `JSONL 第 ${index + 1} 行无法解析` }
    }
  }
  const calls = []
  const results = new Map()
  const approvals = []
  const turnEnds = []
  const turnEndDetails = []
  const modelSettings = []
  let yoloSwitch = null
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, credits: 0, usdMicros: 0, entries: 0 }
  const finalTextParts = []
  const rowTypes = {}

  for (const row of rows) {
    const type = row?.type
    rowTypes[type] = (rowTypes[type] ?? 0) + 1
    const data = row?.data ?? {}
    switch (type) {
      case 'session/start':
        if (Array.isArray(data.modelSettings)) modelSettings.push(...data.modelSettings)
        break
      case 'x/core/yolo-switch':
        yoloSwitch = data
        break
      case 'tool/call':
        calls.push({
          toolUseId: data.toolUseId,
          name: data.name,
          args: data.args,
          ordinal: data.ordinal,
          resolvedPolicy: data.resolvedPolicy ?? null,
          seq: row.seq,
        })
        break
      case 'tool/result':
        results.set(data.toolUseId, {
          toolUseId: data.toolUseId,
          isError: data.isError === true,
          structured: data.structured ?? null,
          text: (data.content ?? []).filter((part) => part?.type === 'text').map((part) => part.text).join('\n').slice(0, 4000),
          seq: row.seq,
        })
        break
      case 'approval/asked':
        approvals.push({ kind: 'asked', toolUseId: data.tool?.toolUseId ?? data.toolUseId, scope: data.scope, summary: data.summary, pending: data.pending ? true : false })
        break
      case 'approval/decided':
        approvals.push({ kind: 'decided', verdict: data.verdict, via: data.via, scope: data.scope, requestId: data.requestId })
        break
      case 'turn/end':
        turnEnds.push(data.reason)
        // Keep the terminal payload (transport error code/message included): the reason alone would
        // flatten a TRANSPORT failure into the same word as a plain stop.
        turnEndDetails.push({
          reason: data.reason ?? null,
          ...(data.error ? { error: { code: data.error.code ?? null, message: data.error.message ?? null } } : {}),
          ...(data.stopReason ? { stopReason: data.stopReason } : {}),
        })
        break
      case 'cost/ledger': {
        const tokens = data.tokens ?? {}
        usage.input += Number(tokens.input ?? 0)
        usage.output += Number(tokens.output ?? 0)
        usage.cacheRead += Number(tokens.cacheRead ?? 0)
        usage.cacheWrite += Number(tokens.cacheWrite ?? 0)
        usage.reasoning += Number(tokens.reasoning ?? 0)
        usage.credits += Number(data.credits ?? 0)
        usage.usdMicros += Number(data.billing?.usdMicros ?? 0)
        usage.entries += 1
        break
      }
      case 'assistant/message':
        for (const part of data.content ?? []) {
          if (part?.type === 'text') finalTextParts.push(part.text)
          // 'thinking' and any other part type is deliberately ignored.
        }
        break
      default:
        break
    }
  }

  const paired = calls.map((call) => ({ ...call, result: results.get(call.toolUseId) ?? null }))
  return {
    ok: true,
    rowTypes,
    modelSettings,
    yoloSwitch,
    calls: paired,
    approvals,
    turnEnds,
    turnEndDetails,
    usage,
    finalText: finalTextParts.join('\n').trim(),
    toolSequence: paired.map((call) => call.name),
  }
}

/**
 * Paths outside the workspace that are still public to a model session: only the *method skill*
 * (the exact document every session's prompt tells the model to read). Everything else outside the
 * workspace - source, tests, the evaluation dataset, private labels, the isolated `.agh-home` - is
 * developer material and marks the trial contaminated when a call touches it.
 */
export const PUBLIC_READ_PREFIXES = Object.freeze([join(FITPLATE_ROOT, '.agh', 'skills')])

/**
 * The last validate/export results as recorded by the native tools, condensed so the run record
 * shows every G01-G08 status, the report/STEP hashes and the export binding - the user-facing
 * "did it really pass, and on which artefact" evidence, without reading reasoning.
 */
export function summarizeGateEvidence(analysis) {
  const validates = analysis.calls.filter((call) => call.name === 'fitplate_validate_candidate' && call.result?.structured)
  const last = validates.at(-1)?.result?.structured ?? null
  const report = last?.report ?? null
  const exportCall = analysis.calls.filter((call) => call.name === 'fitplate_export_package').at(-1)
  const exportStructured = exportCall?.result?.structured ?? null
  return {
    validate_calls: validates.length,
    final_validate: last
      ? {
          candidate_id: last.candidate_id ?? null,
          task_revision: last.task_revision ?? null,
          overall: last.overall ?? null,
          report_id: last.report_id ?? null,
          checks: Object.fromEntries((report?.checks ?? []).map((check) => [check.id, check.status])),
          failed_checks: last.failed_checks ?? null,
          step_sha256: report?.hashes?.step_sha256 ?? null,
          report_sha256: report?.report_sha256 ?? null,
          validator_code_sha256: last.validator_code_sha256 ?? report?.hashes?.validator_code_sha256 ?? null,
          validator_version: report?.validator_version ?? null,
          duration_ms: last.duration_ms ?? null,
        }
      : null,
    export: exportStructured
      ? {
          status: exportStructured.status ?? null,
          candidate_id: exportStructured.candidate_id ?? null,
          report_id: exportStructured.report_id ?? null,
          overall: exportStructured.overall ?? null,
          // The raw boolean, so a diagnostic export (`failed:true`) is never read as a passing one.
          failed: typeof exportStructured.failed === 'boolean' ? exportStructured.failed : null,
          export_dir: exportStructured.export_dir ?? null,
          hashes: exportStructured.hashes ?? null,
          validator_code_sha256: exportStructured.validator_code_sha256 ?? null,
        }
      : null,
  }
}

/** Markers of developer material that must never appear in a session's tool arguments. */
const CONTAMINATION_MARKERS = Object.freeze([
  '/tests/',
  'evaluation/private',
  'evaluation/labels',
  '/.git/',
  '/geometry/',
  '/scripts/',
  '/plugin/',
  'ANG/logs',
  'Plan1',
  '.agh-home',
])

/**
 * Audit every observed tool call against the allowed set and the workspace boundary.
 *
 * A call marks the trial contaminated when it touches a path outside the workspace (absolute or a
 * relative escape), or when it mentions developer material (Plan1, private labels, tests, source)
 * that no legitimate in-workspace argument contains. Paths inside the workspace - the frozen task,
 * scene, initial candidate and the copied method skill - never count as contamination, and neither
 * does reading the public method skill source directly.
 */
export function auditToolCalls(calls, workspaceRoot, { allowedTools = TOOL_NAMES, publicPrefixes = PUBLIC_READ_PREFIXES } = {}) {
  const isPublic = (path) => isInside(workspaceRoot, path) || publicPrefixes.some((prefix) => isInside(prefix, path))
  const foreign = []
  const suspect = []
  for (const call of calls) {
    if (allowedTools.includes(call.name)) continue
    const serialized = JSON.stringify(call.args ?? {})
    const outside = []
    const publicSpans = []
    for (const match of serialized.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      let token
      try {
        token = JSON.parse(`"${match[1]}"`)
      } catch {
        token = match[1]
      }
      const paths = []
      for (const found of token.matchAll(/(?:^|[\s"'=:(,;|&])(\/[^\s"'`,;|&()<>]+)/g)) paths.push(found[1])
      for (const found of token.matchAll(/(?:^|[\s"'=:(,;|&])(\.\.\/[^\s"'`,;|&()<>]*)/g)) paths.push(resolve(workspaceRoot, found[1]))
      if (paths.length === 0) continue
      const foreignPaths = paths.filter((path) => !isPublic(path))
      outside.push(...foreignPaths)
      if (foreignPaths.length === 0) publicSpans.push([match.index, match.index + match[0].length])
    }
    const mentions = CONTAMINATION_MARKERS.filter((needle) => {
      for (let index = serialized.indexOf(needle); index !== -1; index = serialized.indexOf(needle, index + 1)) {
        // A marker that only occurs inside a fully in-workspace path (the trial workspace lives
        // under runs/evaluation/<batch>/... and the skill under .agh/skills/...) is explained.
        if (!publicSpans.some(([start, end]) => index >= start && index < end)) return true
      }
      return false
    })
    const entry = {
      tool: call.name,
      toolUseId: call.toolUseId,
      args: serialized.slice(0, 300),
      outside_workspace_paths: [...new Set(outside)],
      suspicious_mentions: mentions,
    }
    foreign.push(entry)
    if (entry.outside_workspace_paths.length || mentions.length) suspect.push(entry)
  }
  return { foreign_calls: foreign, contaminated: suspect.length > 0, contaminated_evidence: suspect }
}

// ---------------------------------------------------------------------------
// Prompts (inputs only - no answer, no reference, no hidden target)
// ---------------------------------------------------------------------------

export function teachingPrompt({ taskId, revision, hasInitial }) {
  const lines = [
    `你正在一个隔离工作区中完成 FitPlate 教学任务演示。`,
    `先使用工作区中的方法 Skill：读取 .agh/skills/fitplate-design/SKILL.md 并按它执行（Skill 名称：fitplate-design）。`,
    `任务输入在 input/tasks/${taskId}/ 下：task.json（冻结任务）、${taskId}.scene.json（冻结场景）${hasInitial ? '、initial-design.json（初始候选）' : ''}。`,
    `本演示按固定顺序进行，请严格遵守：`,
    `1) 调用 fitplate_load_task，task_id="${taskId}"，revision=${revision}；读出冻结条件、可修改项与 run_id（后续 fitplate_build_candidate 的 run_id 必须用它返回的真实值）。`,
    hasInitial
      ? `2) 先按 input/tasks/${taskId}/initial-design.json 的**完整 DesignSpec 对象**原样提交一个初始候选：fitplate_build_candidate 的 design_spec 必须是该文件中的整个对象（含 schema_version/task_id/task_revision/plate/sensor_pose 等全部字段），不得只给 center/rotation 之类的片段，缺字段会被 schema 拒绝；task_revision 用当前 load 返回的真实值。再用 fitplate_validate_candidate 得到真实报告——这一步展示初始布局的真实测量结果（可能通过也可能失败），该首版来自输入文件，不计为你的设计决策。`
      : `2) 先提交你能给出的第一版 design_spec（fitplate_build_candidate）——design_spec 必须是完整的 DesignSpec 对象（schema_version/task_id/task_revision/plate/sensor_pose 等字段齐全），run_id 与 task_revision 取自当前 load；再用 fitplate_validate_candidate 得到真实报告。`,
    `3) 之后每一步都由你决策：依据真实报告的失败项修改 design_spec 中任务允许的字段，再次 build + validate（同样提交完整 DesignSpec 对象）；最多 3 次修订（含初始候选合计最多 4 个候选）。`,
    `4) 只有报告 overall=PASS 时才调用 fitplate_export_package 导出；预算耗尽或无法满足时如实报告，不要伪造结论。`,
    `5) 导出成功后，用一段简短的最终说明（结论、关键测量值与仍未验证的范围）结束，不要反复确认或输出冗余过程。`,
    `只使用 fitplate_* 工具；如需查看冻结场景的细节，只读取本工作区 input/tasks/${taskId}/ 内的输入文件。不要读取输入目录之外的任何文件。不要输出内部推理过程；只用「操作理由 + 工具调用 + 测量证据」说明你的每一次修改。`,
  ]
  return lines.join('\n')
}

export function evaluationPrompt({ group, taskId, revision, hasInitial }) {
  const common = [
    `你在一个隔离工作区中独立完成一个 FitPlate 设计任务。`,
    `方法：读取并使用工作区 Skill fitplate-design（.agh/skills/fitplate-design/SKILL.md）。`,
    `任务输入：input/tasks/${taskId}/task.json、${taskId}.scene.json${hasInitial ? '、initial-design.json' : ''}。`,
    `只使用 fitplate_* 工具；如需查看冻结场景细节，只读取本工作区 input/tasks/${taskId}/ 内的输入文件；不要读取输入目录之外的文件；不要输出内部推理过程。`,
  ]
  if (group === 'A') {
    return [
      ...common,
      `本次要求「一次生成」：fitplate_load_task 之后，只允许调用 fitplate_build_candidate 恰好一次，提交你自己决定的唯一一份 design_spec。`,
      `不要调用 fitplate_validate_candidate，不要根据任何验证结果返工；提交后停止，并用一段话说明你的设计选择理由与依据。`,
      `（task_id="${taskId}"，revision=${revision}）`,
    ].join('\n')
  }
  return [
    ...common,
    `本次是「闭环修复」：fitplate_load_task 之后提出你的第一版 design_spec（可以参考 initial-design.json，但由你决定），调用 fitplate_build_candidate，然后调用 fitplate_validate_candidate 读取真实报告。`,
    `若未通过，依据报告中的失败项修改 design_spec 并再次 build + validate；最多做 3 次修订（合计最多 4 个候选）。`,
    `若通过（overall=PASS）则调用 fitplate_export_package 导出；若最终仍未通过或预算耗尽，如实总结。`,
    `（task_id="${taskId}"，revision=${revision}）`,
  ].join('\n')
}

export function revisionChangePrompt({ taskId, revision }) {
  return [
    `任务已更新：${taskId} 现在是 revision ${revision}，允许安装区域发生了变化，旧 revision 的结论已过期。`,
    `请重新调用 fitplate_load_task 读取新 revision（task_id="${taskId}"，revision=${revision}），在新要求下完成设计；`,
    `旧报告不得作为新 revision 的通过依据。只使用 fitplate_* 工具。`,
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Teaching-run objective + CLI
// ---------------------------------------------------------------------------

/**
 * Resolve the thinking tier the configured model actually declares.
 *
 * The account record stores the catalog entry returned by the real `config.test` at configure
 * time; its `thinkingLevelMap`/`thinkingEfforts` are the only declaration. The runner sends the
 * highest declared tier (DS keeps `max`), and sends *nothing* when the model declares none (the
 * official Agnes definitions carry `reasoning: false`). An explicit override must itself be a
 * declared tier - a parameter the model never declared is never guessed onto the wire.
 */
export function resolveSessionThinking(snapshot, explicit) {
  const provider = snapshot?.provider ?? null
  const accounts = Array.isArray(snapshot?.accounts) ? snapshot.accounts : []
  const account =
    accounts.find((row) => row?.model === provider?.model && (provider?.route === undefined || row?.route === provider.route)) ??
    accounts.find((row) => row?.model === provider?.model) ??
    null
  const model = (account?.models ?? []).find((row) => row?.id === provider?.model) ?? null
  const declared = declaredThinkingLevels(model)
  if (explicit) {
    if (!declared.has(explicit)) {
      fail(
        EXIT.REFUSED,
        `--thinking ${explicit} 不在模型 ${provider?.model ?? '(未知)'} 声明的档位中（` +
          `${[...declared].join(', ') || '模型未声明任何档位'}）；不猜测参数`,
      )
    }
    return { thinking: explicit, source: 'explicit', declared: [...declared], model: provider?.model ?? null }
  }
  const highest = THINKING_ORDER.find((level) => declared.has(level))
  return highest
    ? { thinking: highest, source: 'model-declaration', declared: [...declared], model: provider?.model ?? null }
    : { thinking: undefined, source: 'omitted-no-declaration', declared: [], model: provider?.model ?? null }
}

/**
 * Program-side refusal evidence, bound to the specified input: only a normally executed
 * `fitplate_load_task` for *this* task id + revision whose structured result says the program
 * classified the input as NEEDS_INPUT or INFEASIBLE (bridge ok:false, not an execution error).
 * A refusal of another task, another revision, or from build/get_run is not an answer here, and
 * INFEASIBLE only counts with its actual proof (non-empty findings). The model's prose is never
 * a refusal.
 */
export function findProgramRefusal(analysis, { taskId = null, revision = null } = {}) {
  for (const call of analysis?.calls ?? []) {
    if (call?.name !== 'fitplate_load_task') continue
    const result = call.result
    const structured = result?.structured
    if (!structured || result?.isError === true || structured.ok !== false) continue
    const kind = structured.status ?? null
    if (kind !== 'NEEDS_INPUT' && kind !== 'INFEASIBLE') continue
    const args = call.args ?? {}
    if (taskId !== null && args.task_id !== taskId) continue
    if (revision !== null && Number(args.revision) !== Number(revision)) continue
    const details = structured.detail ?? null
    const findings = Array.isArray(details?.findings) ? details.findings : null
    if (kind === 'INFEASIBLE' && (findings === null || findings.length === 0)) continue // the proof must exist
    if (kind === 'NEEDS_INPUT' && (details === null || typeof details !== 'object')) continue
    return {
      found: true,
      kind,
      tool: call.name,
      code: structured.code ?? null,
      message: typeof structured.message === 'string' ? structured.message : null,
      findings: findings?.length ?? 0,
      missing_paths: Array.isArray(details?.missing_paths) ? details.missing_paths.length : null,
      task_id: args.task_id ?? null,
      revision: args.revision ?? null,
    }
  }
  return { found: false, kind: null, tool: null, code: null, message: null, findings: null, task_id: taskId, revision }
}

/**
 * Any *successful* certification or export anywhere in the transcript, bound or not. A refusal
 * scenario must show none of these: an unbound/foreign-run PASS or export is still a positive
 * result and can never be accepted as a correct refusal, whatever it is bound to. A failed
 * (`failed:true`) diagnostic export is not a success.
 */
export function findCertifiedSuccess(analysis) {
  const success = { pass: false, export: false }
  for (const call of analysis?.calls ?? []) {
    const result = call?.result
    const structured = result?.structured
    if (!structured || result?.isError === true) continue
    if (call.name === 'fitplate_validate_candidate' && structured.ok === true && structured.overall === 'PASS') success.pass = true
    if (call.name === 'fitplate_export_package' && structured.ok === true && structured.status === 'EXPORTED' && structured.failed !== true) {
      success.export = true
    }
  }
  return success
}

/**
 * Strict Plan02 terminal classification, read from the *native* rows (the CLI's own code path).
 * Only a final `turn/end` with reason `completed`, no transport error and no cancellation is a
 * normal completion; `blocked` is reported as blocked and is never masked by
 * stopReason=end_turn. This is the new stricter reading the Plan02 gates use;
 * assessTeachingRun's legacy `terminal_complete` keeps its original semantics untouched.
 */
export function summarizeStrictTerminal({ analysis, cancelled = false, sessionTurns = null }) {
  const details = analysis?.turnEndDetails ?? (analysis?.turnEnds ?? []).map((reason) => ({ reason }))
  const last = details.at(-1) ?? null
  const transportErrors = details.filter((detail) => detail?.reason === 'error' || detail?.error != null)
  const finalReason = typeof last?.reason === 'string' ? last.reason : null
  // The SDK-side session state is passed in by the CLI too: an SDK classification of
  // MODEL_ERROR / BLOCKED / CANCELLED_TIMEOUT (or any STOPPED:<reason>) contradicts a native
  // `completed`, and the contradiction must lose - never count as a normal completion.
  const sdkStates = (sessionTurns ?? [])
    .map((turn) => turn?.classification ?? null)
    .filter((state) => typeof state === 'string')
  const sdkConflict = sdkStates.some((state) => ['MODEL_ERROR', 'BLOCKED', 'CANCELLED_TIMEOUT'].includes(state) || state.startsWith('STOPPED:'))
  return {
    final_reason: finalReason,
    stop_reason: last?.stopReason ?? null,
    blocked: finalReason === 'blocked' || sdkStates.includes('BLOCKED'),
    transport_error: transportErrors.length > 0 || sdkStates.includes('MODEL_ERROR'),
    cancelled: Boolean(cancelled) || sdkStates.includes('CANCELLED_TIMEOUT'),
    sdk_states: sdkStates,
    sdk_conflict: sdkConflict,
    final_text_present: (analysis?.finalText ?? '').trim().length > 0,
    completed: !cancelled && transportErrors.length === 0 && !sdkConflict && finalReason === 'completed',
  }
}

/**
 * One expectation gate per Plan02 branch, never merged, each keeping the strict evidence rules.
 * All completion branches require the strict terminal (`terminal.completed`, i.e. the native
 * final turn ended `completed` - blocked/error/cancelled never pass):
 *  - workflow: the interface chain alone (`assessment.ok`);
 *  - pass:     a *repair* completion (shipped seed FAILed -> different candidate PASSed), bound;
 *  - normal:   a normal completion with the final candidate bound-PASS and exported (a
 *              first-version PASS is explicitly fine here);
 *  - refuse:   the program itself refused the specified input (NEEDS_INPUT/INFEASIBLE) on a
 *              finished, uncontaminated turn with no successful certification or export anywhere
 *              - an API error, timeout or empty finalText is never accepted as a refusal. The
 *              model's final explanation is a separate semantic dimension: this gate verifies
 *              the program refusal and terminal state only.
 */
export function expectationGate({ expect, assessment, audit = null, refusal = null, certifiedSuccess = null, terminal = null }) {
  const terminalCompleted = terminal?.completed === true && terminal?.final_text_present === true
  const terminalProblem = () =>
    terminal?.blocked === true
      ? `终态 reason=blocked（SDK stopReason=${terminal?.stop_reason ?? '-'} 不能掩盖）；只有 reason=completed 才算正常完成`
      : terminal?.sdk_conflict === true
        ? `SDK 终态 ${(terminal?.sdk_states ?? []).join(',')} 与原生 completed 矛盾；矛盾不通过`
        : terminal?.transport_error === true
          ? '终态存在 transport error'
          : terminal?.cancelled === true
            ? '终态是取消/超时'
            : terminal?.final_text_present !== true
              ? '终态 finalText 为空'
              : `终态 reason=${terminal?.final_reason ?? 'unknown'}（只有 completed 才算正常完成）`
  const contaminated = audit?.contaminated === true
  // workflow is the *legacy interface-chain* expectation: it deliberately keeps its historical
  // scope (no pipeline/terminal requirement, matching the old scorer's口径), but a contaminated
  // audit can never write VERIFIED either. This is the only legacy-scope branch.
  if (expect === 'workflow') {
    return {
      satisfied: assessment.ok === true && !contaminated,
      reason:
        assessment.ok !== true
          ? `接口链路证据不完整：${(assessment.problems ?? []).join('；')}`
          : contaminated
            ? '工具审计标记 contaminated（见 summary.tool_audit）'
            : null,
    }
  }
  if (expect === 'pass') {
    const satisfied =
      assessment.ok === true &&
      assessment.final_overall === 'PASS' &&
      assessment.pipeline_complete === true &&
      assessment.repair_demonstrated === true &&
      terminalCompleted &&
      !contaminated
    return {
      satisfied,
      reason: satisfied
        ? null
        : assessment.final_overall !== 'PASS'
          ? `最终 overall=${assessment.final_overall}（如实记录为未通过）`
          : assessment.ok !== true
            ? `接口链路证据不完整：${(assessment.problems ?? []).join('；')}`
            : contaminated
              ? '工具审计标记 contaminated（见 summary.tool_audit）'
              : !terminalCompleted
                ? terminalProblem()
                : assessment.pipeline_complete !== true
                  ? '闭环证据不完整：终版 PASS 绑定或导出绑定未成立'
                  : '未演示「输入旧布局失败→不同候选修复通过」：初版未真实 FAIL 或终版不是另一候选（初版直接 PASS 不算修复教学成功；见 summary.assessment.repair_evidence）',
    }
  }
  if (expect === 'normal') {
    const satisfied = assessment.ok === true && assessment.pipeline_complete === true && terminalCompleted && !contaminated
    return {
      satisfied,
      reason: satisfied
        ? null
        : assessment.ok !== true
          ? `接口链路证据不完整：${(assessment.problems ?? []).join('；')}`
          : contaminated
            ? '工具审计标记 contaminated（见 summary.tool_audit）'
            : !terminalCompleted
              ? terminalProblem()
              : `闭环证据不完整：最终 overall=${assessment.final_overall}，终版 PASS 绑定=${assessment.final_pass_bound}，导出绑定=${assessment.export_bound}，严格终态=${terminalCompleted}`,
    }
  }
  if (expect === 'refuse') {
    const anySuccess = certifiedSuccess?.pass === true || certifiedSuccess?.export === true
    const satisfied =
      refusal?.found === true &&
      terminalCompleted &&
      assessment.final_pass_bound !== true &&
      assessment.export_bound !== true &&
      !anySuccess &&
      !contaminated
    return {
      satisfied,
      reason: satisfied
        ? null
        : refusal?.found !== true
          ? '没有针对本次输入的程序层 NEEDS_INPUT/INFEASIBLE 证据（其他 task/revision、其他工具或模型自述都不算程序拒绝）'
          : anySuccess
            ? '出现成功的 PASS 验证或导出（即使未绑定本次 run），拒绝场景不成立'
            : !terminalCompleted
              ? terminalProblem()
              : assessment.final_pass_bound === true || assessment.export_bound === true
                ? '出现被认证的 PASS/导出，拒绝场景不成立'
                : '工具审计标记 contaminated',
    }
  }
  fail(EXIT.USAGE, `未知 --expect ${expect}`)
}

/**
 * The single verdict the CLI writes and exits on - every success precondition lives here, so
 * `summary.result`, `summary.verdict.exit_code` and the process exit can never disagree (no
 * later `if` may turn a VERIFIED summary into exit 4):
 *   - VERIFIED (exit 0) only when the expectation is satisfied;
 *   - EVIDENCE_INCOMPLETE (exit 4) when the interface chain (`assessment.ok`) is broken and the
 *     refusal bypass does not legally apply;
 *   - CONTAMINATED (exit 4) for a polluted audit;
 *   - EXPECTED_<EXpect>_NOT_REACHED (exit 4) otherwise.
 * The refuse bypass is the *only* legal way to VERIFIED with `assessment.ok=false`: a real
 * program refusal has no build/validate calls, so the legacy interface-chain problems are the
 * refusal itself, not missing evidence.
 */
export function deriveRunVerdict({ expect, assessment, audit = null, refusal = null, certifiedSuccess = null, terminal = null }) {
  const expectation = expectationGate({ expect, assessment, audit, refusal, certifiedSuccess, terminal })
  const refusalBypass = expect === 'refuse' && expectation.satisfied === true
  const contaminated = audit?.contaminated === true
  const result = expectation.satisfied
    ? 'VERIFIED'
    : !assessment.ok && !refusalBypass
      ? 'EVIDENCE_INCOMPLETE'
      : contaminated
        ? 'CONTAMINATED'
        : `EXPECTED_${expect.toUpperCase()}_NOT_REACHED`
  const exitCode = result === 'VERIFIED' ? EXIT.OK : EXIT.REFUSED
  const failureMessage =
    exitCode === EXIT.OK
      ? null
      : !assessment.ok && !refusalBypass
        ? `教学运行证据不完整：${(assessment.problems ?? []).join('；')}`
        : `要求 --expect ${expect}，但${expectation.reason ?? '未达成（见 summary.expectation）'}`
  return { expectation, result, exitCode, failureMessage, refusal_bypass: refusalBypass }
}

/**
 * Did the native evidence show the required workflow? Returns {ok, problems, seedMatch, ...}.
 *
 * Three separate claims, deliberately never merged:
 *   * `ok` - the interface chain itself (load/build/validate/export calls paired, seed respected);
 *   * `pipeline_complete` - the measured closed loop: the final candidate's natively PASSing report
 *     (bridge `ok:true`, no execution error) bound to the run store's own record, an export bound
 *     to that candidate's report/STEP bytes, a normally finished turn with a final statement, and
 *     a clean tool audit;
 *   * `repair_demonstrated` - the teaching scenario: the shipped initial layout really FAILed and a
 *     *different* candidate is the one that passed (a first-version PASS is not a repair).
 * Every field below is read from actual payloads (tool results + run manifest); nothing is
 * computed or invented, and a missing field is missing evidence, never a pass.
 */
export function assessTeachingRun({ analysis, initialDesign, runManifest, audit = null }) {
  const problems = []
  const sequence = analysis.toolSequence
  const builds = analysis.calls.filter((call) => call.name === 'fitplate_build_candidate')
  const validates = analysis.calls.filter((call) => call.name === 'fitplate_validate_candidate')
  const loads = analysis.calls.filter((call) => call.name === 'fitplate_load_task')
  if (loads.length === 0) problems.push('没有 fitplate_load_task 调用')
  if (builds.length === 0) problems.push('没有 fitplate_build_candidate 调用')
  if (validates.length === 0) problems.push('没有 fitplate_validate_candidate 调用')
  if (builds.length > 0 && validates.length === 0) problems.push('建模后没有验证（未形成真实反馈闭环）')

  let seedMatch = null
  if (builds.length > 0 && initialDesign) {
    const first = builds[0].args?.design_spec ?? {}
    const samePose =
      JSON.stringify(first.sensor_pose?.center) === JSON.stringify(initialDesign.sensor_pose?.center) &&
      first.sensor_pose?.rotation_deg === initialDesign.sensor_pose?.rotation_deg
    const samePlate = ['width', 'height', 'thickness'].every(
      (dim) => Math.abs(Number(first.plate?.[dim]) - Number(initialDesign.plate?.[dim])) <= 1e-9,
    )
    seedMatch = samePose && samePlate
    if (!seedMatch) problems.push('第一个候选与输入 initial-design.json 不一致（教学演示的固定首步未按输入提交）')
  }

  for (const call of analysis.calls) {
    for (const key of ['build_candidate', 'validate_candidate', 'export_package']) {
      if (call.name === `fitplate_${key}` && !call.result) problems.push(`${call.name} 缺少配对 tool/result（证据不完整）`)
    }
  }

  const lastValidateCall = validates.at(-1) ?? null
  const lastValidate = lastValidateCall?.result?.structured ?? null
  const exportCall = analysis.calls.filter((call) => call.name === 'fitplate_export_package').at(-1)
  const exportStructured = exportCall?.result?.structured ?? null

  // Terminal state and the final statement come from the actual transcript rows: a turn that ended
  // in transport error (or wrote nothing) never finished the loop, whatever the artefacts show.
  const turnEndDetails = analysis.turnEndDetails ?? (analysis.turnEnds ?? []).map((reason) => ({ reason }))
  const transportError = turnEndDetails.some((detail) => detail?.reason === 'error' || detail?.error != null)
  const finalTextPresent = (analysis.finalText ?? '').trim().length > 0
  const terminalComplete = !transportError && finalTextPresent

  // The run store's own record of the final candidate (same convention as the evaluation driver:
  // the last version id in the manifest). The bindings below compare the tool payloads against
  // exactly these stored fields - no hash is recomputed, no missing field is filled in.
  const finalCandidateId = runManifest?.candidates ? Object.keys(runManifest.candidates).sort().at(-1) ?? null : null
  const finalEntry = finalCandidateId ? runManifest.candidates[finalCandidateId] : null
  const finalRunId = runManifest?.run_id ?? null
  const finalRevision = runManifest?.task_revision ?? null
  const finalStepSha = finalEntry?.hashes?.step_sha256 ?? null
  const finalReportId = finalEntry?.report?.report_id ?? null
  const finalReportSha = finalEntry?.report?.report_sha256 ?? null
  const finalValidatorSha = finalEntry?.validator_code_sha256 ?? null

  // The last validate must describe *that* candidate - same run, candidate, revision, report id,
  // STEP bytes and validator code - with a real PASS verdict from a normally executed call (the
  // bridge answered ok:true, the tool/result is not an execution error). A report of an earlier
  // version, another revision, or one reachable only through an errored call never certifies the
  // final candidate; a business refusal (ok:false) measures nothing.
  const finalPassBound = Boolean(
    lastValidate &&
      finalEntry &&
      lastValidate.overall === 'PASS' &&
      lastValidate.ok === true &&
      lastValidateCall.result?.isError !== true &&
      lastValidate.run_id === finalRunId &&
      lastValidate.candidate_id === finalCandidateId &&
      lastValidate.task_revision === finalRevision &&
      lastValidate.report_id !== null &&
      lastValidate.report_id === finalReportId &&
      isSha256Hex(lastValidate.report?.hashes?.step_sha256) &&
      lastValidate.report.hashes.step_sha256 === finalStepSha &&
      isSha256Hex(lastValidate.validator_code_sha256) &&
      lastValidate.validator_code_sha256 === finalValidatorSha,
  )

  // A passing export certifies the final candidate only when the bridge said ok, the call itself
  // did not error, and the bundle names the same run/candidate/report with the STEP and report
  // hashes the run store recorded for that candidate. `failed:true` diagnostic exports never count.
  const exportBound = Boolean(
    finalPassBound &&
      exportCall?.result &&
      exportCall.result.isError !== true &&
      exportStructured?.ok === true &&
      exportStructured.status === 'EXPORTED' &&
      exportStructured.failed === false &&
      exportStructured.overall === 'PASS' &&
      exportStructured.run_id === finalRunId &&
      exportStructured.candidate_id === finalCandidateId &&
      exportStructured.report_id !== null &&
      exportStructured.report_id === finalReportId &&
      isSha256Hex(exportStructured.hashes?.step_sha256) &&
      exportStructured.hashes.step_sha256 === finalStepSha &&
      isSha256Hex(exportStructured.hashes?.report_sha256) &&
      exportStructured.hashes.report_sha256 === finalReportSha,
  )
  const diagnosticExport = exportStructured?.status === 'EXPORTED' && exportStructured?.failed === true
  const certified = exportBound && terminalComplete && audit?.contaminated !== true
  const pipelineComplete = Boolean(certified)

  // The teaching scenario itself: the first *measured* candidate must be the first build (the
  // shipped initial layout), it must have really FAILed, and the passing candidate must be a
  // different version. A first-version PASS is not a repair, and missing ids are not evidence.
  const firstValidateCall = validates[0] ?? null
  const firstValidate = firstValidateCall?.result?.structured ?? null
  const firstBuildCandidateId = builds[0]?.result?.structured?.candidate_id ?? null
  const firstCandidateId = firstValidate?.candidate_id ?? null
  // The seed's FAIL only counts from a normally executed validation (ok:true, no execution error) -
  // a report attached to an errored call, or a business refusal, never measured the seed.
  const firstExecutedOk = firstValidate?.ok === true && firstValidateCall?.result?.isError !== true
  const firstFailed = firstExecutedOk && firstValidate?.overall === 'FAIL'
  const firstIsShippedSeed = firstBuildCandidateId !== null && firstCandidateId === firstBuildCandidateId
  const differentCandidate = firstCandidateId !== null && finalCandidateId !== null && firstCandidateId !== finalCandidateId
  const repairDemonstrated = Boolean(firstFailed && firstIsShippedSeed && differentCandidate && finalPassBound)

  // The label never over-claims: a bound export on an unfinished turn is *exported*, not passed.
  const outcome = certified
    ? 'PASSED_AND_EXPORTED'
    : exportBound
      ? `EXPORTED_NOT_FINISHED(${transportError ? 'transport-error' : finalTextPresent ? 'contaminated' : 'no-final-text'})`
      : lastValidate?.overall === 'PASS'
        ? exportStructured
          ? `PASS_NOT_EXPORTED(export ${exportStructured.status ?? 'unknown'}${exportStructured.failed === true ? '/failed' : ''}${exportStructured.ok === false ? '/ok-false' : ''})`
          : 'PASS_NOT_EXPORTED'
        : lastValidate?.overall ?? 'UNKNOWN'
  return {
    ok: problems.length === 0,
    problems,
    seed_match: seedMatch,
    seed_origin: seedMatch === null ? null : seedMatch ? 'input:initial-design.json' : 'model',
    loads: loads.length,
    builds: builds.length,
    validates: validates.length,
    exports: analysis.calls.filter((call) => call.name === 'fitplate_export_package').length,
    final_overall: lastValidate?.overall ?? null,
    export_status: exportStructured?.status ?? null,
    export_ok: typeof exportStructured?.ok === 'boolean' ? exportStructured.ok : null,
    export_failed: typeof exportStructured?.failed === 'boolean' ? exportStructured.failed : null,
    export_candidate_id: exportStructured?.candidate_id ?? null,
    export_report_id: exportStructured?.report_id ?? null,
    diagnostic_export: diagnosticExport,
    final_candidate_id: finalCandidateId,
    final_pass_bound: finalPassBound,
    export_bound: exportBound,
    transport: { turn_end_details: turnEndDetails, error: transportError },
    terminal_complete: terminalComplete,
    contaminated: audit ? Boolean(audit.contaminated) : null,
    // A geometry PASS with no bound export (or an unfinished turn) is an incomplete pipeline,
    // not a published result.
    pipeline_complete: pipelineComplete,
    repair_evidence: {
      first_build_candidate_id: firstBuildCandidateId,
      first_validate_candidate_id: firstCandidateId,
      first_validate_overall: firstValidate?.overall ?? null,
      first_validate_ok: typeof firstValidate?.ok === 'boolean' ? firstValidate.ok : null,
      first_validate_is_error: firstValidateCall?.result?.isError === true,
      first_failed: firstFailed,
      first_is_shipped_seed: firstIsShippedSeed,
      final_candidate_id: finalCandidateId,
      different_candidate: differentCandidate,
      final_pass_bound: finalPassBound,
      demonstrated: repairDemonstrated,
    },
    repair_demonstrated: repairDemonstrated,
    outcome,
    run_manifest: runManifest ?? null,
  }
}

function parseArgs(argv) {
  const options = {
    task: 'sensor-swap-01',
    revision: undefined,
    case: undefined,
    workspace: undefined,
    timeoutMs: SESSION_TIMEOUT_DEFAULT_MS,
    approval: 'handler',
    expect: 'workflow',
    thinking: undefined,
    out: undefined,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--task') options.task = argv[++i]
    else if (arg === '--case') options.case = argv[++i]
    else if (arg === '--revision') options.revision = Number(argv[++i])
    else if (arg === '--workspace') options.workspace = argv[++i]
    else if (arg === '--timeout-ms') options.timeoutMs = Number(argv[++i])
    else if (arg === '--approval') options.approval = argv[++i]
    else if (arg === '--expect') options.expect = argv[++i]
    else if (arg === '--thinking') options.thinking = argv[++i]
    else if (arg === '--out') options.out = argv[++i]
    else fail(EXIT.USAGE, `未知参数 ${arg}`)
  }
  if (!['workflow', 'pass', 'normal', 'refuse'].includes(options.expect))
    fail(EXIT.USAGE, '--expect 只能是 workflow、pass、normal 或 refuse')
  if (options.revision !== undefined && (!Number.isSafeInteger(options.revision) || options.revision < 1)) {
    fail(EXIT.USAGE, '--revision 无效')
  }
  if (options.case !== undefined && !TASK_ID_PATTERN.test(options.case)) fail(EXIT.USAGE, `--case id 非法：${options.case}`)
  return options
}

async function runTeachingCli() {
  const options = parseArgs(process.argv.slice(2))
  const cfg = config()
  const revisionGiven = options.revision !== undefined
  const caseId = options.case ?? options.task
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()
  const name = `teaching-${caseId}-${stamp}`
  const outDir = options.out ?? join(FITPLATE_ROOT, 'runs', 'teaching', stamp)
  await mkdir(outDir, { recursive: true })

  const preparation = options.case
    ? await prepareCaseWorkspace({ name, caseId: options.case, ...(options.workspace ? { workspaceRoot: resolve(options.workspace) } : {}) })
    : await prepareSessionWorkspace({
        name,
        caseDir: join(FITPLATE_ROOT, 'fixtures', 'dev', options.task),
        taskId: options.task,
        ...(options.workspace ? { workspaceRoot: resolve(options.workspace) } : {}),
      })
  const { workspaceRoot, manifest, initialDesign } = preparation
  const taskId = manifest.task_id
  const revision = revisionGiven ? options.revision : options.case ? manifest.task_revision : 1
  printInfo(`workspace: ${workspaceRoot}（只复制输入：${manifest.copied.map((entry) => entry.name).join(', ')}）`)

  const { client } = await openClient()
  const summary = {
    schema_version: '1.0',
    kind: 'fitplate-teaching-run',
    started_at: new Date().toISOString(),
    task_id: taskId,
    task_revision: revision,
    case: options.case ?? null,
    workspace: workspaceRoot,
    approval_mode: options.approval,
    timeout_ms: options.timeoutMs,
    copied: manifest.copied,
  }
  try {
    const skillState = await ensureSkillReady({ client, profile: cfg.profile, clientId: await client.clientId(), workspaceRoot })
    summary.skill = skillState.skill
    summary.workspace_id = skillState.workspaceId
    printInfo(`skill: ${skillState.skill.resourceId} trust=${skillState.skill.trust} desired=${skillState.skill.desired} actual=${skillState.skill.actual} winner=${skillState.skill.winner}`)

    const snapshot = await client.config.get()
    summary.route = snapshot?.provider?.route ?? null
    summary.model = snapshot?.provider?.model ?? null
    const thinkingPlan = resolveSessionThinking(snapshot, options.thinking)
    summary.thinking = { applied: thinkingPlan.thinking ?? null, source: thinkingPlan.source, declared: thinkingPlan.declared, model: thinkingPlan.model }
    printInfo(`模型：route=${summary.route} model=${summary.model} thinking=${thinkingPlan.thinking ?? '(模型未声明，省略)'}（${thinkingPlan.source}）`)

    const session = await runModelSession({
      client,
      profile: cfg.profile,
      workspaceRoot,
      route: summary.route,
      model: summary.model,
      thinking: thinkingPlan.thinking,
      turns: [teachingPrompt({ taskId, revision, hasInitial: Boolean(initialDesign) })],
      timeoutMs: options.timeoutMs,
      approvalMode: options.approval,
    })
    summary.session_id = session.sessionId
    summary.turns = session.turns
    summary.terminal_classification = session.turns.some((turn) => turn.classification === 'MODEL_ERROR')
      ? 'MODEL_ERROR'
      : session.cancelled
        ? 'CANCELLED_TIMEOUT'
        : session.turns.at(-1)?.classification ?? null
    summary.approvals = session.approvals
    summary.yolo = session.yolo
    summary.elapsed_ms = session.elapsedMs
    summary.cancelled = session.cancelled
    printInfo(`session=${session.sessionId} reason=${session.turns.map((turn) => turn.reason).join(',')} 用时=${session.elapsedMs}ms`)
    await session.detach()

    const evidence = await exportSessionEvidence(session.sessionId, outDir)
    summary.evidence = evidence
    const analysis = analyzeNativeEvents(await readFile(evidence.jsonlPath, 'utf8'))
    if (!analysis.ok) fail(EXIT.REFUSED, `原生轨迹解析失败：${analysis.reason}`)
    summary.usage = analysis.usage
    summary.model_settings = analysis.modelSettings
    summary.yolo_events = analysis.yoloSwitch
    summary.tool_sequence = analysis.toolSequence
    summary.turn_end_reasons = analysis.turnEnds
    summary.final_evidence = summarizeGateEvidence(analysis)
    const audit = auditToolCalls(analysis.calls, workspaceRoot)
    summary.tool_audit = audit
    summary.final_text = analysis.finalText.slice(0, 2000)
    const programRefusal = findProgramRefusal(analysis, { taskId, revision })
    const certifiedSuccess = findCertifiedSuccess(analysis)
    const terminal = summarizeStrictTerminal({ analysis, cancelled: session.cancelled === true, sessionTurns: session.turns })
    summary.program_refusal = programRefusal
    summary.certified_success = certifiedSuccess
    summary.terminal = terminal
    if (terminal.blocked) {
      printInfo(`终态：reason=blocked（SDK stopReason=${terminal.stop_reason ?? '-'}）；按严格口径不算正常完成`)
    } else if (!terminal.completed) {
      printInfo(`终态：reason=${terminal.final_reason ?? 'unknown'}（严格口径：只有 completed 算正常完成）`)
    }
    if (programRefusal.found) {
      printInfo(
        `程序拒绝：${programRefusal.kind}（${programRefusal.tool}${programRefusal.code ? ` ${programRefusal.code}` : ''}）findings=${programRefusal.findings ?? '-'}`,
      )
    }

    let runManifest = null
    const runsDir = join(workspaceRoot, 'runs')
    try {
      const { readdir } = await import('node:fs/promises')
      const runIds = await readdir(runsDir)
      if (runIds.length === 1) runManifest = JSON.parse(await readFile(join(runsDir, runIds[0], 'manifest.json'), 'utf8'))
    } catch {
      // No run directory: assessTeachingRun reports the missing tool evidence instead.
    }
    const assessment = assessTeachingRun({ analysis, initialDesign, runManifest, audit })
    summary.assessment = assessment
    printInfo(`工具序列：${summary.tool_sequence.join(' → ') || '(无)'}`)
    printInfo(`候选数=${assessment.builds} 验证数=${assessment.validates} 导出数=${assessment.exports} 首版来自输入=${assessment.seed_match}`)
    printInfo(`最终 overall=${assessment.final_overall} 结果=${assessment.outcome}`)
    printInfo(
      `闭环证据：终版 PASS 绑定=${assessment.final_pass_bound} 导出绑定=${assessment.export_bound} ` +
        `严格终态=${terminal.completed}（reason=${terminal.final_reason ?? '-'}，legacy 口径=${assessment.terminal_complete}） 污染=${assessment.contaminated === true}`,
    )
    printInfo(
      `修复演示：初版候选 ${assessment.repair_evidence.first_validate_candidate_id ?? '-'} 实测 ${assessment.repair_evidence.first_validate_overall ?? '-'}` +
        ` → 终版候选 ${assessment.repair_evidence.final_candidate_id ?? '-'}；different=${assessment.repair_evidence.different_candidate} demonstrated=${assessment.repair_demonstrated}`,
    )
    const gate = summary.final_evidence
    if (gate.final_validate) {
      const checks = Object.entries(gate.final_validate.checks).map(([id, status]) => `${id}=${status}`).join(' ')
      printInfo(`终版报告 checks：${checks || '(无)'} step_sha256=${gate.final_validate.step_sha256 ?? '?'}`)
    }
    if (gate.export) printInfo(`导出：status=${gate.export.status} failed=${gate.export.failed} overall=${gate.export.overall} candidate=${gate.export.candidate_id} report=${gate.export.report_id}`)
    if (audit.foreign_calls.length) printInfo(`非 fitplate 工具调用 ${audit.foreign_calls.length} 次${audit.contaminated ? '（含工作区外路径/可疑路径，标记 contaminated）' : '（仅记录）'}`)
    for (const problem of assessment.problems) printInfo(`  ✗ ${problem}`)

    summary.finished_at = new Date().toISOString()
    // `--expect pass` is a *measured and demonstrated* claim: the final candidate's bound native
    // PASS, an export bound to the same stored report/STEP bytes, a finished turn, a clean audit,
    // and the repair scenario (shipped seed FAILed, a different candidate passed). `ok` alone is
    // only the interface-chain check and is never merged into this gate. The Plan02 branches
    // (normal / refuse) reuse the same strict evidence through expectationGate.
    const passSatisfied =
      assessment.final_overall === 'PASS' &&
      assessment.pipeline_complete === true &&
      assessment.repair_demonstrated === true &&
      audit.contaminated !== true
    const verdict = deriveRunVerdict({ expect: options.expect, assessment, audit, refusal: programRefusal, certifiedSuccess, terminal })
    const expectation = verdict.expectation
    summary.pass_satisfied = passSatisfied
    summary.expect = options.expect
    summary.expectation = expectation
    summary.expectation_scope_note =
      options.expect === 'refuse'
        ? 'program-refusal + terminal verification only; whether the model final explanation is semantically correct is a separate dimension (8-gate review), not judged by this runner'
        : null
    summary.result = verdict.result
    summary.verdict = { exit_code: verdict.exitCode, refusal_bypass: verdict.refusal_bypass }
    await writeFile(join(outDir, 'session-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    printInfo(`证据：${evidence.jsonlPath}\n      ${evidence.htmlPath}\n摘要：${join(outDir, 'session-summary.json')}`)

    if (options.expect === 'refuse') {
      printInfo('说明：本期望仅核验「程序拒绝 + 正常终态」；模型最终解释的语义正确性属另一维度（8 门槛评审），运行器不判分')
    }
    // The verdict is the single source of truth: no later check may contradict the written
    // summary. Reading it here (after the summary file is written) keeps result/exit identical.
    if (verdict.exitCode !== EXIT.OK) fail(verdict.exitCode, verdict.failureMessage)
    printInfo('✓ 教学运行原生证据完整（接口链路验收；几何通过与否见 summary）')
    return EXIT.OK
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error)
    summary.finished_at = new Date().toISOString()
    await writeFile(join(outDir, 'session-summary.json'), `${JSON.stringify(summary, null, 2)}\n`).catch(() => undefined)
    throw error
  } finally {
    await closeClient(client)
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (invokedDirectly) {
  await main(runTeachingCli)
}
