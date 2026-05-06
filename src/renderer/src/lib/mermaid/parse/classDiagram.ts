import { autoLayoutNodes } from '../layout'
import { ensureNode } from '../graph-model'
import type { ParsedMermaidDiagram, VisualEdge, VisualNode } from '../types'

export function parseClass(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()

    if (!line) {
      continue
    }

    const blockMatch = line.match(/^class\s+(\S+)\s*\{$/)
    if (blockMatch) {
      const id = blockMatch[1]
      const attributes: string[] = []
      const methods: string[] = []
      index += 1

      while (index < lines.length && lines[index].trim() !== '}') {
        const member = lines[index].trim()
        if (member.includes('(')) {
          methods.push(member)
        } else if (member) {
          attributes.push(member)
        }
        index += 1
      }

      ensureNode(nodes, id, id, {
        classAttributes: attributes.join('\n') || undefined,
        classMethods: methods.join('\n') || undefined
      })
      continue
    }

    const simpleClassMatch = line.match(/^class\s+(\S+)$/)
    if (simpleClassMatch) {
      ensureNode(nodes, simpleClassMatch[1], simpleClassMatch[1])
      continue
    }

    const relationshipMatch = line.match(/^(\S+)\s+-->\s+(\S+)(?:\s+:\s+(.+))?$/)
    if (relationshipMatch) {
      const [, sourceId, targetId, label] = relationshipMatch
      ensureNode(nodes, sourceId, sourceId)
      ensureNode(nodes, targetId, targetId)
      edges.push({ id: `${sourceId}-${targetId}-${edges.length + 1}`, source: sourceId, target: targetId, label: label?.trim() })
    }
  }

  return {
    diagramType: 'class',
    direction: 'LR',
    nodes: autoLayoutNodes(Array.from(nodes.values()), edges, 'LR', 'class'),
    edges
  }
}
