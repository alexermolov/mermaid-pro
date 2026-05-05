import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps
} from '@xyflow/react'
import { resolveEdgePresentation } from '../lib/edgePresentationRegistry'
import type { VisualEdgeData } from '../lib/mermaid'

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
  const labelText = typeof label === 'string' ? label : ''
  const shouldShowLabelEditor = selected || labelText.length > 0
  const presentation = resolveEdgePresentation(
    data?.diagramType,
    data,
    {
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      sequenceOrder: data?.sequenceOrder
    }
  )
  const [edgePath, labelX, labelY] = presentation.path

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={presentation.pathStyle}
      />
      {shouldShowLabelEditor && (
        <EdgeLabelRenderer>
          <input
            className="edge-label-input nodrag nopan"
            value={labelText}
            onChange={(event) => data?.onLabelChange?.(id, event.target.value)}
            placeholder={presentation.labelPlaceholder}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
            }}
          />
        </EdgeLabelRenderer>
      )}
    </>
  )
}
