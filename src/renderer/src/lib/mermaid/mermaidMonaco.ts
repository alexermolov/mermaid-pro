/** Monaco editor registration for Mermaid-ish diagrams (keywords from supported diagram types). */

import type { Monaco } from '@monaco-editor/react'

const MERMAID_LANG_ID = 'mermaid'

const keywords = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'participant',
  'actor',
  'activate',
  'deactivate',
  'autonumber',
  'classDiagram',
  'erDiagram',
  'mindmap',
  'timeline',
  'stateDiagram',
  'stateDiagram-v2',
  'state',
  'as',
  'direction',
  'note',
  'classDef',
  'class',
  'end',
  'left',
  'right',
  'of',
  'title',
  'section',
  'TB',
  'TD',
  'LR',
  'RL',
  'BT'
]

export function registerMermaidMonacoLanguage(monaco: Monaco): void {
  const existing = monaco.languages.getLanguages().some((language) => language.id === MERMAID_LANG_ID)
  if (existing) {
    return
  }

  monaco.languages.register({
    id: MERMAID_LANG_ID,
    extensions: ['.mmd', '.mermaid', '.mpro'],
    aliases: ['Mermaid', 'mermaid']
  })

  monaco.languages.setMonarchTokensProvider(MERMAID_LANG_ID, {
    defaultToken: '',
    ignoreCase: false,
    keywords,

    tokenizer: {
      root: [
        [/%%.*$/, 'comment'],
        [/\[(\*)\]/, 'constant.language'],
        [/<<[^>\s]+>>/, 'annotation'],
        [/-->/, 'keyword.operator'],
        [/--/, 'keyword.operator'],
        [/"(?:[^"\\]|\\.)*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/[{}[\],:|]/, 'delimiter'],
        [/[a-zA-Z_#][\w-]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/\d+/, 'number']
      ]
    }
  })
}

export const MERMAID_EDITOR_LANGUAGE = MERMAID_LANG_ID
