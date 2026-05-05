import { useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { DiagramDirection } from '../../../shared/diagram'
import type { FlowchartNodeStyle, VisualNode } from '../lib/mermaid'
import { type FlowchartShapeAppearance } from '../lib/flowchartShapeRegistry'
import { resolveNodePresentation } from '../lib/nodePresentationRegistry'

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
  const presentation = resolveNodePresentation(data)
  const nodeStyle = getNodeStyle(data.style, presentation.usesSvgShape, presentation.layout)

  useEffect(() => {
    updateNodeInternals(id)
  }, [data.diagramType, data.direction, data.shape, id, updateNodeInternals])

  return (
    <div
      className={`editable-node ${presentation.classNames.join(' ')} ${selected && !presentation.usesSvgShape ? 'editable-node--selected' : ''}`}
      style={nodeStyle}
    >
      {presentation.renderShape ? (
        <FlowchartNodeShapeLayer renderShape={presentation.renderShape} style={data.style} selected={selected} />
      ) : null}
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

function FlowchartNodeShapeLayer({
  renderShape,
  style,
  selected
}: {
  renderShape: (appearance: FlowchartShapeAppearance) => JSX.Element
  style?: FlowchartNodeStyle
  selected: boolean
}): JSX.Element {
  const appearance = getFlowchartShapeAppearance(style, selected)

  return (
    <svg
      className="editable-node__shape"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 16px 35px ${appearance.shadowColor})` }}
    >
      {renderShape(appearance)}
    </svg>
  )
}

function getFlowchartShapeAppearance(
  style: FlowchartNodeStyle | undefined,
  selected: boolean
): FlowchartShapeAppearance & { shadowColor: string } {
  return {
    fill: style?.fillColor ?? 'var(--editable-node-bg)',
    stroke: selected ? '#7c3aed' : style?.strokeColor ?? 'var(--editable-node-border)',
    strokeWidth: Math.max(style?.borderWidth ?? 1.5, selected ? 2 : 1.5),
    shadowColor: selected ? 'rgba(124, 58, 237, 0.2)' : 'var(--editable-node-shadow)'
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

function getNodeStyle(
  style: VisualNode['data']['style'],
  isFlowchartShape = false,
  flowchartLayout?: CSSProperties
): CSSProperties {
  return {
    ...(flowchartLayout ?? {}),
    ...(!isFlowchartShape && style?.fillColor ? { background: style.fillColor } : {}),
    ...(!isFlowchartShape && style?.strokeColor ? { borderColor: style.strokeColor } : {}),
    ...(style?.textColor ? { color: style.textColor } : {}),
    ...(!isFlowchartShape && style?.borderWidth ? { borderWidth: style.borderWidth } : {})
  }
}
