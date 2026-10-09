import dagre from 'dagre'
import type { DiagramDirection, DiagramType } from '../../../../shared/diagram'
import { getFlowchartShapeDefinition } from '../flowchartShapeRegistry'
import type { VisualEdge, VisualNode } from './types'

const defaultNodeWidth = 176
const defaultNodeHeight = 84
const defaultSubgraphWidth = 380
const defaultSubgraphHeight = 260

const flowRankSep = 80
const flowNodeSep = 60

let skipDagre = false

function mapDirection(direction: DiagramDirection): 'TB' | 'BT' | 'LR' | 'RL' {
  switch (direction) {
    case 'BT':
      return 'BT'
    case 'LR':
      return 'LR'
    case 'RL':
      return 'RL'
    case 'TD':
    default:
      return 'TB'
  }
}

function getNodeDimensions(node: VisualNode): { width: number; height: number } {
  const existingWidth =
    node.width ?? (typeof node.style?.width === 'number' ? node.style.width : undefined)
  const existingHeight =
    node.height ?? (typeof node.style?.height === 'number' ? node.style.height : undefined)

  if (existingWidth != null && existingHeight != null) {
    return { width: existingWidth, height: existingHeight }
  }

  if (node.type === 'subgraphBoundary') {
    return {
      width: existingWidth ?? defaultSubgraphWidth,
      height: existingHeight ?? defaultSubgraphHeight,
    }
  }

  const shape = node.data.shape ?? 'rectangle'
  const def = getFlowchartShapeDefinition(shape)
  const layout = def.layout

  const width =
    existingWidth ??
    (typeof layout?.width === 'number' ? layout.width : undefined) ??
    (typeof layout?.minWidth === 'number' ? layout.minWidth : defaultNodeWidth)

  const height =
    existingHeight ??
    (typeof layout?.height === 'number' ? layout.height : undefined) ??
    (typeof layout?.minHeight === 'number' ? layout.minHeight : defaultNodeHeight)

  return { width, height }
}

export function autoLayoutNodes(
  nodes: VisualNode[],
  edges: VisualEdge[],
  direction: DiagramDirection,
  diagramType?: DiagramType
): VisualNode[] {
  if (skipDagre) {
    return nodes
  }

  // Flowchart layout is handled by the dedicated subgraph-aware function
  if (diagramType === 'flowchart') {
    return nodes
  }

  const g = new dagre.graphlib.Graph()
    .setGraph({
      rankdir: mapDirection(direction),
      nodesep: flowNodeSep,
      ranksep: flowRankSep,
      marginx: 20,
      marginy: 20,
    })
    .setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    // Skip child nodes that belong to a parent (e.g. state composites)
    if (node.parentId) continue

    const dims = getNodeDimensions(node)
    g.setNode(node.id, { width: dims.width, height: dims.height })
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  try {
    dagre.layout(g)
  } catch {
    return nodes
  }

  return nodes.map((node) => {
    if (node.parentId || !g.hasNode(node.id)) {
      return node
    }

    const dagreNode = g.node(node.id)
    const x = dagreNode.x - dagreNode.width / 2
    const y = dagreNode.y - dagreNode.height / 2

    return {
      ...node,
      position: { x, y },
      style: {
        ...node.style,
        width: dagreNode.width,
        height: dagreNode.height,
      },
      width: dagreNode.width,
      height: dagreNode.height,
    }
  })
}

export function setSkipDagre(value: boolean): void {
  skipDagre = value
}

export function layoutStateCompositeNodes(
  nodes: VisualNode[],
  _edges: VisualEdge[],
  _direction: DiagramDirection
): VisualNode[] {
  return nodes
}

export function getSequenceLifelineHeight(messageCount: number): number {
  return Math.max(180, 96 + messageCount * 56)
}

export function layoutSequenceNodes(nodes: VisualNode[]): VisualNode[] {
  return nodes
}

/**
 * Hierarchical layout for flowcharts with subgraph boundary nodes (React Flow `parentId`).
 * Uses dagre compound graphs so that:
 * - nodes inside a subgraph are laid out relative to the container,
 * - subgraph containers are sized to tightly wrap their children,
 * - edges between nodes, containers, and across container boundaries are handled.
 */
export function layoutFlowchartSubgraphNodes(
  nodes: VisualNode[],
  edges: VisualEdge[],
  direction: DiagramDirection,
  diagramType?: DiagramType
): VisualNode[] {
  if (skipDagre) {
    return nodes
  }

  if (diagramType !== 'flowchart') {
    return nodes
  }

  const g = new dagre.graphlib.Graph({ compound: true })
    .setGraph({
      rankdir: mapDirection(direction),
      nodesep: flowNodeSep,
      ranksep: flowRankSep,
      marginx: 24,
      marginy: 24,
    })
    .setDefaultEdgeLabel(() => ({}))

  // Add every node (regular + subgraph boundaries) to the graph
  for (const node of nodes) {
    const dims = getNodeDimensions(node)
    g.setNode(node.id, { width: dims.width, height: dims.height })
  }

  // Build compound hierarchy from React Flow parentId
  for (const node of nodes) {
    if (node.parentId && g.hasNode(node.parentId)) {
      g.setParent(node.id, node.parentId)
    }
  }

  // Proxy edges that are incident directly to a cluster (subgraph boundary) so dagre
  // routes them via a child node inside that cluster instead. This avoids dagre quirks
  // with edges to compound nodes while still pulling clusters close to each other.
  const firstChildByParent = new Map<string, string>()
  for (const node of nodes) {
    if (node.parentId && node.type !== 'subgraphBoundary') {
      if (!firstChildByParent.has(node.parentId)) {
        firstChildByParent.set(node.parentId, node.id)
      }
    }
  }

  for (const edge of edges) {
    let source = edge.source
    let target = edge.target

    if (firstChildByParent.has(source)) {
      source = firstChildByParent.get(source)!
    }
    if (firstChildByParent.has(target)) {
      target = firstChildByParent.get(target)!
    }

    if (source !== target && g.hasNode(source) && g.hasNode(target)) {
      g.setEdge(source, target)
    }
  }

  try {
    dagre.layout(g)
  } catch {
    return nodes
  }

  return nodes.map((node) => {
    const dagreNode = g.node(node.id)
    if (!dagreNode) return node

    let x: number
    let y: number

    if (node.parentId) {
      const parentDagre = g.node(node.parentId)
      if (parentDagre) {
        const parentLeft = parentDagre.x - parentDagre.width / 2
        const parentTop = parentDagre.y - parentDagre.height / 2
        const childLeft = dagreNode.x - dagreNode.width / 2
        const childTop = dagreNode.y - dagreNode.height / 2
        x = childLeft - parentLeft
        y = childTop - parentTop
      } else {
        x = dagreNode.x - dagreNode.width / 2
        y = dagreNode.y - dagreNode.height / 2
      }
    } else {
      x = dagreNode.x - dagreNode.width / 2
      y = dagreNode.y - dagreNode.height / 2
    }

    const nextStyle = { ...node.style }

    if (node.type === 'subgraphBoundary') {
      // Let dagre resize the container to tightly wrap children
      nextStyle.width = dagreNode.width
      nextStyle.height = dagreNode.height
    }

    return {
      ...node,
      position: { x, y },
      style: nextStyle,
      width: dagreNode.width,
      height: dagreNode.height,
    }
  })
}
