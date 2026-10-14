export interface ClearanceFacts {
  measuredMm: number | null
  measurementState: 'measured' | 'none-reported' | 'unavailable'
  requiredMm: number | null
  pair: { moving: string; fixed: string } | null
  supportContactStatus: string | null
  checkScope: string[]
  failurePair: string | null
}
export interface DeliveryBinding {
  candidateId: string | null
  taskRevision: number | null
  stepSha256: string | null
  reportId: string | null
}
export function clearanceFacts(check: unknown): ClearanceFacts
export function clearanceFactLines(facts: ClearanceFacts): string[]
export function deliveryFacts(report: unknown, binding: DeliveryBinding): {
  identity: DeliveryBinding
  bindingState: 'current' | 'stale' | 'unverified'
  missing: string[]
  mismatched: string[]
  overall: string
  checksComplete: boolean
  accepted: boolean
  clearance: ClearanceFacts
  scope: 'software_geometry_only'
}
