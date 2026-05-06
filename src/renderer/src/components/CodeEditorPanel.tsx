import Editor from '@monaco-editor/react'
import type { DiagramEditorMode } from '../lib/diagramTypeRegistry'

type CodeEditorPanelProps = {
  code: string
  autoSync: boolean
  editorMode: DiagramEditorMode
  isDarkTheme: boolean
  onCodeChange: (code: string) => void
  onSyncFromCode: () => void
}

export function CodeEditorPanel({
  code,
  autoSync,
  editorMode,
  isDarkTheme,
  onCodeChange,
  onSyncFromCode
}: CodeEditorPanelProps): JSX.Element {
  const statusLabel = editorMode === 'form' ? 'Linked to timeline form' : autoSync ? 'Auto-synced' : 'Manual mode'

  return (
    <div className="code-panel">
      <div className="panel-heading">
        <div className="panel-heading__title">
          <h2>Mermaid code</h2>
          <span>{statusLabel}</span>
        </div>
        {!autoSync && editorMode === 'visual' && (
          <button type="button" className="panel-heading__action" onClick={onSyncFromCode}>
            Sync
          </button>
        )}
      </div>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        theme={isDarkTheme ? 'vs-dark' : 'vs'}
        value={code}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true
        }}
        onChange={(value) => onCodeChange(value ?? '')}
      />
    </div>
  )
}
