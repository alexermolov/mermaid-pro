import { getBezierPath, type Position } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { DiagramType } from '../../../shared/diagram'
import type { FlowchartEdgeStyle, SequenceMessageType, VisualEdgeData } from './mermaid'

export type ResolvedEdgeMarker = 'arrow' | 'arrowClosed' | 'circle' | 'cross'

type EdgePathResult = [string, number, number]

type EdgePathContext = {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  sequenceOrder?: number
}

type EdgePresentationResolver = {
  getLabelPlaceholder: () => string
  getMarkers: (data: VisualEdgeData | undefined) => { start?: ResolvedEdgeMarker; end?: ResolvedEdgeMarker }
  getPath: (context: EdgePathContext) => EdgePathResult
  getPathStyle: (data: VisualEdgeData | undefined) => CSSProperties
}

const defaultDiagramType: DiagramType = 'flowchart'

const flowLikeEdgeResolver = createFlowLikeResolver('Select an edge to add a label')

const edgePresentationRegistry: Record<DiagramType, EdgePresentationResolver> = {
  flowchart: flowLikeEdgeResolver,
  class: createFlowLikeResolver('Select an edge to add a relationship label'),
  state: createFlowLikeResolver('Select an edge to add a transition label'),
  er: createFlowLikeResolver('Select an edge to add a relationship name'),
  mindmap: createFlowLikeResolver('Select an edge to add a branch label'),
  timeline: createFlowLikeResolver('Timeline is edited directly in Mermaid code'),
  sequence: {
    getLabelPlaceholder: () => 'Select an edge to add a message',
    getMarkers: (data) => ({
      end: data?.sequenceMessageType === 'sync' || data?.sequenceMessageType === 'dashed' ? 'arrow' : 'arrowClosed'
    }),
    getPath: ({ sourceX, sourceY, targetX, targetY, sequenceOrder }) =>
      getSequencePath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        order: sequenceOrder ?? 0
      }),
    getPathStyle: (data) => {
      const baseStyle = getBasePathStyle(data?.visualStyle)

      return data?.sequenceMessageType === 'dashed' || data?.sequenceMessageType === 'dashedAsync'
        ? { ...baseStyle, strokeDasharray: '8 6' }
        : baseStyle
    }
  }
}

export function getEdgeLabelPlaceholder(diagramType: DiagramType): string {
  return edgePresentationRegistry[diagramType].getLabelPlaceholder()
}

export function resolveEdgeMarkers(
  diagramType: DiagramType | undefined,
  data: VisualEdgeData | undefined
): { start?: ResolvedEdgeMarker; end?: ResolvedEdgeMarker } {
  return edgePresentationRegistry[diagramType ?? defaultDiagramType].getMarkers(data)
}

export function resolveEdgePresentation(
  diagramType: DiagramType | undefined,
  data: VisualEdgeData | undefined,
  pathContext: EdgePathContext
): {
  path: EdgePathResult
  pathStyle: CSSProperties
  labelPlaceholder: string
} {
  const resolver = edgePresentationRegistry[diagramType ?? defaultDiagramType]

  return {
    path: resolver.getPath(pathContext),
    pathStyle: resolver.getPathStyle(data),
    labelPlaceholder: resolver.getLabelPlaceholder()
  }
}

function createFlowLikeResolver(labelPlaceholder: string): EdgePresentationResolver {
  return {
    getLabelPlaceholder: () => labelPlaceholder,
    getMarkers: (data) => {
      const lineStyle = data?.lineStyle ?? 'arrow'

      switch (lineStyle) {
        case 'arrow':
        case 'dottedArrow':
        case 'thickArrow':
          return { end: 'arrowClosed' }
        case 'circleEdge':
          return { end: 'circle' }
        case 'crossEdge':
          return { end: 'cross' }
        case 'bidirectionalArrow':
          return { start: 'arrowClosed', end: 'arrowClosed' }
        case 'bidirectionalCircle':
          return { start: 'circle', end: 'circle' }
        case 'bidirectionalCross':
          return { start: 'cross', end: 'cross' }
        case 'line':
        case 'dottedLine':
        case 'thickLine':
          return {}
      }
    },
    getPath: ({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }) =>
      getBezierPathTuple({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
      }),
    getPathStyle: (data) => {
      const baseStyle = getBasePathStyle(data?.visualStyle)
      const lineStyle = data?.lineStyle ?? 'arrow'

      switch (lineStyle) {
        case 'dottedArrow':
        case 'dottedLine':
          return { ...baseStyle, strokeDasharray: '6 6' }
        case 'thickArrow':
        case 'thickLine':
          return { ...baseStyle, strokeWidth: data?.visualStyle?.strokeWidth ?? 4 }
        case 'circleEdge':
        case 'crossEdge':
        case 'bidirectionalArrow':
        case 'bidirectionalCircle':
        case 'bidirectionalCross':
        case 'arrow':
        case 'line':
          return baseStyle
      }
    }
  }
}

function getBasePathStyle(visualStyle: VisualEdgeData['visualStyle'] | undefined): CSSProperties {
  return {
    ...(visualStyle?.strokeColor ? { stroke: visualStyle.strokeColor } : {}),
    ...(visualStyle?.strokeWidth ? { strokeWidth: visualStyle.strokeWidth } : {})
  }
}

function getBezierPathTuple(context: Omit<EdgePathContext, 'sequenceOrder'>): EdgePathResult {
  const [path, labelX, labelY] = getBezierPath(context)

  return [path, labelX, labelY]
}

function getSequencePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  order
}: {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  order: number
}): EdgePathResult {
  const rowY = Math.max(sourceY, targetY) + 36 + order * 56

  if (Math.abs(sourceX - targetX) < 4) {
    const loopWidth = 52
    const loopHeight = 28
    const path = [
      `M ${sourceX} ${rowY}`,
      `L ${sourceX + loopWidth} ${rowY}`,
      `L ${sourceX + loopWidth} ${rowY + loopHeight}`,
      `L ${targetX} ${rowY + loopHeight}`
    ].join(' ')

    return [path, sourceX + loopWidth / 2, rowY + loopHeight / 2]
  }

  return [`M ${sourceX} ${rowY} L ${targetX} ${rowY}`, (sourceX + targetX) / 2, rowY]
}