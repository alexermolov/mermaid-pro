import { useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { DiagramDirection } from '../../../shared/diagram'
import type { VisualNode } from '../lib/mermaid'

function getHandlePositions(direction: DiagramDirection = 'TD'): { source: Position; target: Position } {
  switch (direction) {
    case 'TD':
      return { source: Position.Bottom, target: Position.Top }
    case 'BT':
      return { source: Position.Top, target: Position.Bottom }
    case 'RL':
      return { source: Position.Left, target: Position.Right }
    case 'LR':
      return { source: Position.Right, target: Position.Left }
  }
}

function getNodeHandlePositions(diagramType: VisualNode['data']['diagramType'], direction: DiagramDirection = 'TD'): {
  source: Position
  target: Position
} {
  if (diagramType === 'sequence') {
    return {
      source: Position.Bottom,
      target: Position.Bottom
    }
  }

  return getHandlePositions(direction)
}

export function EditableNode({ id, data, selected, isConnectable }: NodeProps<VisualNode>): JSX.Element {
  const updateNodeInternals = useUpdateNodeInternals()
  const handlePositions = getNodeHandlePositions(data.diagramType, data.direction)
  const shapeClasses = getNodeShapeClasses(data)
  const nodeStyle = getNodeStyle(data.style)

  useEffect(() => {
    updateNodeInternals(id)
  }, [data.diagramType, data.direction, id, updateNodeInternals])

  return (
    <div
      className={`editable-node ${shapeClasses.join(' ')} ${selected ? 'editable-node--selected' : ''}`}
      style={nodeStyle}
    >
      <Handle
        className="editable-node__handle"
        type="target"
        position={handlePositions.target}
        isConnectable={isConnectable}
      />
      <div className="editable-node__content nodrag nopan">
        <input
          value={data.label}
          onChange={(event) => data.onLabelChange?.(id, event.target.value)}
          placeholder={getLabelPlaceholder(data.diagramType)}
        />
        {renderModeFields(id, data)}
      </div>
      {data.diagramType === 'sequence' && data.sequenceLifelineHeight ? (
        <div className="editable-node__sequence-lifeline" style={{ height: `${data.sequenceLifelineHeight}px` }} />
      ) : null}
      <Handle
        className="editable-node__handle"
        type="source"
        position={handlePositions.source}
        isConnectable={isConnectable}
      />
    </div>
  )
}

function getNodeShapeClasses(data: VisualNode['data']): string[] {
  if (data.diagramType === 'flowchart') {
    return [`editable-node--${data.shape ?? 'rectangle'}`]
  }

  if (data.diagramType === 'sequence') {
    const sequenceKind = data.sequenceParticipantType ?? (data.sequenceParticipantKind === 'actor' ? 'actor' : 'participant')
    return ['editable-node--sequence', `editable-node--sequence-${sequenceKind}`]
  }

  return [`editable-node--${data.diagramType ?? 'flowchart'}`]
}

function renderModeFields(id: string, data: VisualNode['data']): JSX.Element | null {
  switch (data.diagramType) {
    case 'class':
      return (
        <>
          <textarea
            value={data.classAttributes ?? ''}
            onChange={(event) => data.onDataChange?.(id, { classAttributes: event.target.value })}
            placeholder="+String name"
            rows={3}
          />
          <textarea
            value={data.classMethods ?? ''}
            onChange={(event) => data.onDataChange?.(id, { classMethods: event.target.value })}
            placeholder="+method()"
            rows={3}
          />
        </>
      )
    case 'state':
      return (
        <textarea
          value={data.stateDescription ?? ''}
          onChange={(event) => data.onDataChange?.(id, { stateDescription: event.target.value })}
          placeholder="entry action"
          rows={3}
        />
      )
    case 'er':
      return (
        <textarea
          value={data.erAttributes ?? ''}
          onChange={(event) => data.onDataChange?.(id, { erAttributes: event.target.value })}
          placeholder="string name"
          rows={4}
        />
      )
    case 'sequence':
    case 'mindmap':
    case 'flowchart':
    default:
      return null
  }
}

function getLabelPlaceholder(diagramType: VisualNode['data']['diagramType']): string {
  switch (diagramType) {
    case 'sequence':
      return 'Participant name'
    case 'class':
      return 'Class name'
    case 'state':
      return 'State name'
    case 'er':
      return 'Entity name'
    case 'mindmap':
      return 'Topic'
    case 'flowchart':
    default:
      return 'Node label'
  }
}

function getNodeStyle(style: VisualNode['data']['style']): CSSProperties {
  return {
    ...(style?.fillColor ? { background: style.fillColor } : {}),
    ...(style?.strokeColor ? { borderColor: style.strokeColor } : {}),
    ...(style?.textColor ? { color: style.textColor } : {}),
    ...(style?.borderWidth ? { borderWidth: style.borderWidth } : {})
  }
}
