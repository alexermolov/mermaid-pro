import { sanitizeId } from '../ids'
import { autoLayoutNodes } from '../layout'
import { createParsedNode } from '../graph-model'
import { normalizeMindmapLabel } from '../text-utils'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'

export function parseMindmap(lines: string[]): ParsedMermaidDiagram {
  const nodes: VisualNode[] = []
  const edges: VisualEdge[] = []
  const stack: Array<{ id: string; indent: number }> = []

  for (const rawLine of lines.slice(1)) {
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0
    const content = rawLine.trim()

    if (!content) {
      continue
    }

    const label = normalizeMindmapLabel(content)
    const id = sanitizeId(label) || `topic_${nodes.length + 1}`
    const uniqueId = createUniqueNodeId(id, nodes.map((node) => node.id))
    nodes.push(createParsedNode(uniqueId, label))

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]
    if (parent) {
      edges.push({ id: `${parent.id}-${uniqueId}-${edges.length + 1}`, source: parent.id, target: uniqueId })
    }

    stack.push({ id: uniqueId, indent })
  }

  return {
    diagramType: 'mindmap',
    direction: 'LR',
    nodes: autoLayoutNodes(nodes, edges, 'LR', 'mindmap'),
    edges
  }
}

function createUniqueNodeId(baseId: string, existingIds: string[]): string {
  if (!existingIds.includes(baseId)) {
    return baseId
  }

  let counter = 2
  while (existingIds.includes(`${baseId}_${counter}`)) {
    counter += 1
  }

  return `${baseId}_${counter}`
}
