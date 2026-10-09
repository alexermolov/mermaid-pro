// dagre's UMD bundle expects browser globals: `window.graphlib` must be set
// by the graphlib UMD bundle before dagre's lib modules are required.
import graphlib from 'graphlib'

;(globalThis as unknown as { window: unknown }).window = { graphlib }

export {}
