import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { extname, join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import type { SaveDiagramPayload, SaveExportPayload } from '../shared/diagram'

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)
const recentProjectFileName = 'recent-project.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getRecentProjectPath(): string {
  return join(app.getPath('userData'), recentProjectFileName)
}

async function readLastProjectPath(): Promise<string | undefined> {
  try {
    const content = await readFile(getRecentProjectPath(), 'utf8')
    const parsedContent: unknown = JSON.parse(content)

    return isRecord(parsedContent) && typeof parsedContent.lastProjectPath === 'string'
      ? parsedContent.lastProjectPath
      : undefined
  } catch {
    return undefined
  }
}

async function rememberLastProjectPath(filePath: string): Promise<void> {
  if (extname(filePath).toLowerCase() !== '.mpro') {
    return
  }

  try {
    await writeFile(getRecentProjectPath(), JSON.stringify({ lastProjectPath: filePath }, null, 2), 'utf8')
  } catch {
    // Saving/opening the project should still succeed if recent-project metadata cannot be updated.
  }
}

async function readProjectFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8')
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function decodeCompressedDrawioDiagram(value: string): string | undefined {
  try {
    const inflated = inflateRawSync(Buffer.from(decodeHtmlEntities(value).trim(), 'base64')).toString('utf8')
    return decodeURIComponent(inflated)
  } catch {
    return undefined
  }
}

function normalizeDrawioContent(content: string): string {
  if (!content.includes('<mxfile') || content.includes('<mxGraphModel')) {
    return content
  }

  const diagramMatch = content.match(/<diagram\b[^>]*>([\s\S]*?)<\/diagram>/i)
  if (!diagramMatch) {
    return content
  }

  return decodeCompressedDrawioDiagram(diagramMatch[1]) ?? content
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1160,
    minHeight: 760,
    title: 'Mermaid Pro',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.mermaidpro.desktop')

  ipcMain.handle('diagram:load-last-project', async () => {
    const filePath = await readLastProjectPath()

    if (!filePath) {
      return { canceled: true }
    }

    try {
      const content = await readProjectFile(filePath)

      return { canceled: false, filePath, content }
    } catch {
      return { canceled: true }
    }
  })

  ipcMain.handle('diagram:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open diagram',
      properties: ['openFile'],
      filters: [
        {
          name: 'Supported diagrams',
          extensions: ['mpro', 'mmd', 'mermaid', 'txt', 'drawio', 'xml', 'puml', 'plantuml', 'pu', 'iuml', 'wsd']
        },
        { name: 'Mermaid Pro projects', extensions: ['mpro'] },
        { name: 'Mermaid files', extensions: ['mmd', 'mermaid', 'txt'] },
        { name: 'PlantUML files', extensions: ['puml', 'plantuml', 'pu', 'iuml', 'wsd'] },
        { name: 'draw.io files', extensions: ['drawio', 'xml'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    const rawContent = await readFile(filePath, 'utf8')
    const isProject = extname(filePath).toLowerCase() === '.mpro'
    const content = isProject ? rawContent : normalizeDrawioContent(rawContent)

    if (isProject) {
      await rememberLastProjectPath(filePath)
    }

    return { canceled: false, filePath, content }
  })

  ipcMain.handle('diagram:save', async (_event, payload: SaveDiagramPayload) => {
    const isProject = payload.format === 'project'
    const result = await dialog.showSaveDialog({
      title: isProject ? 'Save Mermaid Pro project' : 'Save Mermaid diagram',
      defaultPath: payload.defaultPath ?? (isProject ? 'diagram.mpro' : 'diagram.mmd'),
      filters: isProject
        ? [{ name: 'Mermaid Pro projects', extensions: ['mpro'] }]
        : [
            { name: 'Mermaid files', extensions: ['mmd'] },
            { name: 'Text files', extensions: ['txt'] }
          ]
    })

    if (result.canceled || !result.filePath) {
      return undefined
    }

    await writeFile(result.filePath, payload.content, 'utf8')

    if (isProject) {
      await rememberLastProjectPath(result.filePath)
    }

    return result.filePath
  })

  ipcMain.handle('diagram:export', async (_event, payload: SaveExportPayload) => {
    const result = await dialog.showSaveDialog({
      title: `Export ${payload.extension.toUpperCase()}`,
      defaultPath: payload.fileName,
      filters: [{ name: payload.extension.toUpperCase(), extensions: [payload.extension] }]
    })

    if (result.canceled || !result.filePath) {
      return undefined
    }

    const content =
      payload.extension === 'png'
        ? Buffer.from(payload.data.replace(/^data:image\/png;base64,/, ''), 'base64')
        : payload.data

    await writeFile(result.filePath, content)
    return result.filePath
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
