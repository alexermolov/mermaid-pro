// Polyfill for window.mermaidPro — file dialog API that's Electron-only.
// In browser mode, falls back to native <input type="file"> + Blob download.
import type {
  LastProjectResult,
  OpenDiagramResult,
  SaveDiagramPayload,
  SaveExportPayload
} from '../../shared/diagram'

type MermaidProApi = {
  loadLastProject: () => Promise<LastProjectResult>
  openDiagram: () => Promise<OpenDiagramResult>
  saveDiagram: (payload: SaveDiagramPayload) => Promise<string | undefined>
  saveExport: (payload: SaveExportPayload) => Promise<string | undefined>
}

function promptOpenFile(): Promise<OpenDiagramResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mpro,.mmd,.json,.xml,.svg,.drawio,.txt'
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        resolve({ canceled: true })
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          canceled: false,
          content: reader.result as string,
          filePath: file.name
        })
      }
      reader.onerror = () => resolve({ canceled: true })
      reader.readAsText(file)
    })

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}

export const mermaidProApi: MermaidProApi = {
  loadLastProject: async (): Promise<LastProjectResult> => ({ canceled: true }),

  openDiagram: async (): Promise<OpenDiagramResult> => {
    const result = await promptOpenFile()
    return result
  },

  saveDiagram: async (payload: SaveDiagramPayload): Promise<string | undefined> => {
    const blob = new Blob([payload.content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = payload.defaultPath ?? 'diagram'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return `browser/${payload.defaultPath ?? 'diagram'}`
  },

  saveExport: async (payload: SaveExportPayload): Promise<string | undefined> => {
    const blob = new Blob([payload.data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = payload.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return `browser/${payload.fileName}`
  }
}

// Expose on window so App.tsx doesn't crash
if (typeof window !== 'undefined') {
  window.mermaidPro = mermaidProApi
}
