import { layoutSequenceNodes } from '../layout'
import { sequenceMessageTypeByArrow } from '../sequence-constants'
import { normalizeEscapedText } from '../text-utils'
import type {
  ParsedMermaidDiagram,
  SequenceMessageType,
  SequenceParticipantKind,
  SequenceParticipantType,
  VisualEdge,
  VisualNode
} from '../types'
import { ensureNode } from '../graph-model'

export function parseSequence(lines: string[]): ParsedMermaidDiagram {
  const nodes = new Map<string, VisualNode>()
  const edges: VisualEdge[] = []

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const participantDescriptor = parseSequenceParticipantDeclaration(line)
    if (participantDescriptor) {
      const { id, kind, label, type } = participantDescriptor
      ensureNode(nodes, id, label, {
        sequenceParticipantKind: kind,
        sequenceParticipantType: type
      })
      continue
    }

    const messageMatch = line.match(/^(\S+?)\s*(-->>|->>|-->|->)\s*([+-]*\S+)(?:\s*:\s*(.+))?$/)
    if (messageMatch) {
      const [, sourceReference, operator, targetReference, label] = messageMatch
      const sourceId = parseSequenceParticipantRef(sourceReference)
      const targetId = parseSequenceParticipantRef(targetReference)

      if (!sourceId || !targetId) {
        continue
      }

      ensureNode(nodes, sourceId)
      ensureNode(nodes, targetId)
      edges.push({
        id: `${sourceId}-${targetId}-${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: label?.trim() || undefined,
        data: {
          sequenceArrowOperator: operator,
          sequenceMessageType: parseSequenceArrow(operator),
          sequenceOrder: edges.length
        }
      })
    }
  }

  return {
    diagramType: 'sequence',
    direction: 'LR',
    nodes: layoutSequenceNodes(Array.from(nodes.values())),
    edges
  }
}

function parseSequenceArrow(operator: string): SequenceMessageType {
  return sequenceMessageTypeByArrow[operator] ?? 'async'
}

function parseSequenceParticipantDeclaration(
  line: string
): { id: string; label: string; kind: SequenceParticipantKind; type?: SequenceParticipantType } | undefined {
  const participantMatch = line.match(/^(participant|actor)\s+([^\s@]+)(?:@(\{.*\}))?(?:\s+as\s+(.+))?$/)

  if (!participantMatch) {
    return undefined
  }

  const [, rawKind, id, rawConfig, externalAlias] = participantMatch
  const kind = rawKind as SequenceParticipantKind
  const config = parseSequenceParticipantConfig(rawConfig)
  const label = normalizeEscapedText(externalAlias ?? config?.alias ?? id)

  return {
    id,
    label,
    kind,
    type: config?.type
  }
}

function parseSequenceParticipantConfig(
  rawConfig: string | undefined
): { alias?: string; type?: SequenceParticipantType } | undefined {
  if (!rawConfig) {
    return undefined
  }

  try {
    const parsed = JSON.parse(rawConfig) as { alias?: unknown; type?: unknown }
    const alias = typeof parsed.alias === 'string' ? parsed.alias : undefined
    const type = isSequenceParticipantType(parsed.type) ? parsed.type : undefined
    return alias || type ? { alias, type } : undefined
  } catch {
    return undefined
  }
}

function isSequenceParticipantType(value: unknown): value is SequenceParticipantType {
  return (
    value === 'boundary'
    || value === 'control'
    || value === 'entity'
    || value === 'database'
    || value === 'collections'
    || value === 'queue'
  )
}

function parseSequenceParticipantRef(reference: string): string {
  return reference.replace(/^[+-]+|[+-]+$/g, '')
}
