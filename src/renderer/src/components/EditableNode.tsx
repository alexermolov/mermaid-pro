import { useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { DiagramDirection } from '../../../shared/diagram'
import type { VisualNode } from '../lib/mermaid'

function getHandlePositions(direction: DiagramDirection = 'LR'): { source: Position; target: Position } {
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

export function EditableNode({ id, data, selected, isConnectable }: NodeProps<VisualNode>): JSX.Element {
  const updateNodeInternals = useUpdateNodeInternals()
  const handlePositions = getHandlePositions(data.direction)
  const shape = data.shape ?? 'rectangle'
  const nodeStyle = getNodeStyle(data.style)

  useEffect(() => {
    updateNodeInternals(id)
  }, [data.direction, id, updateNodeInternals])

  return (
    <div
      className={`editable-node editable-node--${shape} ${selected ? 'editable-node--selected' : ''}`}
      style={nodeStyle}
    >
      <Handle
        className="editable-node__handle"
        type="target"
        position={handlePositions.target}
        isConnectable={isConnectable}
      />
      <input
        className="nodrag nopan"
        value={data.label}
        onChange={(event) => data.onLabelChange?.(id, event.target.value)}
        placeholder="Node label"
      />
      <Handle
        className="editable-node__handle"
        type="source"
        position={handlePositions.source}
        isConnectable={isConnectable}
      />
    </div>
  )
}

function getNodeStyle(style: VisualNode['data']['style']): CSSProperties {
  return {
    ...(style?.fillColor ? { background: style.fillColor } : {}),
    ...(style?.strokeColor ? { borderColor: style.strokeColor } : {}),
    ...(style?.textColor ? { color: style.textColor } : {})
  }
}
