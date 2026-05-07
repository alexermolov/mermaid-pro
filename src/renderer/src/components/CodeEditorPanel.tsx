import Editor from '@monaco-editor/react'
import { Search } from 'lucide-react'
import { useState } from 'react'
import type { DiagramEditorMode } from '../lib/diagramTypeRegistry'
import { MERMAID_EDITOR_LANGUAGE, registerMermaidMonacoLanguage } from '../lib/mermaid/mermaidMonaco'
import { LightboxModal } from './LightboxModal'

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
  const [codeLightboxOpen, setCodeLightboxOpen] = useState(false)
  const statusLabel = editorMode === 'form' ? 'Linked to timeline form' : autoSync ? 'Auto-synced' : 'Manual mode'

  return (
    <>
      <div className="code-panel">
        <div className="panel-heading">
          <div className="panel-heading__title">
            <h2>Mermaid code</h2>
            <span>{statusLabel}</span>
          </div>
          <div className="panel-heading__actions">
            <button
              type="button"
              className="panel-heading__icon-action"
              aria-label="Open enlarged code editor"
              onClick={() => setCodeLightboxOpen(true)}
            >
              <Search size={18} strokeWidth={2} aria-hidden />
            </button>
            {!autoSync && editorMode === 'visual' && (
              <button type="button" className="panel-heading__action" onClick={onSyncFromCode}>
                Sync
              </button>
            )}
          </div>
        </div>
        <Editor
          height="100%"
          defaultLanguage={MERMAID_EDITOR_LANGUAGE}
          theme={isDarkTheme ? 'vs-dark' : 'vs'}
          beforeMount={registerMermaidMonacoLanguage}
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
      <LightboxModal
        title="Mermaid code — enlarged"
        open={codeLightboxOpen}
        onClose={() => setCodeLightboxOpen(false)}
        bodyClassName="lightbox-modal__body--code"
      >
        <Editor
          height="100%"
          defaultLanguage={MERMAID_EDITOR_LANGUAGE}
          theme={isDarkTheme ? 'vs-dark' : 'vs'}
          beforeMount={registerMermaidMonacoLanguage}
          value={code}
          options={{
            minimap: { enabled: true },
            fontSize: 17,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 }
          }}
          onChange={(value) => onCodeChange(value ?? '')}
        />
      </LightboxModal>
    </>
  )
}
