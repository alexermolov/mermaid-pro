import type { DiagramDirection } from '../../../../../shared/diagram'

export function toTimelineDiagram(direction: DiagramDirection): string {
  return [
    direction === 'TD' ? 'timeline TD' : 'timeline',
    '    title Untitled timeline',
    '    section Phase 1',
    '        Milestone 1 : Describe the first event',
    '        Milestone 2 : Add another event'
  ].join('\n')
}
