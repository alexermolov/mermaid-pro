import type { ErCardinality, VisualEdgeData } from './types'

export const erCardinalityMarkers: Record<'source' | 'target', Record<ErCardinality, string>> = {
  source: {
    one: '||',
    zeroOrOne: 'o|',
    oneOrMore: '}|',
    zeroOrMore: '}o'
  },
  target: {
    one: '||',
    zeroOrOne: '|o',
    oneOrMore: '|{',
    zeroOrMore: 'o{'
  }
}

export function formatErCardinality(cardinality: ErCardinality, side: 'source' | 'target'): string {
  return erCardinalityMarkers[side][cardinality]
}

export function parseErCardinality(marker: string, side: 'source' | 'target'): ErCardinality {
  if (side === 'source') {
    switch (marker) {
      case '||':
        return 'one'
      case 'o|':
        return 'zeroOrOne'
      case '}|':
        return 'oneOrMore'
      case '}o':
        return 'zeroOrMore'
      default:
        return 'one'
    }
  }

  switch (marker) {
    case '||':
      return 'one'
    case '|o':
      return 'zeroOrOne'
    case '|{':
      return 'oneOrMore'
    case 'o{':
      return 'zeroOrMore'
    default:
      return 'zeroOrMore'
  }
}

export function parseErRelationshipData(relationship: string): VisualEdgeData {
  const sourceMarker = relationship.slice(0, 2)
  const lineToken = relationship.includes('..') ? '..' : '--'
  const targetMarker = relationship.slice(-2)

  return {
    erSourceCardinality: parseErCardinality(sourceMarker, 'source'),
    erTargetCardinality: parseErCardinality(targetMarker, 'target'),
    erRelationshipLineStyle: lineToken === '..' ? 'nonIdentifying' : 'identifying'
  }
}
