import { Copy, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { DiagramType } from '../../../shared/diagram'
import {
  flowchartEdgeStyles,
  flowchartNodeShapes,
  getAddNodeLabel,
  getEdgePlaceholder
} from '../lib/appHelpers'
import type {
  FlowchartEdgeStyle,
  FlowchartEdgeVisualStyle,
  FlowchartNodeShape,
  FlowchartNodeStyle,
  VisualEdge,
  VisualNode
} from '../lib/mermaid'

type DiagramToolPaletteProps = {
  diagramType: DiagramType
  selectedNode: VisualNode | null
  selectedEdge: VisualEdge | null
  selectedNodeCount: number
  selectedEdgeCount: number
  onAddNode: () => void
  onDuplicateSelected: () => void
  onSelectedNodeShapeChange: (shape: FlowchartNodeShape) => void
  onSelectedNodeStyleChange: (style: Partial<FlowchartNodeStyle>) => void
  onSelectedEdgeLabelChange: (label: string) => void
  onSelectedEdgeStyleChange: (lineStyle: FlowchartEdgeStyle) => void
  onSelectedEdgeVisualStyleChange: (visualStyle: Partial<FlowchartEdgeVisualStyle>) => void
  onDeleteSelected: () => void
}

export function DiagramToolPalette({
  diagramType,
  selectedNode,
  selectedEdge,
  selectedNodeCount,
  selectedEdgeCount,
  onAddNode,
  onDuplicateSelected,
  onSelectedNodeShapeChange,
  onSelectedNodeStyleChange,
  onSelectedEdgeLabelChange,
  onSelectedEdgeStyleChange,
  onSelectedEdgeVisualStyleChange,
  onDeleteSelected
}: DiagramToolPaletteProps): JSX.Element {
  const hasSelection = selectedNodeCount > 0 || selectedEdgeCount > 0
  const hasSingleNodeSelection = selectedNodeCount === 1 && selectedEdgeCount === 0 && Boolean(selectedNode)
  const hasSingleEdgeSelection = selectedEdgeCount === 1 && selectedNodeCount === 0 && Boolean(selectedEdge)
  const canEditFlowchartNode = diagramType === 'flowchart' && hasSingleNodeSelection
  const canEditEdgeLabel = hasSingleEdgeSelection
  const canEditFlowchartEdge = diagramType === 'flowchart' && hasSingleEdgeSelection
  const canDuplicateNodes = selectedNodeCount > 0
  const nodeStyle = selectedNode?.data.style
  const edgeVisualStyle = selectedEdge?.data?.visualStyle
  const selectionLabel = getSelectionLabel(selectedNodeCount, selectedEdgeCount)

  return (
    <aside className="diagram-tool-palette nodrag nopan" aria-label="Diagram tools">
      <div className="palette-header">
        <div className="palette-title">
          <SlidersHorizontal size={16} />
          <span>{selectionLabel.title}</span>
        </div>
        <span>{selectionLabel.subtitle}</span>
      </div>

      <div className="palette-actions">
        <button className="primary-action" onClick={onAddNode} title="Add a new diagram element to the canvas">
          <Plus size={16} />
          {getAddNodeLabel(diagramType)}
        </button>
        <button onClick={onDuplicateSelected} disabled={!canDuplicateNodes} title="Duplicate selected nodes">
          <Copy size={16} />
          Duplicate
        </button>
        <button
          className="danger-action"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Delete selected nodes or edges"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      {canEditFlowchartNode && selectedNode && (
        <div className="palette-section">
          <label>
            Shape
            <select
              value={selectedNode.data.shape ?? 'rectangle'}
              title="Change selected node shape"
              onChange={(event) => onSelectedNodeShapeChange(event.target.value as FlowchartNodeShape)}
            >
              {flowchartNodeShapes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="palette-grid">
            <label>
              Fill
              <input
                type="color"
                value={nodeStyle?.fillColor ?? '#1e293b'}
                title="Node fill color"
                onChange={(event) => onSelectedNodeStyleChange({ fillColor: event.target.value })}
              />
            </label>
            <label>
              Border
              <input
                type="color"
                value={nodeStyle?.strokeColor ?? '#60a5fa'}
                title="Node border color"
                onChange={(event) => onSelectedNodeStyleChange({ strokeColor: event.target.value })}
              />
            </label>
            <label>
              Text
              <input
                type="color"
                value={nodeStyle?.textColor ?? '#f8fafc'}
                title="Node text color"
                onChange={(event) => onSelectedNodeStyleChange({ textColor: event.target.value })}
              />
            </label>
            <label>
              Width
              <input
                type="number"
                min={1}
                max={12}
                value={nodeStyle?.borderWidth ?? 1}
                title="Node border width"
                onChange={(event) =>
                  onSelectedNodeStyleChange({
                    borderWidth: toBoundedNumber(event.target.value, nodeStyle?.borderWidth ?? 1, 1, 12)
                  })
                }
              />
            </label>
          </div>
        </div>
      )}

      {canEditEdgeLabel && selectedEdge && (
        <div className="palette-section">
          <label>
            Edge label
            <input
              value={String(selectedEdge.label ?? '')}
              title="Edit selected edge label"
              onChange={(event) => onSelectedEdgeLabelChange(event.target.value)}
              placeholder={getEdgePlaceholder(diagramType)}
            />
          </label>
          {canEditFlowchartEdge && (
            <>
              <label>
                Line style
                <select
                  value={selectedEdge.data?.lineStyle ?? 'arrow'}
                  title="Change selected edge style"
                  onChange={(event) => onSelectedEdgeStyleChange(event.target.value as FlowchartEdgeStyle)}
                >
                  {flowchartEdgeStyles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="palette-grid palette-grid--edge">
                <label>
                  Color
                  <input
                    type="color"
                    value={edgeVisualStyle?.strokeColor ?? '#60a5fa'}
                    title="Edge line color"
                    onChange={(event) => onSelectedEdgeVisualStyleChange({ strokeColor: event.target.value })}
                  />
                </label>
                <label>
                  Width
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={edgeVisualStyle?.strokeWidth ?? 3}
                    title="Edge line width"
                    onChange={(event) =>
                      onSelectedEdgeVisualStyleChange({
                        strokeWidth: toBoundedNumber(event.target.value, edgeVisualStyle?.strokeWidth ?? 3, 1, 12)
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}
          {!canEditFlowchartEdge && (
            <p className="palette-hint">
              This diagram type uses the edge label as its main relationship control.
            </p>
          )}
        </div>
      )}

      {!canEditFlowchartNode && !canEditEdgeLabel && (
        <p className="palette-hint">
          Select one node or edge to reveal focused editing controls. Multi-select supports duplicate and delete.
        </p>
      )}
    </aside>
  )
}

function getSelectionLabel(
  selectedNodeCount: number,
  selectedEdgeCount: number
): { title: string; subtitle: string } {
  if (selectedNodeCount === 1 && selectedEdgeCount === 0) {
    return { title: 'Node tools', subtitle: 'Shape and style' }
  }

  if (selectedEdgeCount === 1 && selectedNodeCount === 0) {
    return { title: 'Edge tools', subtitle: 'Label and line' }
  }

  if (selectedNodeCount + selectedEdgeCount > 1) {
    return { title: 'Selection tools', subtitle: `${selectedNodeCount} nodes, ${selectedEdgeCount} edges` }
  }

  return { title: 'Canvas tools', subtitle: 'Create and select' }
}

function toBoundedNumber(value: string, fallback: number, min: number, max: number): number {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsedValue))
}
