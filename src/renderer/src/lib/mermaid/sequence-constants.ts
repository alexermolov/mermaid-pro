import type { SequenceMessageType } from './types'

export const sequenceArrowByMessageType: Record<SequenceMessageType, string> = {
  sync: '->',
  async: '->>',
  dashed: '-->',
  dashedAsync: '-->>'
}

export const sequenceMessageTypeByArrow: Record<string, SequenceMessageType> = Object.fromEntries(
  Object.entries(sequenceArrowByMessageType).map(([messageType, arrow]) => [arrow, messageType as SequenceMessageType])
) as Record<string, SequenceMessageType>
