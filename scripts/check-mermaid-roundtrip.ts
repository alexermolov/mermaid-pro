#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { graphToMermaidText, mermaidTextToGraph, normalizeMermaidInput } from '../src/renderer/src/lib/mermaid.js'
import { createDiagramSnapshotFromMermaidCode } from '../src/renderer/src/lib/projectSnapshots.js'

type CliOptions = {
  filePath?: string
  json: boolean
  printCode: boolean
}

const usage = `
Usage:
  npm run check:mermaid-roundtrip -- --file <path> [--json] [--print-code]
  npm run check:mermaid-roundtrip -- <path> [--json] [--print-code]
  Get-Content <path> | npm run check:mermaid-roundtrip -- [--json] [--print-code]

Examples:
  npm run check:mermaid-roundtrip -- --file sample.mmd
  npm run check:mermaid-roundtrip -- sample.mmd
  npm run check:mermaid-roundtrip -- --file sample.mmd --print-code
  Get-Content sample.mmd | npm run check:mermaid-roundtrip -- --json

Options:
  --file <path>   Read Mermaid source from a file.
  --json          Print the summary as JSON.
  --print-code    Print the regenerated Mermaid code after the summary.
  --help, -h      Show this help.
`

const options = parseArgs(process.argv.slice(2))

if (!options) {
  process.exit(1)
}

const source = readInput(options)

if (!source.trim()) {
  fail('Expected Mermaid code from --file or stdin.')
}

const graph = mermaidTextToGraph(source)
const normalized = normalizeMermaidInput(source)
const snapshot = createDiagramSnapshotFromMermaidCode(source, {
  title: 'Roundtrip check',
  appTheme: 'dark'
})
const regeneratedCode = graphToMermaidText(graph)

const summary = {
  sourceLineCount: countLines(source),
  regeneratedLineCount: countLines(regeneratedCode),
  diagramType: graph.diagramType,
  direction: graph.direction,
  nodeCount: graph.nodes.length,
  edgeCount: graph.edges.length,
  normalizedCodeMatchesSource: normalized.code === source,
  normalizedGraphMatchesCounts:
    normalized.graph.nodes.length === graph.nodes.length && normalized.graph.edges.length === graph.edges.length,
  snapshot: {
    title: snapshot.title,
    diagramType: snapshot.diagramType,
    direction: snapshot.direction,
    nodeCount: snapshot.nodes.length,
    edgeCount: snapshot.edges.length,
    autoSync: snapshot.autoSync
  },
  sampleNodes: graph.nodes.slice(0, 5).map((node) => ({
    id: node.id,
    label: node.data.label,
    shape: node.data.shape,
    classNames: node.data.flowchartClassNames,
    style: node.data.style
  })),
  sampleEdges: graph.edges.slice(0, 5).map((edge) => ({
    id: edge.id,
    label: edge.label,
    lineStyle: edge.data?.lineStyle,
    source: edge.source,
    target: edge.target
  })),
  regeneratedPreview: regeneratedCode.split(/\r?\n/).slice(0, 20)
}

if (options.json) {
  console.log(JSON.stringify(summary, null, 2))
} else {
  printSummary(summary)
}

if (options.printCode) {
  process.stdout.write('\n--- regenerated-code ---\n')
  process.stdout.write(regeneratedCode)
  process.stdout.write(regeneratedCode.endsWith('\n') ? '' : '\n')
}

function parseArgs(args: string[]): CliOptions | undefined {
  const filteredArgs = args.filter((arg) => arg !== '--')

  if (filteredArgs.includes('--help') || filteredArgs.includes('-h')) {
    console.log(usage.trim())
    return undefined
  }

  let filePath: string | undefined
  let json = false
  let printCode = false

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (!arg.startsWith('--')) {
      if (filePath) {
        fail(`Unexpected extra argument: ${arg}`)
      }

      filePath = resolve(arg)
      continue
    }

    if (arg === '--file') {
      const nextArg = filteredArgs[index + 1]
      if (!nextArg || nextArg.startsWith('--')) {
        fail('Expected a file path after --file.')
      }

      filePath = resolve(nextArg)
      index += 1
      continue
    }

    if (arg === '--json') {
      json = true
      continue
    }

    if (arg === '--print-code') {
      printCode = true
      continue
    }

    fail(`Unknown option: ${arg}`)
  }

  return {
    filePath,
    json,
    printCode
  }
}

function readInput(options: CliOptions): string {
  if (options.filePath) {
    return readFileSync(options.filePath, 'utf8')
  }

  if (!process.stdin.isTTY) {
    return readFileSync(0, 'utf8')
  }

  fail('No Mermaid input provided. Use --file <path> or pipe Mermaid code into stdin.')
}

function countLines(text: string): number {
  return text.split(/\r?\n/).length
}

function printSummary(summary: {
  sourceLineCount: number
  regeneratedLineCount: number
  diagramType: string
  direction: string
  nodeCount: number
  edgeCount: number
  normalizedCodeMatchesSource: boolean
  normalizedGraphMatchesCounts: boolean
  snapshot: {
    title: string
    diagramType: string
    direction: string
    nodeCount: number
    edgeCount: number
    autoSync: boolean
  }
  sampleNodes: Array<{
    id: string
    label: string
    shape?: string
    classNames?: string[]
    style?: unknown
  }>
  sampleEdges: Array<{
    id: string
    label?: string | number | null
    lineStyle?: string
    source: string
    target: string
  }>
  regeneratedPreview: string[]
}): void {
  console.log(`diagram: ${summary.diagramType} ${summary.direction}`)
  console.log(`nodes: ${summary.nodeCount}`)
  console.log(`edges: ${summary.edgeCount}`)
  console.log(`source lines: ${summary.sourceLineCount}`)
  console.log(`regenerated lines: ${summary.regeneratedLineCount}`)
  console.log(`normalized code matches source: ${summary.normalizedCodeMatchesSource}`)
  console.log(`normalized graph counts match: ${summary.normalizedGraphMatchesCounts}`)
  console.log(`snapshot autoSync: ${summary.snapshot.autoSync}`)
  console.log('sample nodes:')
  for (const node of summary.sampleNodes) {
    console.log(`  ${node.id}: label=${JSON.stringify(node.label)} shape=${node.shape ?? '-'} classes=${JSON.stringify(node.classNames ?? [])}`)
  }
  console.log('sample edges:')
  for (const edge of summary.sampleEdges) {
    console.log(
      `  ${edge.id}: ${edge.source} -> ${edge.target} label=${JSON.stringify(edge.label ?? '')} lineStyle=${edge.lineStyle ?? '-'}`
    )
  }
  console.log('regenerated preview:')
  for (const line of summary.regeneratedPreview) {
    console.log(`  ${line}`)
  }
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}