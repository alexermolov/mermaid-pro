import { useState, type CSSProperties, type JSX } from 'react'
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { DiagramDirection } from '../../../shared/diagram'
import {
  createEmptyTimelineEvent,
  createEmptyTimelinePeriod,
  createEmptyTimelineSection,
  parseTimelineCode,
  serializeTimelineDocument,
  type TimelineDocument,
  type TimelineEvent,
  type TimelinePeriod,
  type TimelineSection
} from '../lib/timeline'

type TimelineEditorPanelProps = {
  code: string
  onTimelineChange: (nextCode: string, nextDirection: DiagramDirection, status: string) => void
}

const ID = {
  sec: (sectionId: string) => `sec:${sectionId}`,
  prd: (sectionId: string, periodId: string) => `prd:${sectionId}:${periodId}`,
  evt: (sectionId: string, periodId: string, eventId: string) => `evt:${sectionId}:${periodId}:${eventId}`
} as const

function parseSectionDragId(value: string): string | null {
  if (!value.startsWith('sec:')) {
    return null
  }
  return value.slice(4)
}

function parsePeriodDragId(value: string): { sectionId: string; periodId: string } | null {
  if (!value.startsWith('prd:')) {
    return null
  }
  const rest = value.slice(4)
  const colon = rest.indexOf(':')
  if (colon <= 0) {
    return null
  }
  return { sectionId: rest.slice(0, colon), periodId: rest.slice(colon + 1) }
}

function parseEventDragId(value: string): { sectionId: string; periodId: string; eventId: string } | null {
  if (!value.startsWith('evt:')) {
    return null
  }
  const rest = value.slice(4)
  const first = rest.indexOf(':')
  const second = rest.indexOf(':', first + 1)
  if (first <= 0 || second <= first) {
    return null
  }
  return {
    sectionId: rest.slice(0, first),
    periodId: rest.slice(first + 1, second),
    eventId: rest.slice(second + 1)
  }
}

export function TimelineEditorPanel({ code, onTimelineChange }: TimelineEditorPanelProps): JSX.Element {
  const document = parseTimelineCode(code)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  function commit(nextDocument: TimelineDocument, status: string): void {
    onTimelineChange(serializeTimelineDocument(nextDocument), nextDocument.direction, status)
  }

  function updateDocument(updater: (currentDocument: TimelineDocument) => TimelineDocument, status: string): void {
    commit(updater(document), status)
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    setActiveDragId(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeStr = String(active.id)
    const overStr = String(over.id)

    const secA = parseSectionDragId(activeStr)
    const secO = parseSectionDragId(overStr)
    if (secA !== null && secO !== null) {
      const oldIndex = document.sections.findIndex((s) => s.id === secA)
      const newIndex = document.sections.findIndex((s) => s.id === secO)
      if (oldIndex < 0 || newIndex < 0) {
        return
      }
      commit({ ...document, sections: arrayMove(document.sections, oldIndex, newIndex) }, 'Timeline section reordered')
      return
    }

    const prdA = parsePeriodDragId(activeStr)
    const prdO = parsePeriodDragId(overStr)
    if (prdA && prdO && prdA.sectionId === prdO.sectionId) {
      const sectionIndex = document.sections.findIndex((s) => s.id === prdA.sectionId)
      if (sectionIndex < 0) {
        return
      }
      const section = document.sections[sectionIndex]
      const oldIndex = section.periods.findIndex((p) => p.id === prdA.periodId)
      const newIndex = section.periods.findIndex((p) => p.id === prdO.periodId)
      if (oldIndex < 0 || newIndex < 0) {
        return
      }
      const nextPeriods = arrayMove(section.periods, oldIndex, newIndex)
      const sections = document.sections.map((s, i) => (i === sectionIndex ? { ...s, periods: nextPeriods } : s))
      commit({ ...document, sections }, 'Timeline period reordered')
      return
    }

    const evtA = parseEventDragId(activeStr)
    const evtO = parseEventDragId(overStr)
    if (evtA && evtO && evtA.sectionId === evtO.sectionId && evtA.periodId === evtO.periodId) {
      const sectionIndex = document.sections.findIndex((s) => s.id === evtA.sectionId)
      if (sectionIndex < 0) {
        return
      }
      const section = document.sections[sectionIndex]
      const periodIndex = section.periods.findIndex((p) => p.id === evtA.periodId)
      if (periodIndex < 0) {
        return
      }
      const period = section.periods[periodIndex]
      const oldIndex = period.events.findIndex((e) => e.id === evtA.eventId)
      const newIndex = period.events.findIndex((e) => e.id === evtO.eventId)
      if (oldIndex < 0 || newIndex < 0) {
        return
      }
      const nextEvents = arrayMove(period.events, oldIndex, newIndex)
      const periods = section.periods.map((p, i) => (i === periodIndex ? { ...p, events: nextEvents } : p))
      const sections = document.sections.map((s, i) => (i === sectionIndex ? { ...s, periods } : s))
      commit({ ...document, sections }, 'Timeline event reordered')
    }
  }

  const sectionSortableIds = document.sections.map((s) => ID.sec(s.id))

  return (
    <section className="canvas-panel timeline-editor-panel">
      <div className="timeline-editor">
        <div className="timeline-editor__header">
          <div>
            <h2>Timeline editor</h2>
            <p>Structured form that writes Mermaid timeline code and keeps preview in sync. Drag handles reorder rows.</p>
          </div>
          <button
            type="button"
            className="compact-action"
            onClick={() =>
              updateDocument(
                (currentDocument) => ({
                  ...currentDocument,
                  sections: [...currentDocument.sections, createEmptyTimelineSection(currentDocument.sections.length)]
                }),
                'Timeline section added'
              )
            }
          >
            <Plus size={16} />
            Add section
          </button>
        </div>

        <div className="timeline-editor__meta">
          <label className="timeline-field">
            <span>Title</span>
            <input
              value={document.title}
              placeholder="Timeline title"
              onChange={(event) =>
                updateDocument(
                  (currentDocument) => ({
                    ...currentDocument,
                    title: event.target.value
                  }),
                  'Timeline title updated'
                )
              }
            />
          </label>
          <label className="timeline-field">
            <span>Direction</span>
            <select
              value={document.direction}
              onChange={(event) =>
                updateDocument(
                  (currentDocument) => ({
                    ...currentDocument,
                    direction: event.target.value === 'TD' ? 'TD' : 'LR'
                  }),
                  `Timeline direction changed to ${event.target.value === 'TD' ? 'TD' : 'LR'}`
                )
              }
            >
              <option value="LR">Left to right</option>
              <option value="TD">Top to bottom</option>
            </select>
          </label>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveDragId(String(active.id))}
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="timeline-editor__sections">
            {document.sections.length === 0 ? (
              <div className="timeline-empty-state">
                <p>No sections yet. Add one to start building the timeline visually.</p>
              </div>
            ) : (
              <SortableContext items={sectionSortableIds} strategy={verticalListSortingStrategy}>
                {document.sections.map((section, sectionIndex) => (
                  <SortableTimelineSection
                    key={section.id}
                    section={section}
                    sectionIndex={sectionIndex}
                    document={document}
                    updateDocument={updateDocument}
                    commit={commit}
                  />
                ))}
              </SortableContext>
            )}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDragId ? <TimelineDragOverlay activeId={activeDragId} document={document} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  )
}

function TimelineDragOverlay({ activeId, document }: { activeId: string; document: TimelineDocument }): JSX.Element {
  const sec = parseSectionDragId(activeId)
  if (sec !== null) {
    const section = document.sections.find((s) => s.id === sec)
    return (
      <div className="timeline-drag-overlay timeline-drag-overlay--section">
        <GripVertical size={16} aria-hidden />
        <span>{section?.title?.trim() ? section.title : 'Section'}</span>
      </div>
    )
  }

  const prd = parsePeriodDragId(activeId)
  if (prd !== null) {
    const section = document.sections.find((s) => s.id === prd.sectionId)
    const period = section?.periods.find((p) => p.id === prd.periodId)
    return (
      <div className="timeline-drag-overlay timeline-drag-overlay--period">
        <GripVertical size={16} aria-hidden />
        <span>{period?.label?.trim() ? period.label : 'Time period'}</span>
      </div>
    )
  }

  const evt = parseEventDragId(activeId)
  if (evt !== null) {
    const section = document.sections.find((s) => s.id === evt.sectionId)
    const period = section?.periods.find((p) => p.id === evt.periodId)
    const event = period?.events.find((e) => e.id === evt.eventId)
    return (
      <div className="timeline-drag-overlay timeline-drag-overlay--event">
        <GripVertical size={16} aria-hidden />
        <span>{event?.text?.trim() ? event.text : 'Event'}</span>
      </div>
    )
  }

  return (
    <div className="timeline-drag-overlay">
      <GripVertical size={16} aria-hidden />
      <span>Reorder</span>
    </div>
  )
}

type SortableSectionProps = {
  section: TimelineSection
  sectionIndex: number
  document: TimelineDocument
  updateDocument: (updater: (currentDocument: TimelineDocument) => TimelineDocument, status: string) => void
  commit: (nextDocument: TimelineDocument, status: string) => void
}

function SortableTimelineSection({ section, sectionIndex, document, updateDocument, commit }: SortableSectionProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ID.sec(section.id) })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined
  }

  const periodIds = section.periods.map((p) => ID.prd(section.id, p.id))

  return (
    <section ref={setNodeRef} style={style} className="timeline-section-card">
      <div className="timeline-section-card__header">
        <button
          type="button"
          className="timeline-drag-handle"
          aria-label="Drag to reorder section"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <label className="timeline-field">
          <span>Section</span>
          <input
            value={section.title}
            placeholder="Section title"
            onChange={(event) =>
              updateDocument(
                (currentDocument) => ({
                  ...currentDocument,
                  sections: currentDocument.sections.map((candidateSection, candidateIndex) =>
                    candidateIndex === sectionIndex ? { ...candidateSection, title: event.target.value } : candidateSection
                  )
                }),
                'Timeline section updated'
              )
            }
          />
        </label>
        <div className="timeline-card-actions">
          <button
            type="button"
            aria-label="Move section up"
            disabled={sectionIndex === 0}
            onClick={() => moveSection(document, sectionIndex, -1, commit)}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Move section down"
            disabled={sectionIndex === document.sections.length - 1}
            onClick={() => moveSection(document, sectionIndex, 1, commit)}
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Delete section"
            onClick={() =>
              updateDocument(
                (currentDocument) => ({
                  ...currentDocument,
                  sections: currentDocument.sections.filter((_, candidateIndex) => candidateIndex !== sectionIndex)
                }),
                'Timeline section removed'
              )
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="timeline-period-list">
        <SortableContext items={periodIds} strategy={verticalListSortingStrategy}>
          {section.periods.map((period, periodIndex) => (
            <SortableTimelinePeriod
              key={period.id}
              section={section}
              sectionIndex={sectionIndex}
              period={period}
              periodIndex={periodIndex}
              document={document}
              updateDocument={updateDocument}
              commit={commit}
            />
          ))}
        </SortableContext>
      </div>

      <div className="timeline-inline-actions">
        <button
          type="button"
          onClick={() =>
            updateDocument(
              (currentDocument) => ({
                ...currentDocument,
                sections: currentDocument.sections.map((candidateSection, candidateIndex) =>
                  candidateIndex === sectionIndex
                    ? {
                        ...candidateSection,
                        periods: [...candidateSection.periods, createEmptyTimelinePeriod(sectionIndex, candidateSection.periods.length)]
                      }
                    : candidateSection
                )
              }),
              'Timeline period added'
            )
          }
        >
          <Plus size={14} />
          Add time period
        </button>
      </div>
    </section>
  )
}

type SortablePeriodProps = {
  section: TimelineSection
  sectionIndex: number
  period: TimelinePeriod
  periodIndex: number
  document: TimelineDocument
  updateDocument: (updater: (currentDocument: TimelineDocument) => TimelineDocument, status: string) => void
  commit: (nextDocument: TimelineDocument, status: string) => void
}

function SortableTimelinePeriod({
  section,
  sectionIndex,
  period,
  periodIndex,
  document,
  updateDocument,
  commit
}: SortablePeriodProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ID.prd(section.id, period.id) })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined
  }

  const eventIds = period.events.map((e) => ID.evt(section.id, period.id, e.id))

  return (
    <article ref={setNodeRef} style={style} className="timeline-period-card">
      <div className="timeline-period-card__header">
        <button
          type="button"
          className="timeline-drag-handle"
          aria-label="Drag to reorder time period"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <label className="timeline-field">
          <span>Time period</span>
          <input
            value={period.label}
            placeholder="2004 or Q1"
            onChange={(event) =>
              updateDocument(
                (currentDocument) => ({
                  ...currentDocument,
                  sections: currentDocument.sections.map((candidateSection, candidateSectionIndex) =>
                    candidateSectionIndex === sectionIndex
                      ? {
                          ...candidateSection,
                          periods: candidateSection.periods.map((candidatePeriod, candidatePeriodIndex) =>
                            candidatePeriodIndex === periodIndex ? { ...candidatePeriod, label: event.target.value } : candidatePeriod
                          )
                        }
                      : candidateSection
                  )
                }),
                'Timeline period updated'
              )
            }
          />
        </label>
        <div className="timeline-card-actions">
          <button
            type="button"
            aria-label="Move period up"
            disabled={periodIndex === 0}
            onClick={() => movePeriod(document, sectionIndex, periodIndex, -1, commit)}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Move period down"
            disabled={periodIndex === section.periods.length - 1}
            onClick={() => movePeriod(document, sectionIndex, periodIndex, 1, commit)}
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Delete period"
            onClick={() =>
              updateDocument(
                (currentDocument) => ({
                  ...currentDocument,
                  sections: currentDocument.sections.map((candidateSection, candidateSectionIndex) =>
                    candidateSectionIndex === sectionIndex
                      ? {
                          ...candidateSection,
                          periods: candidateSection.periods.filter((_, candidatePeriodIndex) => candidatePeriodIndex !== periodIndex)
                        }
                      : candidateSection
                  )
                }),
                'Timeline period removed'
              )
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="timeline-event-list">
        <SortableContext items={eventIds} strategy={verticalListSortingStrategy}>
          {period.events.map((event, eventIndex) => (
            <SortableTimelineEventRow
              key={event.id}
              section={section}
              sectionIndex={sectionIndex}
              period={period}
              periodIndex={periodIndex}
              event={event}
              eventIndex={eventIndex}
              document={document}
              updateDocument={updateDocument}
              commit={commit}
            />
          ))}
        </SortableContext>
      </div>

      <div className="timeline-inline-actions">
        <button
          type="button"
          onClick={() =>
            updateDocument(
              (currentDocument) => ({
                ...currentDocument,
                sections: currentDocument.sections.map((candidateSection, candidateSectionIndex) =>
                  candidateSectionIndex === sectionIndex
                    ? {
                        ...candidateSection,
                        periods: candidateSection.periods.map((candidatePeriod, candidatePeriodIndex) =>
                          candidatePeriodIndex === periodIndex
                            ? {
                                ...candidatePeriod,
                                events: [
                                  ...candidatePeriod.events,
                                  createEmptyTimelineEvent(sectionIndex, periodIndex, candidatePeriod.events.length)
                                ]
                              }
                            : candidatePeriod
                        )
                      }
                    : candidateSection
                )
              }),
              'Timeline event added'
            )
          }
        >
          <Plus size={14} />
          Add event
        </button>
      </div>
    </article>
  )
}

type SortableEventRowProps = {
  section: TimelineSection
  sectionIndex: number
  period: TimelinePeriod
  periodIndex: number
  event: TimelineEvent
  eventIndex: number
  document: TimelineDocument
  updateDocument: (updater: (currentDocument: TimelineDocument) => TimelineDocument, status: string) => void
  commit: (nextDocument: TimelineDocument, status: string) => void
}

function SortableTimelineEventRow({
  section,
  sectionIndex,
  period,
  periodIndex,
  event,
  eventIndex,
  document,
  updateDocument,
  commit
}: SortableEventRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ID.evt(section.id, period.id, event.id)
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined
  }

  return (
    <div ref={setNodeRef} style={style} className="timeline-event-row">
      <button
        type="button"
        className="timeline-drag-handle timeline-drag-handle--compact"
        aria-label="Drag to reorder event"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <label className="timeline-field">
        <span>{eventIndex === 0 ? 'Event' : 'Sub-event'}</span>
        <input
          value={event.text}
          placeholder="Describe the event"
          onChange={(changeEvent) =>
            updateDocument(
              (currentDocument) => ({
                ...currentDocument,
                sections: currentDocument.sections.map((candidateSection, candidateSectionIndex) =>
                  candidateSectionIndex === sectionIndex
                    ? {
                        ...candidateSection,
                        periods: candidateSection.periods.map((candidatePeriod, candidatePeriodIndex) =>
                          candidatePeriodIndex === periodIndex
                            ? {
                                ...candidatePeriod,
                                events: candidatePeriod.events.map((candidateEvent, candidateEventIndex) =>
                                  candidateEventIndex === eventIndex ? { ...candidateEvent, text: changeEvent.target.value } : candidateEvent
                                )
                              }
                            : candidatePeriod
                        )
                      }
                    : candidateSection
                )
              }),
              'Timeline event updated'
            )
          }
        />
      </label>
      <div className="timeline-card-actions timeline-card-actions--row">
        <button
          type="button"
          aria-label="Move event up"
          disabled={eventIndex === 0}
          onClick={() => moveEvent(document, sectionIndex, periodIndex, eventIndex, -1, commit)}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          aria-label="Move event down"
          disabled={eventIndex === period.events.length - 1}
          onClick={() => moveEvent(document, sectionIndex, periodIndex, eventIndex, 1, commit)}
        >
          <ArrowDown size={14} />
        </button>
        <button
          type="button"
          aria-label="Delete event"
          onClick={() =>
            updateDocument(
              (currentDocument) => ({
                ...currentDocument,
                sections: currentDocument.sections.map((candidateSection, candidateSectionIndex) =>
                  candidateSectionIndex === sectionIndex
                    ? {
                        ...candidateSection,
                        periods: candidateSection.periods.map((candidatePeriod, candidatePeriodIndex) =>
                          candidatePeriodIndex === periodIndex
                            ? {
                                ...candidatePeriod,
                                events: candidatePeriod.events.filter((_, candidateEventIndex) => candidateEventIndex !== eventIndex)
                              }
                            : candidatePeriod
                        )
                      }
                    : candidateSection
                )
              }),
              'Timeline event removed'
            )
          }
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function moveSection(
  document: TimelineDocument,
  sectionIndex: number,
  delta: -1 | 1,
  commit: (nextDocument: TimelineDocument, status: string) => void
): void {
  const nextIndex = sectionIndex + delta

  if (nextIndex < 0 || nextIndex >= document.sections.length) {
    return
  }

  const sections = arrayMove(document.sections, sectionIndex, nextIndex)
  commit({ ...document, sections }, 'Timeline section reordered')
}

function movePeriod(
  document: TimelineDocument,
  sectionIndex: number,
  periodIndex: number,
  delta: -1 | 1,
  commit: (nextDocument: TimelineDocument, status: string) => void
): void {
  const section = document.sections[sectionIndex]
  const nextIndex = periodIndex + delta

  if (!section || nextIndex < 0 || nextIndex >= section.periods.length) {
    return
  }

  const sections = document.sections.map((candidateSection, candidateSectionIndex) =>
    candidateSectionIndex === sectionIndex
      ? { ...candidateSection, periods: arrayMove(candidateSection.periods, periodIndex, nextIndex) }
      : candidateSection
  )

  commit({ ...document, sections }, 'Timeline period reordered')
}

function moveEvent(
  document: TimelineDocument,
  sectionIndex: number,
  periodIndex: number,
  eventIndex: number,
  delta: -1 | 1,
  commit: (nextDocument: TimelineDocument, status: string) => void
): void {
  const section = document.sections[sectionIndex]
  const period = section?.periods[periodIndex]
  const nextIndex = eventIndex + delta

  if (!period || nextIndex < 0 || nextIndex >= period.events.length) {
    return
  }

  const sections = document.sections.map((candidateSection, candidateSectionIndex) =>
    candidateSectionIndex === sectionIndex
      ? {
          ...candidateSection,
          periods: candidateSection.periods.map((candidatePeriod, candidatePeriodIndex) =>
            candidatePeriodIndex === periodIndex
              ? { ...candidatePeriod, events: arrayMove(candidatePeriod.events, eventIndex, nextIndex) }
              : candidatePeriod
          )
        }
      : candidateSection
  )

  commit({ ...document, sections }, 'Timeline event reordered')
}
