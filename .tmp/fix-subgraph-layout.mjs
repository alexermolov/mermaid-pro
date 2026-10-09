// One-off fix script: run with `node .tmp/fix-subgraph-layout.mjs`
import { readFileSync, writeFileSync } from 'node:fs'

function mustReplace(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Patch anchor not found: ${label}`)
  }
  if (content.includes(to)) {
    console.log(`already applied: ${label}`)
    return content
  }
  console.log(`applied: ${label}`)
  return content.replace(from, to)
}

// Normalize CRLF -> LF for patching, restore CRLF on write (repo uses CRLF)
const flowchartPath = 'src/renderer/src/lib/mermaid/parse/flowchart.ts'
const layoutPath = 'src/renderer/src/lib/mermaid/layout.ts'
const readLf = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const writeCrlf = (p, c) => writeFileSync(p, c.replace(/\n/g, '\r\n'), 'utf8')

// ---------- 1. parse/flowchart.ts: use subgraph-aware layout on parse ----------
let fc = readLf(flowchartPath)

fc = mustReplace(
  fc,
  "import { autoLayoutNodes } from '../layout'",
  "import { autoLayoutNodes, layoutFlowchartSubgraphNodes } from '../layout'",
  'flowchart import'
)

fc = mustReplace(
  fc,
  `  const allNodes = Array.from(nodes.values())
  applySubgraphBoundaries(allNodes, nodes, subgraphs)

  return {
    diagramType: 'flowchart',
    direction,
    nodes: autoLayoutNodes(allNodes, edges, direction, 'flowchart'),
    edges
  }`,
  `  const allNodes = Array.from(nodes.values())
  applySubgraphBoundaries(allNodes, nodes, subgraphs)

  const hasSubgraphBoundaries = allNodes.some((node) => node.type === 'subgraphBoundary')

  return {
    diagramType: 'flowchart',
    direction,
    nodes: hasSubgraphBoundaries
      ? layoutFlowchartSubgraphNodes(allNodes, edges, direction, 'flowchart')
      : autoLayoutNodes(allNodes, edges, direction, 'flowchart'),
    edges
  }`,
  'flowchart parse return'
)

writeCrlf(flowchartPath, fc)

// ---------- 2. layout.ts fixes ----------
let ly = readLf(layoutPath)

// 2a. Respect per-subgraph `direction TB` when laying out children
ly = mustReplace(
  ly,
  `    const innerEdges = edges.filter((e) => childIds.has(e.source) && childIds.has(e.target))
    const laidChildren = autoLayoutNodes(children, innerEdges, direction, diagramType)`,
  `    const innerEdges = edges.filter((e) => childIds.has(e.source) && childIds.has(e.target))
    const childDirection = boundary.data.subgraphDirection ?? direction
    const laidChildren = autoLayoutNodes(children, innerEdges, childDirection, diagramType)`,
  'layout childDirection'
)

// 2b. Root layout: map cross-subgraph edges onto top-most boundary containers
ly = mustReplace(
  ly,
  `  const roots = acc.filter((n) => !n.parentId)
  if (roots.length > 1) {
    const rootEdges = edges.filter(
      (e) => !e.source.startsWith('__sg_') && !e.target.startsWith('__sg_')
    )
    const laidRoots = autoLayoutNodes(roots, rootEdges, direction, diagramType)`,
  `  const roots = acc.filter((n) => !n.parentId)
  if (roots.length > 1) {
    const nodeById = new Map(acc.map((n) => [n.id, n]))

    const rootOwnerOf = (nodeId) => {
      let current = nodeById.get(nodeId)
      while (current?.parentId) {
        const parent = nodeById.get(current.parentId)
        if (!parent) {
          return undefined
        }
        if (!parent.parentId) {
          return parent.id
        }
        current = parent
      }
      return current && !current.parentId ? current.id : undefined
    }

    const rootEdges = []
    for (const edge of edges) {
      const sourceOwner = rootOwnerOf(edge.source)
      const targetOwner = rootOwnerOf(edge.target)
      if (!sourceOwner || !targetOwner || sourceOwner === targetOwner) {
        continue
      }
      rootEdges.push({ ...edge, source: sourceOwner, target: targetOwner })
    }

    const laidRoots = autoLayoutNodes(roots, rootEdges, direction, diagramType)`,
  'layout rootEdges'
)

// 2c. getAutoLayoutNodeSize: honor subgraph boundary style width/height
ly = mustReplace(
  ly,
  `function getAutoLayoutNodeSize(node: VisualNode, diagramType?: DiagramType): { width: number; height: number } {
  const textSections = [`,
  `function getAutoLayoutNodeSize(node: VisualNode, diagramType?: DiagramType): { width: number; height: number } {
  if (node.type === 'subgraphBoundary') {
    const rawW = node.style?.width
    const rawH = node.style?.height
    const styleWidth = typeof rawW === 'number' ? rawW : typeof rawW === 'string' ? parseFloat(rawW) : Number.NaN
    const styleHeight = typeof rawH === 'number' ? rawH : typeof rawH === 'string' ? parseFloat(rawH) : Number.NaN
    if (Number.isFinite(styleWidth) && Number.isFinite(styleHeight)) {
      return { width: Math.max(240, styleWidth), height: Math.max(160, styleHeight) }
    }
  }

  const textSections = [`,
  'layout boundary size'
)

writeCrlf(layoutPath, ly)

console.log('done')
