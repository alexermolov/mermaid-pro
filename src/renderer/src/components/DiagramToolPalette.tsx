import { Copy, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { DiagramType } from '../../../shared/diagram'
import {
  flowchartEdgeStyles,
  flowchartNodeShapes,
  getAddNodeLabel,
  getEdgePlaceholder,
  sequenceMessageTypes
} from '../lib/appHelpers'
import type {
  ErCardinality,
  ErRelationshipLineStyle,
  FlowchartEdgeStyle,
  FlowchartEdgeVisualStyle,
  FlowchartNodeShape,
  FlowchartNodeStyle,
  SequenceMessageType,
  VisualEdge,
  VisualNode
} from '../lib/mermaid'

type DiagramToolPaletteProps = {
  diagramType: DiagramType
  selectedNode: VisualNode | null
  selectedEdge: VisualEdge | null
  selectedNodeCount: number
  selectedEdgeCount: number
  sequenceParticipants: Array<{ id: string; label: string }>
  sequenceMessageSourceId: string
  sequenceMessageTargetId: string
  onAddNode: () => void
  onAddSequenceMessage: () => void
  onSequenceMessageDraftChange: (draft: Partial<{ sourceId: string; targetId: string }>) => void
  onDuplicateSelected: () => void
  onSelectedNodeShapeChange: (shape: FlowchartNodeShape) => void
  onSelectedNodeStyleChange: (style: Partial<FlowchartNodeStyle>) => void
  onSelectedEdgeLabelChange: (label: string) => void
  onSelectedEdgeStyleChange: (lineStyle: FlowchartEdgeStyle) => void
  onSelectedSequenceMessageTypeChange: (messageType: SequenceMessageType) => void
  onSelectedEdgeVisualStyleChange: (visualStyle: Partial<FlowchartEdgeVisualStyle>) => void
  onSelectedEdgeErRelationshipChange: (
    relationship: Partial<{
      erSourceCardinality: ErCardinality
      erTargetCardinality: ErCardinality
      erRelationshipLineStyle: ErRelationshipLineStyle
    }>
  ) => void
  onDeleteSelected: () => void
}

export function DiagramToolPalette({
  diagramType,
  selectedNode,
  selectedEdge,
  selectedNodeCount,
  selectedEdgeCount,
  sequenceParticipants,
  sequenceMessageSourceId,
  sequenceMessageTargetId,
  onAddNode,
  onAddSequenceMessage,
  onSequenceMessageDraftChange,
  onDuplicateSelected,
  onSelectedNodeShapeChange,
  onSelectedNodeStyleChange,
  onSelectedEdgeLabelChange,
  onSelectedEdgeStyleChange,
  onSelectedSequenceMessageTypeChange,
  onSelectedEdgeVisualStyleChange,
  onSelectedEdgeErRelationshipChange,
  onDeleteSelected
}: DiagramToolPaletteProps): JSX.Element {
  const hasSelection = selectedNodeCount > 0 || selectedEdgeCount > 0
  const hasSingleNodeSelection = selectedNodeCount === 1 && selectedEdgeCount === 0 && Boolean(selectedNode)
  const hasSingleEdgeSelection = selectedEdgeCount === 1 && selectedNodeCount === 0 && Boolean(selectedEdge)
  const canEditFlowchartNode = diagramType === 'flowchart' && hasSingleNodeSelection
  const canEditEdgeLabel = hasSingleEdgeSelection
  const canEditFlowchartEdge = diagramType === 'flowchart' && hasSingleEdgeSelection
  const canEditSequenceEdge = diagramType === 'sequence' && hasSingleEdgeSelection
  const canEditErEdge = diagramType === 'er' && hasSingleEdgeSelection
  const canDuplicateNodes = selectedNodeCount > 0
  const canAddSequenceMessage = diagramType === 'sequence' && Boolean(sequenceMessageSourceId) && Boolean(sequenceMessageTargetId)
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
        {diagramType === 'sequence' && (
          <button
            onClick={onAddSequenceMessage}
            disabled={!canAddSequenceMessage}
            title="Add a new message using the selected From and To participants"
          >
            <Plus size={16} />
            Add message
          </button>
        )}
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

      {diagramType === 'sequence' && (
        <div className="palette-section">
          <label>
            From
            <select
              value={sequenceMessageSourceId}
              title="Source participant for the new sequence message"
              onChange={(event) => onSequenceMessageDraftChange({ sourceId: event.target.value })}
            >
              {sequenceParticipants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            To
            <select
              value={sequenceMessageTargetId}
              title="Target participant for the new sequence message"
              onChange={(event) => onSequenceMessageDraftChange({ targetId: event.target.value })}
            >
              {sequenceParticipants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

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
          {canEditSequenceEdge && (
            <label>
              Message type
              <select
                value={selectedEdge.data?.sequenceMessageType ?? 'async'}
                title="Change selected sequence message type"
                onChange={(event) => onSelectedSequenceMessageTypeChange(event.target.value as SequenceMessageType)}
              >
                {sequenceMessageTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
          {canEditErEdge && (
            <>
              <div className="palette-grid palette-grid--edge">
                <label>
                  From
                  <select
                    value={selectedEdge.data?.erSourceCardinality ?? 'one'}
                    title="Source cardinality"
                    onChange={(event) =>
                      onSelectedEdgeErRelationshipChange({
                        erSourceCardinality: event.target.value as ErCardinality
                      })
                    }
                  >
                    {erCardinalityOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  To
                  <select
                    value={selectedEdge.data?.erTargetCardinality ?? 'zeroOrMore'}
                    title="Target cardinality"
                    onChange={(event) =>
                      onSelectedEdgeErRelationshipChange({
                        erTargetCardinality: event.target.value as ErCardinality
                      })
                    }
                  >
                    {erCardinalityOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Relationship
                <select
                  value={selectedEdge.data?.erRelationshipLineStyle ?? 'identifying'}
                  title="Relationship line style"
                  onChange={(event) =>
                    onSelectedEdgeErRelationshipChange({
                      erRelationshipLineStyle: event.target.value as ErRelationshipLineStyle
                    })
                  }
                >
                  {erRelationshipLineStyleOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {!canEditFlowchartEdge && !canEditErEdge && (
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

const erCardinalityOptions: Array<{ value: ErCardinality; label: string }> = [
  { value: 'one', label: 'Exactly one' },
  { value: 'zeroOrOne', label: 'Zero or one' },
  { value: 'oneOrMore', label: 'One or more' },
  { value: 'zeroOrMore', label: 'Zero or more' }
]

const erRelationshipLineStyleOptions: Array<{ value: ErRelationshipLineStyle; label: string }> = [
  { value: 'identifying', label: 'Identifying' },
  { value: 'nonIdentifying', label: 'Non-identifying' }
]

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
