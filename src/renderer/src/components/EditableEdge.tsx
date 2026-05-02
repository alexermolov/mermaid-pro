import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps
} from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { FlowchartEdgeStyle, VisualEdgeData } from '../lib/mermaid'

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
  const [edgePath, labelX, labelY] = getBezierPath({
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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={getEdgePathStyle(lineStyle, data?.visualStyle)} />
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
  visualStyle: VisualEdgeData['visualStyle'] | undefined
): CSSProperties {
  const baseStyle: CSSProperties = {
    ...(visualStyle?.strokeColor ? { stroke: visualStyle.strokeColor } : {}),
    ...(visualStyle?.strokeWidth ? { strokeWidth: visualStyle.strokeWidth } : {})
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
