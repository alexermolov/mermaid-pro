/**
 * Mermaid «engine»: graph model, layout, text ↔ diagram round-trip (parse / serialize).
 */
export * from './defaults'
export * from './types'
export { autoLayoutNodes, getSequenceLifelineHeight, layoutSequenceNodes } from './layout'
export { nextNodeId } from './graph-model'
export { graphToMermaidText, toMermaid } from './serialize'
export { mermaidTextToGraph, normalizeMermaidInput, parseMermaid } from './parse'
