import type { MermaidGraph, MermaidGraphInput, ParsedMermaidDiagram } from '../types'
import { graphToMermaidText } from '../serialize'
import { parseClass } from './classDiagram'
import { parseEr } from './erDiagram'
import { parseFlowchart } from './flowchart'
import { stripLeadingMermaidFrontmatter } from './frontmatter'
import { parseMindmap } from './mindmap'
import { parseSequence } from './sequence'
import { parseState } from './stateDiagram'
import { parseTimeline } from './timeline'

const mermaidParsers: Array<{
  matches: (header: string) => boolean
  parse: (lines: string[]) => ParsedMermaidDiagram
}> = [
  {
    matches: (header) => /^(flowchart|graph)\s+(TB|TD|LR|BT|RL)$/.test(header),
    parse: parseFlowchart
  },
  {
    matches: (header) => header === 'sequenceDiagram',
    parse: parseSequence
  },
  {
    matches: (header) => header === 'classDiagram',
    parse: parseClass
  },
  {
    matches: (header) => header === 'stateDiagram-v2' || header === 'stateDiagram',
    parse: parseState
  },
  {
    matches: (header) => header === 'erDiagram',
    parse: parseEr
  },
  {
    matches: (header) => header === 'mindmap',
    parse: parseMindmap
  },
  {
    matches: (header) => /^timeline(?:\s+(LR|TD))?$/.test(header),
    parse: parseTimeline
  }
]

export function parseMermaid(code: string): ParsedMermaidDiagram {
  const lines = stripLeadingMermaidFrontmatter(
    code
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => {
        const trimmedLine = line.trim()
        return trimmedLine.length > 0 && !trimmedLine.startsWith('%%')
      })
  )

  const header = lines[0]?.trim() ?? ''

  const matchingParser = mermaidParsers.find((parser) => parser.matches(header))
  if (matchingParser) {
    return matchingParser.parse(lines)
  }

  throw new Error('Unsupported Mermaid diagram type')
}

export function mermaidTextToGraph(code: string): MermaidGraph {
  return parseMermaid(code)
}

export function normalizeMermaidInput(input: string | MermaidGraphInput): { graph: MermaidGraph; code: string } {
  if (typeof input === 'string') {
    return {
      graph: mermaidTextToGraph(input),
      code: input
    }
  }

  const graph: MermaidGraph = {
    diagramType: 'diagramType' in input ? input.diagramType : input.type,
    direction: input.direction,
    nodes: input.nodes,
    edges: input.edges
  }

  return {
    graph,
    code: graphToMermaidText(graph)
  }
}
