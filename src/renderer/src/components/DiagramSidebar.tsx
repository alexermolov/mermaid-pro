import { useEffect, useRef, useState } from 'react'
import type { DiagramDirection, DiagramType } from '../../../shared/diagram'
import { diagramTypes, directions } from '../lib/appHelpers'
import { getDiagramTypeDefinition } from '../lib/diagramTypeRegistry'

type DiagramSidebarProps = {
  diagrams: Array<{ id: string; title: string; diagramType: DiagramType }>
  selectedDiagramId: string
  title: string
  diagramType: DiagramType
  direction: DiagramDirection
  autoSync: boolean
  isCollapsed: boolean
  onAddDiagram: () => void
  onSelectDiagram: (diagramId: string) => void
  onTitleChange: (title: string) => void
  onDiagramTypeChange: (diagramType: DiagramType) => void
  onDirectionChange: (direction: DiagramDirection) => void
  onSyncFromVisual: () => void
  onToggleCollapsed: () => void
}

export function DiagramSidebar({
  diagrams,
  selectedDiagramId,
  title,
  diagramType,
  direction,
  autoSync,
  isCollapsed,
  onAddDiagram,
  onSelectDiagram,
  onTitleChange,
  onDiagramTypeChange,
  onDirectionChange,
  onSyncFromVisual,
  onToggleCollapsed
}: DiagramSidebarProps): JSX.Element {
  const [isDiagramListOpen, setIsDiagramListOpen] = useState(true)
  const [isDiagramSettingsOpen, setIsDiagramSettingsOpen] = useState(true)
  const activeDiagramRef = useRef<HTMLButtonElement | null>(null)
  const diagramTypeDefinition = getDiagramTypeDefinition(diagramType)

  useEffect(() => {
    if (!isCollapsed && isDiagramListOpen) {
      activeDiagramRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [diagrams.length, isCollapsed, isDiagramListOpen, selectedDiagramId])

  return (
    <aside className={`left-panel${isCollapsed ? ' left-panel--collapsed' : ''}`} aria-label="Diagram settings">
      <button
        className="sidebar-toggle"
        type="button"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expand left panel' : 'Collapse left panel'}
        title={isCollapsed ? 'Expand left panel' : 'Collapse left panel'}
        onClick={onToggleCollapsed}
      >
        <span className="sidebar-toggle__icon" aria-hidden="true">
          {isCollapsed ? '>' : '<'}
        </span>
      </button>

      {!isCollapsed && (
        <div className="sidebar-accordion">
          <section className={`accordion-section${isDiagramListOpen ? ' accordion-section--open' : ''}`}>
            <div className="accordion-header">
              <button
                type="button"
                className="accordion-trigger"
                aria-expanded={isDiagramListOpen}
                onClick={() => setIsDiagramListOpen((current) => !current)}
              >
                <span>Diagrams</span>
                <small>{diagrams.length}</small>
                <span className="accordion-chevron" aria-hidden="true">
                  {isDiagramListOpen ? 'v' : '>'}
                </span>
              </button>
            </div>

            {isDiagramListOpen && (
              <div className="accordion-body">
                <div className="diagram-list-actions">
                  <button type="button" className="compact-action" onClick={onAddDiagram}>
                    New
                  </button>
                </div>
                <div className="diagram-list" role="listbox" aria-label="Project diagrams">
                  {diagrams.map((diagram) => (
                    <button
                      key={diagram.id}
                      ref={diagram.id === selectedDiagramId ? activeDiagramRef : undefined}
                      type="button"
                      className={`diagram-list-item${diagram.id === selectedDiagramId ? ' diagram-list-item--active' : ''}`}
                      role="option"
                      aria-selected={diagram.id === selectedDiagramId}
                      onClick={() => onSelectDiagram(diagram.id)}
                    >
                      <span>{diagram.title || 'Untitled diagram'}</span>
                      <small>{diagram.diagramType}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={`accordion-section${isDiagramSettingsOpen ? ' accordion-section--open' : ''}`}>
            <div className="accordion-header">
              <button
                type="button"
                className="accordion-trigger"
                aria-expanded={isDiagramSettingsOpen}
                onClick={() => setIsDiagramSettingsOpen((current) => !current)}
              >
                <span>Settings</span>
                <small>{diagramType}</small>
                <span className="accordion-chevron" aria-hidden="true">
                  {isDiagramSettingsOpen ? 'v' : '>'}
                </span>
              </button>
            </div>

            {isDiagramSettingsOpen && (
              <div className="accordion-body settings-accordion-body">
                <div className="panel-section">
                  <label>
                    Diagram title
                    <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
                  </label>
                  <div className="control-group">
                    <span className="control-label">Diagram type</span>
                    <div className="mode-button-group" role="radiogroup" aria-label="Diagram type">
                      {diagramTypes.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`mode-button${diagramType === item.value ? ' mode-button--active' : ''}`}
                          role="radio"
                          aria-checked={diagramType === item.value}
                          onClick={() => onDiagramTypeChange(item.value)}
                        >
                          <span className="mode-button__icon">{getDiagramTypeDefinition(item.value).renderIcon()}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="control-group">
                    <span className="control-label">Flow direction</span>
                    <div className="mode-button-group mode-button-group--compact" role="radiogroup" aria-label="Flow direction">
                      {directions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`mode-button${direction === item ? ' mode-button--active' : ''}`}
                          role="radio"
                          aria-checked={direction === item}
                          disabled={!diagramTypeDefinition.supportsDirection}
                          onClick={() => onDirectionChange(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  {diagramTypeDefinition.editorMode === 'form' ? (
                    <p className="warning">Timeline uses the structured form editor in the center panel and mirrors changes to Mermaid code.</p>
                  ) : (
                    <>
                      {!autoSync && <p className="warning">Manual mode: use Sync in the code panel to update the canvas.</p>}
                      <button
                        type="button"
                        onClick={onSyncFromVisual}
                      >
                        Regenerate code from canvas
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  )
}
