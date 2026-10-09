import { useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, NodeResizer, Position, useUpdateNodeInternals } from '@xyflow/react'
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

const defaultResizeMinWidth = 144
const defaultResizeMinHeight = 58

export function EditableNode({
  id,
  data,
  selected,
  isConnectable,
  width,
  height
}: NodeProps<VisualNode>): JSX.Element {
  const updateNodeInternals = useUpdateNodeInternals()
  const handlePositions = getNodeHandlePositions(data.diagramType, data.direction)
  const presentation = resolveNodePresentation(data)
  const nodeStyle = getNodeStyle(data.style, Boolean(presentation.renderShape), presentation.layout, width, height)
  const isFlowchartSubgraphNode = data.diagramType === 'flowchart' && Boolean(data.flowchartSubgraphId)
  const subgraphBadgeText = data.flowchartSubgraphTitle || data.flowchartSubgraphId
  const isResizable = !data.statePseudo
  const resizeMinWidth =
    getLayoutNumber(presentation.layout?.minWidth) ??
    getLayoutNumber(presentation.layout?.width) ??
    defaultResizeMinWidth
  const resizeMinHeight =
    getLayoutNumber(presentation.layout?.minHeight) ??
    getLayoutNumber(presentation.layout?.height) ??
    defaultResizeMinHeight

  useEffect(() => {
    updateNodeInternals(id)
  }, [
    data.classAttributes,
    data.classMethods,
    data.diagramType,
    data.direction,
    data.erAttributes,
    data.label,
    data.shape,
    data.stateDescription,
    data.stateNote,
    data.stateNotePosition,
    data.statePseudo,
    id,
    updateNodeInternals
  ])

  return (
    <div
      className={`editable-node ${presentation.classNames.join(' ')} ${selected ? 'editable-node--selected' : ''} ${
        isFlowchartSubgraphNode ? 'editable-node--flowchart-subgraph' : ''
      }`}
      style={nodeStyle}
    >
      <NodeResizer
        nodeId={id}
        isVisible={Boolean(selected) && isResizable}
        color="#7c3aed"
        minWidth={resizeMinWidth}
        minHeight={resizeMinHeight}
      />
      {isFlowchartSubgraphNode ? (
        <div className="editable-node__subgraph-badge" title={`Subgraph: ${subgraphBadgeText}`}>
          {`Block: ${subgraphBadgeText}`}
        </div>
      ) : null}
      {presentation.renderShape ? (
        <FlowchartNodeShapeLayer renderShape={presentation.renderShape} style={data.style} selected={selected} />
      ) : null}
      <Handle
        className="editable-node__handle"
        type="target"
        position={handlePositions.target}
        isConnectable={isConnectable}
      />
      <div className="editable-node__content">
        <input
          className="nodrag nopan"
          value={data.label}
          readOnly={Boolean(data.statePseudo)}
          aria-readonly={data.statePseudo ? true : undefined}
          onChange={(event) => {
            if (data.statePseudo) {
              return
            }

            data.onLabelChange?.(id, event.target.value)
          }}
          placeholder={presentation.labelPlaceholder}
        />
        {presentation.renderFields?.(id, data) ?? null}
      </div>
      {data.diagramType === 'state' && !data.statePseudo && data.stateNote?.trim() ? (
        <div
          className={`editable-node__state-note editable-node__state-note--${data.stateNotePosition === 'left' ? 'left' : 'right'}`}
          title="State note from Mermaid"
        >
          {data.stateNote}
        </div>
      ) : null}
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
    fill: style?.fillColor ?? 'var(--editable-node-svg-fill)',
    stroke: selected ? '#7c3aed' : style?.strokeColor ?? 'var(--editable-node-border)',
    strokeWidth: Math.max(style?.borderWidth ?? 1.5, selected ? 2 : 1.5),
    shadowColor: selected ? 'rgba(124, 58, 237, 0.2)' : 'var(--editable-node-shadow)'
  }
}

function getNodeStyle(
  style: VisualNode['data']['style'],
  isFlowchartShape = false,
  flowchartLayout?: CSSProperties,
  userWidth?: number | null,
  userHeight?: number | null
): CSSProperties {
  const { width: layoutWidth, height: layoutHeight, ...layoutRest } = flowchartLayout ?? {}
  // When the user resized the node, React Flow sizes the wrapper from node.width/height;
  // the inner element should fill it instead of forcing the registry default size.
  const sizeStyle: CSSProperties = {
    ...(userWidth != null ? { width: '100%' } : layoutWidth !== undefined ? { width: layoutWidth } : {}),
    ...(userHeight != null ? { height: '100%' } : layoutHeight !== undefined ? { height: layoutHeight } : {})
  }

  return {
    ...layoutRest,
    ...sizeStyle,
    ...(!isFlowchartShape && style?.fillColor ? { background: style.fillColor } : {}),
    ...(!isFlowchartShape && style?.strokeColor ? { borderColor: style.strokeColor } : {}),
    ...(style?.textColor ? { color: style.textColor } : {}),
    ...(!isFlowchartShape && style?.borderWidth ? { borderWidth: style.borderWidth } : {})
  }
}

function getLayoutNumber(value: CSSProperties['width'] | CSSProperties['height']): number | undefined {
  return typeof value === 'number' ? value : undefined
}
