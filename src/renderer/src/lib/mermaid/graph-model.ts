import type { VisualNode, VisualNodeData } from './types'

export function nextNodeId(nodes: VisualNode[]): string {
  return `node_${nodes.length + 1}_${Date.now().toString(36)}`
}

export function ensureNode(
  nodes: Map<string, VisualNode>,
  id: string,
  label?: string,
  data?: Partial<VisualNodeData>,
  opts?: { parentId?: string }
): VisualNode {
  const existingNode = nodes.get(id)
  if (existingNode) {
    const shouldUpdateLabel =
      Boolean(label) && (!existingNode.data.label || existingNode.data.label === id || label !== id)

    existingNode.data = {
      ...existingNode.data,
      ...(shouldUpdateLabel ? { label } : {}),
      ...(data ?? {})
    }
    if (opts?.parentId !== undefined) {
      existingNode.parentId = opts.parentId
      existingNode.extent = opts.parentId ? 'parent' : undefined
    }
    return existingNode
  }

  const nextNode = createParsedNode(id, label ?? id, data, opts)
  nodes.set(id, nextNode)
  return nextNode
}

export function createParsedNode(
  id: string,
  label: string,
  data?: Partial<VisualNodeData>,
  opts?: { parentId?: string }
): VisualNode {
  const parentId = opts?.parentId
  return {
    id,
    type: 'editableNode',
    parentId,
    extent: parentId ? 'parent' : undefined,
    position: { x: 0, y: 0 },
    data: {
      label,
      ...(data ?? {})
    }
  }
}
