import { autoLayoutNodes } from '../layout'
import { ensureNode } from '../graph-model'
import { normalizeEscapedText } from '../text-utils'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'

export function parseState(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const stateMatch = line.match(/^state\s+"((?:\\.|[^"])*)"\s+as\s+(\S+)$/)
    if (stateMatch) {
      const [, label, id] = stateMatch
      ensureNode(nodes, id, normalizeEscapedText(label))
      continue
    }

    const descriptionMatch = line.match(/^(\S+)\s+:\s+(.+)$/)
    if (descriptionMatch) {
      const [, id, description] = descriptionMatch
      const node = ensureNode(nodes, id, id)
      node.data.stateDescription = [node.data.stateDescription, description.trim()].filter(Boolean).join('\n') || undefined
      continue
    }

    const transitionMatch = line.match(/^(\S+)\s+-->\s+(\S+)(?:\s+:\s+(.+))?$/)
    if (transitionMatch) {
      const [, sourceId, targetId, label] = transitionMatch
      ensureNode(nodes, sourceId, sourceId)
      ensureNode(nodes, targetId, targetId)
      edges.push({ id: `${sourceId}-${targetId}-${edges.length + 1}`, source: sourceId, target: targetId, label: label?.trim() })
    }
  }

  return {
    diagramType: 'state',
    direction: 'TD',
    nodes: autoLayoutNodes(Array.from(nodes.values()), edges, 'TD'),
    edges
  }
}
