import { Position, type NodeProps } from '@xyflow/react'
import { Handle } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { VisualNode } from '../lib/mermaid'

const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 260
const TITLE_BAR_HEIGHT = 32

export function SubgraphBoundary(props: NodeProps<VisualNode>): JSX.Element {
  const { id, data, selected } = props

  const title = data.subgraphTitle || id
  const borderWidth = 1.5
  const strokeColor = 'var(--accent)'
  const fillColor = 'rgba(15, 23, 42, 0.35)'
  const width = DEFAULT_WIDTH
  const height = DEFAULT_HEIGHT

  const svgStyle: CSSProperties = {
    width,
    height
  }

  return (
    <div
      className="subgraph-boundary"
      style={{
        width,
        height,
        position: 'relative',
        pointerEvents: 'none'
      }}
    >
      <svg
        className="subgraph-boundary__shape"
        style={svgStyle}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background rectangle with title bar */}
        <rect
          x="1"
          y="1"
          width={width - 2}
          height={height - 2}
          rx="12"
          ry="12"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={borderWidth}
          strokeDasharray={selected ? 'none' : '0'}
          opacity="0.9"
        />
        {/* Title bar background */}
        <rect
          x="1"
          y="1"
          width={width - 2}
          height={TITLE_BAR_HEIGHT}
          rx="12"
          ry="12"
          fill={strokeColor}
          opacity="0.12"
        />
        {/* Title bar bottom line */}
        <line
          x1="1"
          y1={TITLE_BAR_HEIGHT}
          x2={width - 1}
          y2={TITLE_BAR_HEIGHT}
          stroke={strokeColor}
          strokeWidth={borderWidth}
          opacity="0.35"
        />
        {/* Title text */}
        <text
          x={16}
          y={TITLE_BAR_HEIGHT / 2 + 5}
          fill={strokeColor}
          fontSize="12"
          fontWeight="600"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
          opacity="0.85"
        >
          {title}
        </text>
      </svg>

      {/* Target handle — edges can enter/exit from the subgraph boundary */}
      <Handle
        id="target"
        type="target"
        position={Position.Top}
        isConnectable
        className="subgraph-boundary__handle"
        style={{
          width: 12,
          height: 12,
          border: `2px solid ${strokeColor}`,
          background: 'var(--canvas-bg, #172033)'
        }}
      />
      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        isConnectable
        className="subgraph-boundary__handle"
        style={{
          width: 12,
          height: 12,
          border: `2px solid ${strokeColor}`,
          background: 'var(--canvas-bg, #172033)'
        }}
      />
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        isConnectable
        className="subgraph-boundary__handle"
        style={{
          width: 12,
          height: 12,
          border: `2px solid ${strokeColor}`,
          background: 'var(--canvas-bg, #172033)'
        }}
      />
      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        isConnectable
        className="subgraph-boundary__handle"
        style={{
          width: 12,
          height: 12,
          border: `2px solid ${strokeColor}`,
          background: 'var(--canvas-bg, #172033)'
        }}
      />

      {/* Source handle */}
      <Handle
        id="source"
        type="source"
        position={Position.Bottom}
        isConnectable
        className="subgraph-boundary__handle"
        style={{
          width: 12,
          height: 12,
          border: `2px solid ${strokeColor}`,
          background: 'var(--canvas-bg, #172033)'
        }}
      />
    </div>
  )
}
