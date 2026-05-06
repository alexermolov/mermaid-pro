import type { ParsedMermaidDiagram } from '../types'

export function parseTimeline(lines: string[]): ParsedMermaidDiagram {
  const header = lines[0]?.trim() ?? 'timeline'
  const direction = /\bTD$/.test(header) ? 'TD' : 'LR'

  return {
    diagramType: 'timeline',
    direction,
    nodes: [],
    edges: []
  }
}
