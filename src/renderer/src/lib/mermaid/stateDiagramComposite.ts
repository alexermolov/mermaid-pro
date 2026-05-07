import { STATE_SCOPE_SEP } from './stateDiagramIds'
import type { VisualEdge, VisualNode } from './types'

function scopeSegmentCount(id: string): number {
  if (!id.includes(STATE_SCOPE_SEP)) {
    return 0
  }

  return id.split(STATE_SCOPE_SEP).length - 1
}

function compositeNestingDepth(nodeById: Map<string, VisualNode>, compositeId: string): number {
  let depth = 0
  let current = nodeById.get(compositeId)
  while (current?.parentId) {
    const parent = nodeById.get(current.parentId)
    if (parent?.data.stateIsComposite) {
      depth += 1
    }
    current = parent
  }
  return depth
}

function compositeOwnerIdOf(nodeById: Map<string, VisualNode>, nodeId: string): string | undefined {
  const node = nodeById.get(nodeId)
  const ownerId = node?.data.stateCompositeOwnerId
  if (!ownerId) {
    return undefined
  }
  const ownerNode = nodeById.get(ownerId)
  return ownerNode?.data.stateIsComposite ? ownerId : undefined
}

/** True when nodeId denotes a descendant of compositeId (composite frame excluded). Scoped ids fall back to prefix matching. */
function isStrictDescendantOfComposite(
  nodeById: Map<string, VisualNode>,
  compositeId: string,
  nodeId: string,
  visited = new Set<string>()
): boolean {
  if (nodeId === compositeId) {
    return false
  }

  if (visited.has(nodeId)) {
    return false
  }
  visited.add(nodeId)

  let current = nodeById.get(nodeId)
  while (current) {
    if (current.parentId === compositeId) {
      return true
    }
    current = current.parentId ? nodeById.get(current.parentId) : undefined
  }

  const ownerId = compositeOwnerIdOf(nodeById, nodeId)
  if (ownerId) {
    if (ownerId === compositeId) {
      return true
    }
    if (isStrictDescendantOfComposite(nodeById, compositeId, ownerId, visited)) {
      return true
    }
  }

  return nodeId.startsWith(`${compositeId}${STATE_SCOPE_SEP}`)
}

export function isNodeInsideComposite(
  nodeById: Map<string, VisualNode>,
  compositeId: string,
  nodeId: string
): boolean {
  return isStrictDescendantOfComposite(nodeById, compositeId, nodeId)
}

/** Deepest composite that strictly contains both edge endpoints (for subgraph emission). */
export function deepestContainingComposite(edge: VisualEdge, nodes: VisualNode[]): string | null {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const composites = nodes
    .filter((n) => n.data.stateIsComposite)
    .sort((a, b) => {
      const depthDelta = compositeNestingDepth(nodeById, b.id) - compositeNestingDepth(nodeById, a.id)
      return depthDelta !== 0 ? depthDelta : scopeSegmentCount(b.id) - scopeSegmentCount(a.id)
    })

  for (const composite of composites) {
    if (
      isStrictDescendantOfComposite(nodeById, composite.id, edge.source) &&
      isStrictDescendantOfComposite(nodeById, composite.id, edge.target)
    ) {
      return composite.id
    }
  }

  return null
}

/**
 * Mermaid fails to render empty `state "…" as id { }` blocks ("No such shape: roundedWithTitle").
 * Treat composites with no nested states and no fully-internal transitions as simple states.
 */
export function stateCompositeHasRenderableBody(composite: VisualNode, nodes: VisualNode[], edges: VisualEdge[]): boolean {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const children = nodes.filter((n) => isNodeInsideComposite(nodeById, composite.id, n.id))
  const hasNestedStateOrComposite = children.some((c) => Boolean(c.data.stateIsComposite) || !c.data.statePseudo)

  if (hasNestedStateOrComposite) {
    return true
  }

  return edges.some((e) => deepestContainingComposite(e, nodes) === composite.id)
}
