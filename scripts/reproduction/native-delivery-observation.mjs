// Metadata-only pilot observation. No model requests or changes to acceptance criteria.
export function observeNativeDelivery({manifests, events, quiet, expectedTurns = 2}) {
 const ends = events.filter(e => e.type === 'turn/end');
 const terminal = ends.at(-1)?.data?.reason ?? null;
 const exported = manifests.some(m => Object.values(m.exports ?? {}).some(rows =>
  Array.isArray(rows) && rows.some(e => e.failed !== true)));
 const complete = quiet && ends.length >= expectedTurns;
 return {state: !complete ? 'pending' : terminal !== 'completed' ? 'native-failed' :
  exported ? 'export-observed' : 'completed-without-export',
  completed_turns: ends.filter(e => e.data?.reason === 'completed').length,
  observed_turn_ends: ends.length, final_reason: terminal, quiet,
  runs: manifests.map(m => ({run_id: m.run_id, candidates: Object.keys(m.candidates ?? {}).length})),
  exported};
}
