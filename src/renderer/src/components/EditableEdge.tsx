import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps
} from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { FlowchartEdgeStyle, SequenceMessageType, VisualEdgeData } from '../lib/mermaid'

export type EditableEdgeData = VisualEdgeData & {
  onLabelChange?: (id: string, label: string) => void
}

type EditableEdgeProps = EdgeProps<Edge<EditableEdgeData>>

export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  selected,
  data
}: EditableEdgeProps): JSX.Element {
  const lineStyle = data?.lineStyle ?? 'arrow'
  const isSequenceEdge = data?.diagramType === 'sequence'
  const [edgePath, labelX, labelY] = isSequenceEdge
    ? getSequencePath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        order: data?.sequenceOrder ?? 0
      })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
      })
  const labelText = typeof label === 'string' ? label : ''
  const shouldShowLabelEditor = selected || labelText.length > 0

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={getEdgePathStyle(lineStyle, data?.visualStyle, data?.sequenceMessageType, isSequenceEdge)}
      />
      {shouldShowLabelEditor && (
        <EdgeLabelRenderer>
          <input
            className="edge-label-input nodrag nopan"
            value={labelText}
            onChange={(event) => data?.onLabelChange?.(id, event.target.value)}
            placeholder="Line label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
            }}
          />
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function getEdgePathStyle(
  lineStyle: FlowchartEdgeStyle,
  visualStyle: VisualEdgeData['visualStyle'] | undefined,
  sequenceMessageType: SequenceMessageType | undefined,
  isSequenceEdge: boolean
): CSSProperties {
  const baseStyle: CSSProperties = {
    ...(visualStyle?.strokeColor ? { stroke: visualStyle.strokeColor } : {}),
    ...(visualStyle?.strokeWidth ? { strokeWidth: visualStyle.strokeWidth } : {})
  }

  if (isSequenceEdge) {
    return sequenceMessageType === 'dashed' || sequenceMessageType === 'dashedAsync'
      ? { ...baseStyle, strokeDasharray: '8 6' }
      : baseStyle
  }

  switch (lineStyle) {
    case 'dottedArrow':
    case 'dottedLine':
      return { ...baseStyle, strokeDasharray: '6 6' }
    case 'thickArrow':
    case 'thickLine':
      return { ...baseStyle, strokeWidth: visualStyle?.strokeWidth ?? 4 }
    case 'arrow':
    case 'line':
      return baseStyle
  }
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
}): [string, number, number] {
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
