import type { ReactNode } from 'react'
import { Copy, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { DiagramType } from '../../../shared/diagram'
import {
  flowchartEdgeStyles,
  flowchartNodeShapes,
  getAddNodeLabel,
  getEdgePlaceholder,
  sequenceParticipantPresentations,
  sequenceMessageTypes
} from '../lib/appHelpers'
import { getFlowchartShapeDefinition, type FlowchartShapeAppearance } from '../lib/flowchartShapeRegistry'
import { getSequencePresentationDefinition } from '../lib/nodePresentationRegistry'
import type {
  ErCardinality,
  ErRelationshipLineStyle,
  FlowchartEdgeStyle,
  FlowchartEdgeVisualStyle,
  FlowchartNodeShape,
  FlowchartNodeStyle,
  SequenceMessageType,
  SequenceParticipantPresentation,
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
  onSelectedSequenceParticipantPresentationChange: (presentation: SequenceParticipantPresentation) => void
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

type SelectOption = {
  value: string
  label: string
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
  onSelectedSequenceParticipantPresentationChange,
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
  const canEditSequenceNode = diagramType === 'sequence' && hasSingleNodeSelection
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
          <PaletteSelect
            label="From"
            value={sequenceMessageSourceId}
            title="Source participant for the new sequence message"
            options={sequenceParticipants.map((participant) => ({ value: participant.id, label: participant.label }))}
            onChange={(value) => onSequenceMessageDraftChange({ sourceId: value })}
          />
          <PaletteSelect
            label="To"
            value={sequenceMessageTargetId}
            title="Target participant for the new sequence message"
            options={sequenceParticipants.map((participant) => ({ value: participant.id, label: participant.label }))}
            onChange={(value) => onSequenceMessageDraftChange({ targetId: value })}
          />
        </div>
      )}

      {canEditFlowchartNode && selectedNode && (
        <div className="palette-section">
          <PaletteShapePicker
            label="Shape"
            value={selectedNode.data.shape ?? 'rectangle'}
            options={flowchartNodeShapes}
            appearance={{
              fill: nodeStyle?.fillColor ?? '#1e293b',
              stroke: nodeStyle?.strokeColor ?? '#60a5fa',
              strokeWidth: Math.min(4, Math.max(1.5, nodeStyle?.borderWidth ?? 1.8))
            }}
            onChange={(value) => onSelectedNodeShapeChange(value as FlowchartNodeShape)}
          />
          <div className="palette-grid">
            <PaletteColorInput
              label="Fill"
              value={nodeStyle?.fillColor ?? '#1e293b'}
              title="Node fill color"
              onChange={(value) => onSelectedNodeStyleChange({ fillColor: value })}
            />
            <PaletteColorInput
              label="Border"
              value={nodeStyle?.strokeColor ?? '#60a5fa'}
              title="Node border color"
              onChange={(value) => onSelectedNodeStyleChange({ strokeColor: value })}
            />
            <PaletteColorInput
              label="Text"
              value={nodeStyle?.textColor ?? '#f8fafc'}
              title="Node text color"
              onChange={(value) => onSelectedNodeStyleChange({ textColor: value })}
            />
            <PaletteNumberInput
              label="Width"
              value={nodeStyle?.borderWidth ?? 1}
              title="Node border width"
              min={1}
              max={12}
              onChange={(value) => onSelectedNodeStyleChange({ borderWidth: value })}
            />
          </div>
        </div>
      )}

      {canEditSequenceNode && selectedNode && (
        <div className="palette-section">
          <PaletteShapePicker
            label="Participant type"
            value={selectedNode.data.sequenceParticipantType ?? selectedNode.data.sequenceParticipantKind ?? 'participant'}
            options={sequenceParticipantPresentations}
            appearance={{
              fill: nodeStyle?.fillColor ?? 'var(--editable-node-bg)',
              stroke: nodeStyle?.strokeColor ?? 'var(--editable-node-border)',
              strokeWidth: Math.min(4, Math.max(1.5, nodeStyle?.borderWidth ?? 1.8))
            }}
            onChange={(value) =>
              onSelectedSequenceParticipantPresentationChange(value as SequenceParticipantPresentation)
            }
            renderPreview={(value, appearance) =>
              getSequencePresentationDefinition(value as SequenceParticipantPresentation).renderShape(appearance)
            }
          />
        </div>
      )}

      {canEditEdgeLabel && selectedEdge && (
        <div className="palette-section">
          <PaletteTextInput
            label="Edge label"
            value={String(selectedEdge.label ?? '')}
            title="Edit selected edge label"
            placeholder={getEdgePlaceholder(diagramType)}
            onChange={onSelectedEdgeLabelChange}
          />
          {canEditSequenceEdge && (
            <PaletteSelect
              label="Message type"
              value={selectedEdge.data?.sequenceMessageType ?? 'async'}
              title="Change selected sequence message type"
              options={sequenceMessageTypes}
              onChange={(value) => onSelectedSequenceMessageTypeChange(value as SequenceMessageType)}
            />
          )}
          {canEditFlowchartEdge && (
            <>
              <PaletteLineStylePicker
                label="Line style"
                value={selectedEdge.data?.lineStyle ?? 'arrow'}
                options={flowchartEdgeStyles}
                appearance={{
                  stroke: edgeVisualStyle?.strokeColor ?? '#60a5fa',
                  strokeWidth: Math.min(4, Math.max(2, edgeVisualStyle?.strokeWidth ?? 3))
                }}
                onChange={(value) => onSelectedEdgeStyleChange(value as FlowchartEdgeStyle)}
              />
              <div className="palette-grid palette-grid--edge">
                <PaletteColorInput
                  label="Color"
                  value={edgeVisualStyle?.strokeColor ?? '#60a5fa'}
                  title="Edge line color"
                  onChange={(value) => onSelectedEdgeVisualStyleChange({ strokeColor: value })}
                />
                <PaletteNumberInput
                  label="Width"
                  value={edgeVisualStyle?.strokeWidth ?? 3}
                  title="Edge line width"
                  min={1}
                  max={12}
                  onChange={(value) => onSelectedEdgeVisualStyleChange({ strokeWidth: value })}
                />
              </div>
            </>
          )}
          {canEditErEdge && (
            <>
              <div className="palette-grid palette-grid--edge">
                <PaletteSelect
                  label="From"
                  value={selectedEdge.data?.erSourceCardinality ?? 'one'}
                  title="Source cardinality"
                  options={erCardinalityOptions}
                  onChange={(value) =>
                    onSelectedEdgeErRelationshipChange({ erSourceCardinality: value as ErCardinality })
                  }
                />
                <PaletteSelect
                  label="To"
                  value={selectedEdge.data?.erTargetCardinality ?? 'zeroOrMore'}
                  title="Target cardinality"
                  options={erCardinalityOptions}
                  onChange={(value) =>
                    onSelectedEdgeErRelationshipChange({ erTargetCardinality: value as ErCardinality })
                  }
                />
              </div>
              <PaletteSelect
                label="Relationship"
                value={selectedEdge.data?.erRelationshipLineStyle ?? 'identifying'}
                title="Relationship line style"
                options={erRelationshipLineStyleOptions}
                onChange={(value) =>
                  onSelectedEdgeErRelationshipChange({ erRelationshipLineStyle: value as ErRelationshipLineStyle })
                }
              />
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

const erCardinalityOptions: SelectOption[] = [
  { value: 'one', label: 'Exactly one' },
  { value: 'zeroOrOne', label: 'Zero or one' },
  { value: 'oneOrMore', label: 'One or more' },
  { value: 'zeroOrMore', label: 'Zero or more' }
]

const erRelationshipLineStyleOptions: SelectOption[] = [
  { value: 'identifying', label: 'Identifying' },
  { value: 'nonIdentifying', label: 'Non-identifying' }
]

function PaletteField({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="palette-field">
      <span className="palette-field-label">{label}</span>
      {children}
    </label>
  )
}

function PaletteShapePicker({
  label,
  value,
  options,
  appearance,
  onChange,
  renderPreview
}: {
  label: string
  value: string
  options: SelectOption[]
  appearance: { fill: string; stroke: string; strokeWidth: number }
  onChange: (value: string) => void
  renderPreview?: (value: string, appearance: FlowchartShapeAppearance) => JSX.Element
}): JSX.Element {
  return (
    <div className="palette-field">
      <span className="palette-field-label">{label}</span>
      <div className="shape-palette" role="listbox" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.value === value
          const previewShape = renderPreview
            ? renderPreview(option.value, appearance)
            : getFlowchartShapeDefinition(option.value as FlowchartNodeShape).render(appearance)

          return (
            <button
              key={option.value}
              type="button"
              className={`shape-palette__item${isSelected ? ' shape-palette__item--active' : ''}`}
              role="option"
              aria-selected={isSelected}
              title={option.label}
              onClick={() => onChange(option.value)}
            >
              <span className="shape-palette__preview" aria-hidden="true">
                <svg viewBox="0 0 100 100" focusable="false">
                  {previewShape}
                </svg>
              </span>
              <span className="shape-palette__label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PaletteLineStylePicker({
  label,
  value,
  options,
  appearance,
  onChange
}: {
  label: string
  value: string
  options: SelectOption[]
  appearance: { stroke: string; strokeWidth: number }
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="palette-field">
      <span className="palette-field-label">{label}</span>
      <div className="shape-palette shape-palette--line" role="listbox" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              className={`shape-palette__item${isSelected ? ' shape-palette__item--active' : ''}`}
              role="option"
              aria-selected={isSelected}
              title={option.label}
              onClick={() => onChange(option.value)}
            >
              <span className="shape-palette__preview shape-palette__preview--line" aria-hidden="true">
                <svg viewBox="0 0 100 40" focusable="false">
                  {renderLineStylePreview(option.value as FlowchartEdgeStyle, appearance)}
                </svg>
              </span>
              <span className="shape-palette__label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function renderLineStylePreview(
  lineStyle: FlowchartEdgeStyle,
  appearance: { stroke: string; strokeWidth: number }
): JSX.Element {
  const strokeDasharray =
    lineStyle === 'dottedArrow' || lineStyle === 'dottedLine' ? '6 5' : undefined
  const strokeWidth =
    lineStyle === 'thickArrow' || lineStyle === 'thickLine' ? Math.max(appearance.strokeWidth + 1.5, 4) : appearance.strokeWidth
  const startX = 18
  const endX = 82
  const centerY = 20
  const lineProps = {
    stroke: appearance.stroke,
    strokeWidth,
    strokeDasharray,
    strokeLinecap: 'round' as const
  }

  return (
    <>
      <line x1={startX} y1={centerY} x2={endX} y2={centerY} {...lineProps} />
      {hasStartMarker(lineStyle) ? renderLineMarker(lineStyle, 'start', appearance.stroke, strokeWidth) : null}
      {hasEndMarker(lineStyle) ? renderLineMarker(lineStyle, 'end', appearance.stroke, strokeWidth) : null}
    </>
  )
}

function hasStartMarker(lineStyle: FlowchartEdgeStyle): boolean {
  return (
    lineStyle === 'bidirectionalArrow' ||
    lineStyle === 'bidirectionalCircle' ||
    lineStyle === 'bidirectionalCross'
  )
}

function hasEndMarker(lineStyle: FlowchartEdgeStyle): boolean {
  return lineStyle !== 'line' && lineStyle !== 'dottedLine' && lineStyle !== 'thickLine'
}

function renderLineMarker(
  lineStyle: FlowchartEdgeStyle,
  side: 'start' | 'end',
  stroke: string,
  strokeWidth: number
): JSX.Element | null {
  const direction = side === 'start' ? -1 : 1
  const x = side === 'start' ? 18 : 82
  const tipX = x + direction * 8
  const innerX = x + direction * 2

  switch (lineStyle) {
    case 'arrow':
    case 'dottedArrow':
    case 'thickArrow':
    case 'bidirectionalArrow':
      return (
        <polygon
          points={`${x},20 ${tipX},15 ${innerX},20 ${tipX},25`}
          fill={stroke}
          stroke={stroke}
          strokeWidth={Math.max(1, strokeWidth / 2)}
          strokeLinejoin="round"
        />
      )
    case 'circleEdge':
    case 'bidirectionalCircle':
      return <circle cx={x} cy="20" r="4.5" fill="none" stroke={stroke} strokeWidth={Math.max(1.5, strokeWidth)} />
    case 'crossEdge':
    case 'bidirectionalCross':
      return (
        <>
          <line x1={x - 4} y1={16} x2={x + 4} y2={24} stroke={stroke} strokeWidth={Math.max(1.5, strokeWidth)} strokeLinecap="round" />
          <line x1={x + 4} y1={16} x2={x - 4} y2={24} stroke={stroke} strokeWidth={Math.max(1.5, strokeWidth)} strokeLinecap="round" />
        </>
      )
    case 'line':
    case 'dottedLine':
    case 'thickLine':
      return null
  }
}

function PaletteSelect({
  label,
  value,
  title,
  options,
  onChange
}: {
  label: string
  value: string
  title: string
  options: SelectOption[]
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <PaletteField label={label}>
      <select value={value} title={title} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </PaletteField>
  )
}

function PaletteTextInput({
  label,
  value,
  title,
  placeholder,
  onChange
}: {
  label: string
  value: string
  title: string
  placeholder?: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <PaletteField label={label}>
      <input value={value} title={title} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </PaletteField>
  )
}

function PaletteColorInput({
  label,
  value,
  title,
  onChange
}: {
  label: string
  value: string
  title: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <PaletteField label={label}>
      <input type="color" value={value} title={title} onChange={(event) => onChange(event.target.value)} />
    </PaletteField>
  )
}

function PaletteNumberInput({
  label,
  value,
  title,
  min,
  max,
  onChange
}: {
  label: string
  value: number
  title: string
  min: number
  max: number
  onChange: (value: number) => void
}): JSX.Element {
  return (
    <PaletteField label={label}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        title={title}
        onChange={(event) => onChange(toBoundedNumber(event.target.value, value, min, max))}
      />
    </PaletteField>
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
