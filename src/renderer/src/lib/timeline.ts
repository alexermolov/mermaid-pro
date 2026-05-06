import type { DiagramDirection } from '../../../shared/diagram'

export type TimelineDirection = Extract<DiagramDirection, 'LR' | 'TD'>

export type TimelineEvent = {
  id: string
  text: string
}

export type TimelinePeriod = {
  id: string
  label: string
  events: TimelineEvent[]
}

export type TimelineSection = {
  id: string
  title: string
  periods: TimelinePeriod[]
}

export type TimelineDocument = {
  direction: TimelineDirection
  title: string
  sections: TimelineSection[]
}

export function createDefaultTimelineCode(): string {
  return serializeTimelineDocument({
    direction: 'LR',
    title: 'Project delivery timeline',
    sections: [
      {
        id: 'section-0',
        title: 'Discovery',
        periods: [
          {
            id: 'period-0-0',
            label: 'Week 1',
            events: [{ id: 'event-0-0-0', text: 'Kickoff' }]
          },
          {
            id: 'period-0-1',
            label: 'Week 2',
            events: [
              { id: 'event-0-1-0', text: 'Research' },
              { id: 'event-0-1-1', text: 'Interviews' }
            ]
          }
        ]
      },
      {
        id: 'section-1',
        title: 'Delivery',
        periods: [
          {
            id: 'period-1-0',
            label: 'Week 3',
            events: [{ id: 'event-1-0-0', text: 'Design review' }]
          },
          {
            id: 'period-1-1',
            label: 'Week 4',
            events: [{ id: 'event-1-1-0', text: 'Release' }]
          }
        ]
      }
    ]
  })
}

export function createEmptyTimelineSection(index: number): TimelineSection {
  return {
    id: `section-${index}`,
    title: `Section ${index + 1}`,
    periods: [createEmptyTimelinePeriod(index, 0)]
  }
}

export function createEmptyTimelinePeriod(sectionIndex: number, periodIndex: number): TimelinePeriod {
  return {
    id: `period-${sectionIndex}-${periodIndex}`,
    label: `Period ${periodIndex + 1}`,
    events: [createEmptyTimelineEvent(sectionIndex, periodIndex, 0)]
  }
}

export function createEmptyTimelineEvent(
  sectionIndex: number,
  periodIndex: number,
  eventIndex: number
): TimelineEvent {
  return {
    id: `event-${sectionIndex}-${periodIndex}-${eventIndex}`,
    text: `Event ${eventIndex + 1}`
  }
}

export function parseTimelineCode(code: string): TimelineDocument {
  const lines = stripLeadingTimelineFrontmatter(
    code
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => {
        const trimmedLine = line.trim()
        return trimmedLine.length > 0 && !trimmedLine.startsWith('%%')
      })
  )

  const header = lines[0]?.trim() ?? 'timeline'
  const direction = /\bTD$/.test(header) ? 'TD' : 'LR'
  const sections: TimelineSection[] = []
  let title = ''
  let currentSectionIndex = -1
  let currentPeriodIndex = -1

  const ensureSection = (): TimelineSection => {
    if (currentSectionIndex >= 0 && sections[currentSectionIndex]) {
      return sections[currentSectionIndex]
    }

    const nextSection: TimelineSection = {
      id: `section-${sections.length}`,
      title: '',
      periods: []
    }
    sections.push(nextSection)
    currentSectionIndex = sections.length - 1
    currentPeriodIndex = -1
    return nextSection
  }

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()

    if (line.startsWith('title ')) {
      title = line.slice(6).trim()
      continue
    }

    if (line.startsWith('section ')) {
      sections.push({
        id: `section-${sections.length}`,
        title: line.slice(8).trim(),
        periods: []
      })
      currentSectionIndex = sections.length - 1
      currentPeriodIndex = -1
      continue
    }

    if (!line.includes(':')) {
      continue
    }

    const parts = line.split(/\s*:\s*/)
    const periodLabel = (parts.shift() ?? '').trim()
    const eventTexts = parts.map((part) => part.trim()).filter((part) => part.length > 0)
    const currentSection = ensureSection()

    if (periodLabel.length > 0) {
      const nextPeriodIndex = currentSection.periods.length
      currentSection.periods.push({
        id: `period-${currentSectionIndex}-${nextPeriodIndex}`,
        label: periodLabel,
        events: (eventTexts.length > 0 ? eventTexts : ['']).map((text, eventIndex) => ({
          id: `event-${currentSectionIndex}-${nextPeriodIndex}-${eventIndex}`,
          text
        }))
      })
      currentPeriodIndex = nextPeriodIndex
      continue
    }

    if (currentPeriodIndex < 0 || !currentSection.periods[currentPeriodIndex]) {
      continue
    }

    const currentPeriod = currentSection.periods[currentPeriodIndex]
    const nextEventStartIndex = currentPeriod.events.length
    const continuationEvents = (eventTexts.length > 0 ? eventTexts : ['']).map((text, eventIndex) => ({
      id: `event-${currentSectionIndex}-${currentPeriodIndex}-${nextEventStartIndex + eventIndex}`,
      text
    }))
    currentPeriod.events = [...currentPeriod.events, ...continuationEvents]
  }

  return {
    direction,
    title,
    sections
  }
}

export function serializeTimelineDocument(document: TimelineDocument): string {
  const lines = [document.direction === 'TD' ? 'timeline TD' : 'timeline']

  if (document.title.trim()) {
    lines.push(`    title ${document.title.trim()}`)
  }

  document.sections.forEach((section, sectionIndex) => {
    const sectionTitle = section.title.trim()
    const periods = section.periods.filter((period) => period.label.trim().length > 0 || period.events.some((event) => event.text.trim().length > 0))

    if (sectionTitle || document.sections.length > 1) {
      lines.push(`    section ${sectionTitle || `Section ${sectionIndex + 1}`}`)
    }

    periods.forEach((period, periodIndex) => {
      const periodLabel = period.label.trim() || `Period ${periodIndex + 1}`
      const events = period.events.length > 0 ? period.events : [{ id: `event-${sectionIndex}-${periodIndex}-0`, text: '' }]
      const firstEvent = events[0]?.text.trim() ?? ''

      lines.push(`        ${periodLabel} : ${firstEvent}`)

      events.slice(1).forEach((event) => {
        lines.push(`                 : ${event.text.trim()}`)
      })
    })
  })

  return lines.join('\n')
}

function stripLeadingTimelineFrontmatter(lines: string[]): string[] {
  if (lines[0]?.trim() !== '---') {
    return lines
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')

  return closingIndex === -1 ? lines : lines.slice(closingIndex + 1)
}