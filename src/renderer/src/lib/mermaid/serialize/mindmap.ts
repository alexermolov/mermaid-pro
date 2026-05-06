import type { Edge } from '@xyflow/react'
import { escapeMindmapText } from '../text-utils'
import type { VisualEdge, VisualNode } from '../types'

export function toMindmap(nodes: VisualNode[], edges: VisualEdge[]): string {
  const rootNode = findMindmapRoot(nodes, edges)
  if (!rootNode) {
    return 'mindmap'
  }

  const lines = ['mindmap', `  root((${escapeMindmapText(rootNode.data.label || rootNode.id)}))`]
  const visited = new Set<string>([rootNode.id])

  appendMindmapChildren(rootNode.id, edges, nodes, visited, lines, 4)

  const detachedNodes = nodes.filter((node) => !visited.has(node.id))
  detachedNodes.forEach((node) => {
    visited.add(node.id)
    lines.push(`${' '.repeat(4)}${escapeMindmapText(node.data.label || node.id)}`)
    appendMindmapChildren(node.id, edges, nodes, visited, lines, 6)
  })

  return lines.join('\n')
}

function findMindmapRoot(nodes: VisualNode[], edges: Edge[]): VisualNode | undefined {
  const targetedNodeIds = new Set(edges.map((edge) => edge.target))
  return nodes.find((node) => !targetedNodeIds.has(node.id)) ?? nodes[0]
}

function appendMindmapChildren(
  parentId: string,
  edges: VisualEdge[],
  nodes: VisualNode[],
  visited: Set<string>,
  lines: string[],
  indent: number
): void {
  edges
    .filter((edge) => edge.source === parentId)
    .forEach((edge) => {
      if (visited.has(edge.target)) {
        return
      }

      const childNode = nodes.find((node) => node.id === edge.target)
      if (!childNode) {
        return
      }

      visited.add(childNode.id)
      const edgeLabel = edge.label ? `${escapeMindmapText(String(edge.label))}: ` : ''
      lines.push(`${' '.repeat(indent)}${edgeLabel}${escapeMindmapText(childNode.data.label || childNode.id)}`)
      appendMindmapChildren(childNode.id, edges, nodes, visited, lines, indent + 2)
    })
}
