import dagre from 'dagre'
import type { DiagramDirection, DiagramType } from '../../../../shared/diagram'
import { STATE_SCOPE_SEP } from './stateDiagramIds'
import type { VisualEdge, VisualNode } from './types'

const autoLayoutOrigin = { x: 120, y: 120 }

/** Dagre / fallback gaps: wide form cards (~220px) need extra room for edge paths and arrowheads. */
function isWideFormDiagram(diagramType?: DiagramType): boolean {
  return diagramType === 'class' || diagramType === 'er' || diagramType === 'state'
}

function getAutoLayoutSpacing(diagramType?: DiagramType): { rank: number; node: number } {
  if (diagramType === 'class') {
    return { rank: 380, node: 170 }
  }
  if (isWideFormDiagram(diagramType)) {
    return { rank: 300, node: 140 }
  }
  return { rank: 160, node: 72 }
}

function getTreeLayoutGaps(diagramType?: DiagramType): { primary: number; secondary: number } {
  if (diagramType === 'class') {
    return { primary: 440, secondary: 220 }
  }
  if (isWideFormDiagram(diagramType)) {
    return { primary: 360, secondary: 200 }
  }
  return { primary: 260, secondary: 180 }
}

function getLinearLayoutGap(diagramType?: DiagramType): { x: number; y: number } {
  if (diagramType === 'class') {
    return { x: 400, y: 190 }
  }
  if (isWideFormDiagram(diagramType)) {
    return { x: 340, y: 170 }
  }
  return { x: 240, y: 140 }
}

export function autoLayoutNodes(
  nodes: VisualNode[],
  edges: VisualEdge[],
  direction: DiagramDirection,
  diagramType?: DiagramType
): VisualNode[] {
  const origin = { x: 240, y: 180 }
  const { primary: primaryGap, secondary: secondaryGap } = getTreeLayoutGaps(diagramType)
  const nodeOrder = new Map(nodes.map((node, index) => [node.id, index]))
  const dagreSpacing = getAutoLayoutSpacing(diagramType)

  if (nodes.length <= 1 || edges.length === 0) {
    return layoutParsedNodesLinearly(nodes, direction, diagramType)
  }

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: direction,
    ranksep: dagreSpacing.rank,
    nodesep: dagreSpacing.node,
    marginx: autoLayoutOrigin.x,
    marginy: autoLayoutOrigin.y
  })

  for (const node of nodes) {
    graph.setNode(node.id, getAutoLayoutNodeSize(node, diagramType))
  }

  let hasUsableEdge = false
  for (const edge of edges) {
    if (edge.source === edge.target || !nodeOrder.has(edge.source) || !nodeOrder.has(edge.target)) {
      continue
    }

    graph.setEdge(edge.source, edge.target)
    hasUsableEdge = true
  }

  if (hasUsableEdge) {
    dagre.layout(graph)

    const positionedNodes = nodes.map((node) => {
      const dagreNode = graph.node(node.id) as { x?: number; y?: number; width?: number; height?: number } | undefined
      if (!dagreNode?.x || !dagreNode?.y || !dagreNode.width || !dagreNode.height) {
        return null
      }

      return {
        ...node,
        position: {
          x: Math.round(dagreNode.x - dagreNode.width / 2),
          y: Math.round(dagreNode.y - dagreNode.height / 2)
        }
      }
    })

    if (positionedNodes.every(Boolean)) {
      return positionedNodes as VisualNode[]
    }
  }

  const outgoing = new Map<string, Set<string>>()
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]))

  for (const node of nodes) {
    outgoing.set(node.id, new Set())
  }

  for (const edge of edges) {
    if (edge.source === edge.target || !outgoing.has(edge.source) || !incomingCount.has(edge.target)) {
      continue
    }

    const nextTargets = outgoing.get(edge.source)
    if (!nextTargets || nextTargets.has(edge.target)) {
      continue
    }

    nextTargets.add(edge.target)
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
  }

  const levels = new Map<string, number>()
  const queue = nodes
    .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
    .map((node) => node.id)

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) {
      continue
    }

    const currentLevel = levels.get(currentId) ?? 0
    for (const targetId of outgoing.get(currentId) ?? []) {
      const nextLevel = currentLevel + 1
      const previousLevel = levels.get(targetId)
      if (previousLevel === undefined || previousLevel < nextLevel) {
        levels.set(targetId, nextLevel)
      }

      const nextIncomingCount = (incomingCount.get(targetId) ?? 0) - 1
      incomingCount.set(targetId, nextIncomingCount)
      if (nextIncomingCount === 0) {
        queue.push(targetId)
      }
    }
  }

  let fallbackLevel = Math.max(0, ...levels.values())
  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, fallbackLevel)
      fallbackLevel += 1
    }
  }

  const nodesByLevel = new Map<number, VisualNode[]>()
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0
    const levelNodes = nodesByLevel.get(level)
    if (levelNodes) {
      levelNodes.push(node)
    } else {
      nodesByLevel.set(level, [node])
    }
  }

  for (const levelNodes of nodesByLevel.values()) {
    levelNodes.sort((firstNode, secondNode) => (nodeOrder.get(firstNode.id) ?? 0) - (nodeOrder.get(secondNode.id) ?? 0))
  }

  return nodes.map((node) => {
    const level = levels.get(node.id) ?? 0
    const levelNodes = nodesByLevel.get(level) ?? [node]
    const siblingIndex = levelNodes.findIndex((levelNode) => levelNode.id === node.id)
    const centeredOffset = siblingIndex - (levelNodes.length - 1) / 2

    switch (direction) {
      case 'BT':
        return {
          ...node,
          position: {
            x: origin.x + centeredOffset * secondaryGap,
            y: origin.y + (fallbackLevel - level - 1) * primaryGap
          }
        }
      case 'RL':
        return {
          ...node,
          position: {
            x: origin.x + (fallbackLevel - level - 1) * primaryGap,
            y: origin.y + centeredOffset * secondaryGap
          }
        }
      case 'LR':
        return {
          ...node,
          position: {
            x: origin.x + level * primaryGap,
            y: origin.y + centeredOffset * secondaryGap
          }
        }
      case 'TD':
      default:
        return {
          ...node,
          position: {
            x: origin.x + centeredOffset * secondaryGap,
            y: origin.y + level * primaryGap
          }
        }
    }
  })
}

function scopeSegmentCount(id: string): number {
  if (!id.includes(STATE_SCOPE_SEP)) {
    return 0
  }

  return id.split(STATE_SCOPE_SEP).length - 1
}

/**
 * Hierarchical layout for state diagrams with composite `state X { … }` groups (React Flow `parentId`).
 */
export function layoutStateCompositeNodes(nodes: VisualNode[], edges: VisualEdge[], direction: DiagramDirection): VisualNode[] {
  let acc = nodes.map((node) => ({ ...node }))
  const childrenOf = (parentId: string) => acc.filter((n) => n.parentId === parentId)

  const composites = acc
    .filter((n) => n.data.stateIsComposite)
    .sort((a, b) => scopeSegmentCount(b.id) - scopeSegmentCount(a.id))

  for (const comp of composites) {
    const ch = childrenOf(comp.id)
    if (ch.length === 0) {
      const minW = 280
      const minH = 180
      acc = acc.map((n) => (n.id === comp.id ? { ...n, style: { ...n.style, width: minW, height: minH } } : n))
      continue
    }

    const childIds = new Set(ch.map((c) => c.id))
    const innerEdges = edges.filter((e) => childIds.has(e.source) && childIds.has(e.target))
    const laid = autoLayoutNodes(ch, innerEdges, direction, 'state')
    const snapshot = new Map(acc.map((n) => [n.id, n]))
    const sizes = laid.map((n) => getAutoLayoutNodeSize(snapshot.get(n.id) ?? n, 'state'))

    const minX = Math.min(...laid.map((n) => n.position.x))
    const minY = Math.min(...laid.map((n) => n.position.y))
    const pad = 44

    const rel = laid.map((n) => ({
      ...n,
      position: {
        x: n.position.x - minX + pad,
        y: n.position.y - minY + pad
      }
    }))

    let maxX = 0
    let maxY = 0
    for (let i = 0; i < rel.length; i += 1) {
      const n = rel[i]
      const sz = sizes[i] ?? { width: 220, height: 108 }
      maxX = Math.max(maxX, n.position.x + sz.width)
      maxY = Math.max(maxY, n.position.y + sz.height)
    }

    const boxW = Math.max(280, maxX + pad)
    const boxH = Math.max(180, maxY + pad)

    acc = acc.map((node) => {
      const hit = rel.find((r) => r.id === node.id)
      if (hit) {
        return { ...node, ...hit }
      }
      if (node.id === comp.id) {
        return { ...node, style: { ...node.style, width: boxW, height: boxH } }
      }
      return node
    })
  }

  const idToNode = new Map(acc.map((n) => [n.id, n]))

  function rootAncestor(nodeId: string): string {
    let current = idToNode.get(nodeId)
    while (current?.parentId) {
      current = idToNode.get(current.parentId)
    }
    return current?.id ?? nodeId
  }

  const roots = acc.filter((n) => !n.parentId)
  const compressKeys = new Set<string>()
  const compressedEdges: VisualEdge[] = []

  for (const e of edges) {
    const rs = rootAncestor(e.source)
    const rt = rootAncestor(e.target)
    const comp = idToNode.get(rs)

    if (rs === rt && comp?.data.stateIsComposite) {
      const prefix = `${rs}${STATE_SCOPE_SEP}`
      const srcIn = e.source === rs || e.source.startsWith(prefix)
      const tgtIn = e.target === rs || e.target.startsWith(prefix)
      if (srcIn && tgtIn) {
        continue
      }
    }

    const key = `${rs}|${rt}`
    if (compressKeys.has(key)) {
      continue
    }
    compressKeys.add(key)
    compressedEdges.push({
      ...e,
      id: `r-${rs}-${rt}-${compressedEdges.length}`,
      source: rs,
      target: rt
    })
  }

  const laidRoots = autoLayoutNodes(roots, compressedEdges, direction, 'state')
  const posById = new Map(laidRoots.map((n) => [n.id, n.position]))

  acc = acc.map((node) => {
    const pos = posById.get(node.id)
    if (pos && !node.parentId) {
      return { ...node, position: { ...pos } }
    }
    return node
  })

  return acc
}

export function layoutSequenceNodes(nodes: VisualNode[]): VisualNode[] {
  const origin = { x: 120, y: 80 }
  const gap = 240

  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: origin.x + index * gap,
      y: origin.y
    }
  }))
}

export function getSequenceLifelineHeight(messageCount: number): number {
  return Math.max(180, 96 + messageCount * 56)
}

function getAutoLayoutNodeSize(node: VisualNode, diagramType?: DiagramType): { width: number; height: number } {
  const textSections = [
    node.data.label,
    node.data.classAttributes,
    node.data.classMethods,
    node.data.erAttributes,
    node.data.stateDescription
  ].filter((section): section is string => typeof section === 'string' && section.trim().length > 0)

  const lines = textSections.flatMap((section) => section.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
  const longestLineLength = Math.max(...lines.map((line) => line.length), 12)
  const lineCount = Math.max(lines.length, 1)

  let width = clamp(180, 360, 56 + longestLineLength * 7)
  let height = clamp(56, 280, 28 + lineCount * 22)

  if (diagramType === 'class') {
    width = Math.max(220, width)
    const classHeight = 28 + lineCount * 22
    height = clamp(132, 400, Math.max(height, classHeight))
  } else if (diagramType === 'er') {
    width = Math.max(220, width)
    height = Math.max(116, height)
  } else if (diagramType === 'state') {
    if (node.data.stateIsComposite) {
      const rawW = node.style?.width
      const rawH = node.style?.height
      const styleWidth = typeof rawW === 'number' ? rawW : typeof rawW === 'string' ? parseFloat(rawW) : Number.NaN
      const styleHeight = typeof rawH === 'number' ? rawH : typeof rawH === 'string' ? parseFloat(rawH) : Number.NaN
      if (Number.isFinite(styleWidth) && Number.isFinite(styleHeight)) {
        return { width: Math.max(240, styleWidth), height: Math.max(160, styleHeight) }
      }
    }

    if (node.data.statePseudo) {
      return { width: 112, height: 72 }
    }

    width = Math.max(220, width)
    height = Math.max(108, height)
  }

  return { width, height }
}

function clamp(minimum: number, maximum: number, value: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function layoutParsedNodesLinearly(nodes: VisualNode[], direction: DiagramDirection, diagramType?: DiagramType): VisualNode[] {
  const origin = { x: 120, y: 140 }
  const gap = getLinearLayoutGap(diagramType)
  const lastIndex = nodes.length - 1

  return nodes.map((node, index) => {
    switch (direction) {
      case 'BT':
        return { ...node, position: { x: origin.x, y: origin.y + (lastIndex - index) * gap.y } }
      case 'LR':
        return { ...node, position: { x: origin.x + index * gap.x, y: origin.y } }
      case 'RL':
        return { ...node, position: { x: origin.x + (lastIndex - index) * gap.x, y: origin.y } }
      case 'TD':
      default:
        return { ...node, position: { x: origin.x, y: origin.y + index * gap.y } }
    }
  })
}
