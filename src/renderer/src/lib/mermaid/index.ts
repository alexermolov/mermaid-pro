/**
 * Mermaid «engine»: graph model, layout, text ↔ diagram round-trip (parse / serialize).
 */
export * from './defaults'
export * from './types'
export { autoLayoutNodes, getSequenceLifelineHeight, layoutSequenceNodes, layoutStateCompositeNodes } from './layout'
export { nextNodeId } from './graph-model'
export { graphToMermaidText, toMermaid } from './serialize'
export { mermaidTextToGraph, normalizeMermaidInput, parseMermaid } from './parse'
export { STATE_INNER_STAR_END_SUFFIX, STATE_INNER_STAR_START_SUFFIX, STATE_SCOPE_SEP, STATE_STAR_END_ID, STATE_STAR_START_ID } from './stateDiagramIds'
