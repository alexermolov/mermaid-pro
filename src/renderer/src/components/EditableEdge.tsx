import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps
} from '@xyflow/react'
import { useState, useCallback, useEffect } from 'react'
import { resolveEdgeMarkers, resolveEdgePresentation, type ResolvedEdgeMarker } from '../lib/edgePresentationRegistry'
import type { VisualEdgeData } from '../lib/mermaid'

export type EditableEdgeData = VisualEdgeData & {
  onLabelChange?: (id: string, label: string) => void
  onSequenceOrderChange?: (id: string, deltaY: number) => void
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
  label,
  selected,
  data
}: EditableEdgeProps): JSX.Element {
  const labelText = typeof label === 'string' ? label : ''
  const shouldShowLabelEditor = selected || labelText.length > 0
  const strokeColor = data?.visualStyle?.strokeColor ?? 'var(--edge-color)'
  const markers = resolveEdgeMarkers(data?.diagramType, data)
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
  const markerIds = createEdgeMarkerIds(id)
  const isSequence = data?.diagramType === 'sequence'
  const showSequenceHandle = isSequence && selected
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [currentDeltaY, setCurrentDeltaY] = useState(0)
  
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    setIsDragging(true)
    setDragStartY(event.clientY)
    setCurrentDeltaY(0)
  }, [])
  
  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (event: MouseEvent): void => {
      event.stopPropagation()
      event.preventDefault()
      const deltaY = event.clientY - dragStartY
      setCurrentDeltaY(deltaY)
    }
    
    const handleMouseUp = (event: MouseEvent): void => {
      event.stopPropagation()
      event.preventDefault()
      setIsDragging(false)
      const finalDeltaY = event.clientY - dragStartY
      if (Math.abs(finalDeltaY) > 10) {
        data?.onSequenceOrderChange?.(id, finalDeltaY)
      }
      setCurrentDeltaY(0)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStartY, data, id])

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          {renderEdgeMarkerDef(markerIds.startArrow, 'arrow', strokeColor)}
          {renderEdgeMarkerDef(markerIds.startArrowClosed, 'arrowClosed', strokeColor)}
          {renderEdgeMarkerDef(markerIds.startCircle, 'circle', strokeColor)}
          {renderEdgeMarkerDef(markerIds.startCross, 'cross', strokeColor)}
          {renderEdgeMarkerDef(markerIds.endArrow, 'arrow', strokeColor)}
          {renderEdgeMarkerDef(markerIds.endArrowClosed, 'arrowClosed', strokeColor)}
          {renderEdgeMarkerDef(markerIds.endCircle, 'circle', strokeColor)}
          {renderEdgeMarkerDef(markerIds.endCross, 'cross', strokeColor)}
        </defs>
      </svg>
      <BaseEdge
        path={edgePath}
        markerStart={toMarkerUrl(markers.start, markerIds, 'start')}
        markerEnd={toMarkerUrl(markers.end, markerIds, 'end')}
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
      {showSequenceHandle && (
        <EdgeLabelRenderer>
          <div
            className="sequence-order-handle nodrag nopan"
            onMouseDown={handleMouseDown}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX - 80}px, ${labelY + (isDragging ? currentDeltaY * 0.15 : 0)}px)`,
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: isDragging ? 0.8 : 1
            }}
            title="Drag to reorder message"
          >
            ⋮
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

function createEdgeMarkerIds(edgeId: string): Record<'startArrow' | 'startArrowClosed' | 'startCircle' | 'startCross' | 'endArrow' | 'endArrowClosed' | 'endCircle' | 'endCross', string> {
  const baseId = edgeId.replace(/[^A-Za-z0-9_-]/g, '_')

  return {
    startArrow: `${baseId}-marker-start-arrow`,
    startArrowClosed: `${baseId}-marker-start-arrowclosed`,
    startCircle: `${baseId}-marker-start-circle`,
    startCross: `${baseId}-marker-start-cross`,
    endArrow: `${baseId}-marker-end-arrow`,
    endArrowClosed: `${baseId}-marker-end-arrowclosed`,
    endCircle: `${baseId}-marker-end-circle`,
    endCross: `${baseId}-marker-end-cross`
  }
}

function toMarkerUrl(
  marker: ResolvedEdgeMarker | undefined,
  markerIds: ReturnType<typeof createEdgeMarkerIds>,
  side: 'start' | 'end'
): string | undefined {
  if (!marker) {
    return undefined
  }

  const markerIdMap = {
    start: {
      arrow: markerIds.startArrow,
      arrowClosed: markerIds.startArrowClosed,
      circle: markerIds.startCircle,
      cross: markerIds.startCross
    },
    end: {
      arrow: markerIds.endArrow,
      arrowClosed: markerIds.endArrowClosed,
      circle: markerIds.endCircle,
      cross: markerIds.endCross
    }
  } as const

  return `url(#${markerIdMap[side][marker]})`
}

function renderEdgeMarkerDef(id: string, marker: ResolvedEdgeMarker, color: string): JSX.Element {
  switch (marker) {
    case 'arrow':
      return (
        <marker id={id} viewBox="0 0 10 10" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth">
          <polyline points="1,1 9,5 1,9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      )
    case 'arrowClosed':
      return (
        <marker id={id} viewBox="0 0 10 10" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} stroke={color} />
        </marker>
      )
    case 'circle':
      return (
        <marker id={id} viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto-start-reverse" markerUnits="strokeWidth">
          <circle cx="6" cy="6" r="4" fill="white" stroke={color} strokeWidth="1.5" />
        </marker>
      )
    case 'cross':
      return (
        <marker id={id} viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M 2 2 L 10 10 M 10 2 L 2 10" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
        </marker>
      )
  }
}
