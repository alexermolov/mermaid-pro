import { parseErRelationshipData } from '../er-cardinality'
import { autoLayoutNodes } from '../layout'
import { ensureNode } from '../graph-model'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'

export function parseEr(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const entityMatch = line.match(/^(\S+)\s+\{$/)
    if (entityMatch) {
      const id = entityMatch[1]
      const attributes: string[] = []
      index += 1

      while (index < lines.length && lines[index].trim() !== '}') {
        const attribute = lines[index].trim()
        if (attribute) {
          attributes.push(attribute)
        }
        index += 1
      }

      ensureNode(nodes, id, id, { erAttributes: attributes.join('\n') || undefined })
      continue
    }

    const relationshipMatch = line.match(/^(\S+)\s+([|}o]{2}(?:--|\.\.)(?:[|{o]{2}))\s+(\S+)\s+:\s+(.+)$/)
    if (relationshipMatch) {
      const [, sourceId, relationship, targetId, label] = relationshipMatch
      ensureNode(nodes, sourceId, sourceId)
      ensureNode(nodes, targetId, targetId)
      edges.push({
        id: `${sourceId}-${targetId}-${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: label.trim(),
        data: parseErRelationshipData(relationship)
      })
    }
  }

  return {
    diagramType: 'er',
    direction: 'LR',
    nodes: autoLayoutNodes(Array.from(nodes.values()), edges, 'LR', 'er'),
    edges
  }
}
