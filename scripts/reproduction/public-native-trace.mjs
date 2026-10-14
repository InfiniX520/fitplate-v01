// Derived public trace. Retain only explicit public text and selected action metadata.
// This is not an official Agnes export and does not claim complete outbound-prompt isolation.
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const actionKeys = {
  'tool/call': ['toolUseId', 'name', 'args', 'resolvedPolicy'],
  'tool/result': ['toolUseId', 'isError'],
  'approval/asked': ['requestId', 'toolUseId', 'toolName', 'message', 'options'],
  'approval/decided': ['requestId', 'toolUseId', 'decision'],
  'turn/end': ['reason', 'error', 'stopReason'],
  'request/sent': [],
}
const privateKeys = new Set(['thinking', 'reasoning', 'redacted_thinking', 'reasoning_content', 'signature', 'thought_signature'])
const privateTypes = new Set(['thinking', 'reasoning', 'redacted_thinking'])

function cleanAction(value) {
  if (!value || typeof value !== 'object') return value
  if (privateTypes.has(value.type)) return undefined
  if (Array.isArray(value)) return value.map(cleanAction).filter(x => x !== undefined)
  return Object.fromEntries(Object.entries(value).filter(([key]) => !privateKeys.has(key)).map(([key, val]) => [key, cleanAction(val)]).filter(([, val]) => val !== undefined))
}

export function publicEvent(event) {
  if (!Number.isSafeInteger(event?.seq) || !event?.data) return null
  const row = { seq: event.seq, ts: event.ts ?? null, type: event.type, data: {} }
  if (event.type === 'assistant/message' || event.type === 'user/message') {
    const text = (event.data.content ?? []).filter(p => p?.type === 'text' && typeof p.text === 'string').map(p => ({ type: 'text', text: p.text }))
    row.data = { content: text }
    if (event.type === 'assistant/message') {
      row.data.stopReason = event.data.stopReason ?? null
      row.data.requestSeq = event.data.requestSeq ?? null
    }
    return row
  }
  const keys = actionKeys[event.type]
  if (!keys) return null
  for (const key of keys) if (Object.hasOwn(event.data, key)) row.data[key] = cleanAction(event.data[key])
  return row
}

const htmlEscape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

export async function writePublicTrace({ events, sessionId, out }) {
  // Re-apply the whitelist at the output boundary. Unknown event types are omitted.
  const rows = events.map(publicEvent).filter(Boolean)
  const jsonl = rows.map(row => JSON.stringify(row)).join('\n') + '\n'
  const transcript = rows.filter(row => row.type.endsWith('/message')).map(row => `<article><small>${htmlEscape(row.seq)} ${htmlEscape(row.type)}</small><pre>${htmlEscape(row.data.content.map(p => p.text).join('\n'))}</pre></article>`).join('\n')
  const html = '<!doctype html><meta charset="utf-8"><title>FitPlate public trace</title><style>body{max-width:1000px;margin:32px auto;font:16px sans-serif}pre{white-space:pre-wrap}article{border-top:1px solid #bbb;padding:16px 0}</style><h1>Derived public transcript</h1><p>Selected original event sequence numbers, explicit public messages and action metadata. Private thinking, unselected event types and full tool-result bodies are omitted. This is a derived reproduction record, not an official diagnostic ZIP.</p>' + transcript
  const jsonlPath = join(out, 'public-events.jsonl'), htmlPath = join(out, 'public-transcript.html')
  await writeFile(jsonlPath, jsonl, { flag: 'wx' })
  await writeFile(htmlPath, html, { flag: 'wx' })
  const provenance = { derived: true, official_diagnostic_zip: false, session_id: sessionId, event_count: rows.length, request_sent: rows.filter(row => row.type === 'request/sent').length, omitted: ['private thinking blocks', 'unselected native event types', 'full tool-result bodies'], jsonl_sha256: digest(jsonl), html_sha256: digest(html) }
  await writeFile(join(out, 'public-trace-provenance.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' })
  return { jsonlPath, htmlPath, ...provenance }
}
