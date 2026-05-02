import Editor from '@monaco-editor/react'

type CodeEditorPanelProps = {
  code: string
  autoSync: boolean
  isDarkTheme: boolean
  onCodeChange: (code: string) => void
}

export function CodeEditorPanel({ code, autoSync, isDarkTheme, onCodeChange }: CodeEditorPanelProps): JSX.Element {
  return (
    <div className="code-panel">
      <div className="panel-heading">
        <h2>Mermaid code</h2>
        <span>{autoSync ? 'Auto-synced' : 'Manual mode'}</span>
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
