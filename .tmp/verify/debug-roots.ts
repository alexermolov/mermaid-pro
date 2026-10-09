// Debug: dump root boundary positions/sizes and edge resolution after parse.
import './window-polyfill'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseFlowchart } from '../../src/renderer/src/lib/mermaid/parse/flowchart'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(here, '..', 'user-diagram.mmd'), 'utf8')
const parsed = parseFlowchart(code.split(/\r?\n/))

const roots = parsed.nodes.filter((n) => !n.parentId)
console.log('=== ROOTS (position | style size) ===')
for (const r of roots) {
  console.log(
    r.id.padEnd(18),
    `pos=(${Math.round(r.position.x)},${Math.round(r.position.y)})`,
    `size=${Math.round(Number(r.style?.width) || 0)}x${Math.round(Number(r.style?.height) || 0)}`
  )
}

console.log('\n=== EXACT OVERLAP CHECK ===')
let overlaps = 0
for (let i = 0; i < roots.length; i++) {
  for (let j = i + 1; j < roots.length; j++) {
    const a = roots[i]
    const b = roots[j]
    const aw = Number(a.style?.width)
    const ah = Number(a.style?.height)
    const bw = Number(b.style?.width)
    const bh = Number(b.style?.height)
    if (
      a.position.x < b.position.x + bw &&
      b.position.x < a.position.x + aw &&
      a.position.y < b.position.y + bh &&
      b.position.y < a.position.y + ah
    ) {
      console.log(
        `OVERLAP: ${a.id} (${Math.round(a.position.x)},${Math.round(a.position.y)} ${aw}x${ah}) <-> ` +
          `${b.id} (${Math.round(b.position.x)},${Math.round(b.position.y)} ${bw}x${bh})`
      )
      overlaps++
    }
  }
}
console.log(`overlaps: ${overlaps}`)

console.log('\n=== CHILDREN REL POSITIONS (per boundary, first 4) ===')
const byParent = new Map<string, typeof parsed.nodes>()
for (const c of parsed.nodes.filter((n) => n.parentId)) {
  const list = byParent.get(String(n.parentId)) ?? []
  list.push(c)
  byParent.set(String(n.parentId), list)
}
for (const [pid, kids] of byParent) {
  console.log(
    pid.padEnd(18),
    kids
      .slice(0, 4)
      .map((k) => `${k.id}=(${Math.round(k.position.x)},${Math.round(k.position.y)})`)
      .join(' ')
  )
}

console.log('\n=== EDGES touching root boundaries ===')
const rootIds = new Set(roots.map((r) => r.id))
for (const e of parsed.edges) {
  if (rootIds.has(e.source) || rootIds.has(e.target)) {
    console.log(`${e.source} -> ${e.target}`)
  }
}

console.log('\n=== LABEL SAMPLES (check <br/> handling) ===')
for (const id of ['IN1', 'BD3', 'EC_AC']) {
  const n = parsed.nodes.find((x) => x.id === id)
  console.log(id, '=>', JSON.stringify(n?.data.label))
}
