import { contextBridge, ipcRenderer } from 'electron'
import type { LastProjectResult, OpenDiagramResult, SaveDiagramPayload, SaveExportPayload } from '../shared/diagram'

const api = {
  loadLastProject: (): Promise<LastProjectResult> => ipcRenderer.invoke('diagram:load-last-project'),
  openDiagram: (): Promise<OpenDiagramResult> => ipcRenderer.invoke('diagram:open'),
  saveDiagram: (payload: SaveDiagramPayload): Promise<string | undefined> =>
    ipcRenderer.invoke('diagram:save', payload),
  saveExport: (payload: SaveExportPayload): Promise<string | undefined> =>
    ipcRenderer.invoke('diagram:export', payload)
}

contextBridge.exposeInMainWorld('mermaidPro', api)

export type MermaidProApi = typeof api
