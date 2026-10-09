// Verification: parse the user's subgraph flowchart and check that
// children are laid out INSIDE their subgraph boundary containers.
import './window-polyfill'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseFlowchart } from '../../src/renderer/src/lib/mermaid/parse/flowchart'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(here, '..', 'user-diagram.mmd'), 'utf8')
const parsed = parseFlowchart(code.split(/\r?\n/))

const boundaries = parsed.nodes.filter((n) => n.type === 'subgraphBoundary')
const children = parsed.nodes.filter((n) => n.parentId)

console.log(`boundaries: ${boundaries.length}, children: ${children.length}, edges: ${parsed.edges.length}`)

if (boundaries.length === 0) {
  console.error('FAIL: no subgraph boundaries created')
  process.exit(1)
}

// Approximate child node size (same heuristic as layout: clamp(180,360,...) x clamp(56,280,...))
function approxSize(label: string): { width: number; height: number } {
  const lines = label.split(/<br\s*\/?>/i).flatMap((l) => l.split(/\r?\n/))
  const longest = Math.max(...lines.map((l) => l.length), 12)
  const width = Math.min(360, Math.max(180, 56 + longest * 7))
  const height = Math.min(280, Math.max(56, 28 + lines.length * 22))
  return { width, height }
}

let failures = 0

for (const child of children) {
  const parent = parsed.nodes.find((n) => n.id === child.parentId)
  if (!parent) {
    console.error(`FAIL: child ${child.id} has parentId ${child.parentId} but no such boundary`)
    failures++
    continue
  }

  const pw = Number(parent.style?.width)
  const ph = Number(parent.style?.height)
  const sz = approxSize(String(child.data.label ?? ''))
  const { x, y } = child.position

  const inside = x >= 0 && y >= 0 && x + sz.width <= pw && y + sz.height <= ph
  if (!inside) {
    console.error(
      `FAIL: ${child.id} outside ${parent.id}: pos=(${x},${y}) size=${sz.width}x${sz.height} box=${pw}x${ph}`
    )
    failures++
  }
}

// Root boundaries must not overlap each other
const roots = parsed.nodes.filter((n) => !n.parentId)
for (let i = 0; i < roots.length; i++) {
  for (let j = i + 1; j < roots.length; j++) {
    const a = roots[i]
    const b = roots[j]
    const aw = Number(a.style?.width) || 380
    const ah = Number(a.style?.height) || 260
    const bw = Number(b.style?.width) || 380
    const bh = Number(b.style?.height) || 260
    const overlap =
      a.position.x < b.position.x + bw &&
      b.position.x < a.position.x + aw &&
      a.position.y < b.position.y + bh &&
      b.position.y < a.position.y + bh
    if (overlap) {
      console.error(`FAIL: root boundaries overlap: ${a.id} <-> ${b.id}`)
      failures++
    }
  }
}

// Root layout should be hierarchical (not a single column/row of 10 boxes)
const rootXs = roots.map((r) => r.position.x)
const rootYs = roots.map((r) => r.position.y)
const distinctX = new Set(rootXs.map(Math.round)).size
const distinctY = new Set(rootYs.map(Math.round)).size
console.log(`roots: ${roots.length}, distinct x-ranks: ${distinctX}, y-ranks: ${distinctY}`)
if (roots.length > 3 && (distinctX === 1 || distinctY === 1)) {
  console.error('FAIL: root boundaries laid out linearly (single row/column) — hierarchy lost')
  failures++
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`)
  process.exit(1)
}

console.log('\nALL CHECKS PASSED ✓')
console.log('\nRoot boundary positions:')
for (const r of roots.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)) {
  console.log(
    `  ${String(r.data.label).padEnd(45)} (${Math.round(r.position.x)}, ${Math.round(r.position.y)}) ${Math.round(
      Number(r.style?.width) || 0
    )}x${Math.round(Number(r.style?.height) || 0)}`
  )
}
