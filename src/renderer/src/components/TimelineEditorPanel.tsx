import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { DiagramDirection } from '../../../shared/diagram'
import {
  createEmptyTimelineEvent,
  createEmptyTimelinePeriod,
  createEmptyTimelineSection,
  parseTimelineCode,
  serializeTimelineDocument,
  type TimelineDocument,
  type TimelineSection
} from '../lib/timeline'

type TimelineEditorPanelProps = {
  code: string
  onTimelineChange: (nextCode: string, nextDirection: DiagramDirection, status: string) => void
}

export function TimelineEditorPanel({ code, onTimelineChange }: TimelineEditorPanelProps): JSX.Element {
  const document = parseTimelineCode(code)

  function commit(nextDocument: TimelineDocument, status: string): void {
    onTimelineChange(serializeTimelineDocument(nextDocument), nextDocument.direction, status)
  }

  function updateDocument(updater: (currentDocument: TimelineDocument) => TimelineDocument, status: string): void {
    commit(updater(document), status)
  }

  return (
    <section className="canvas-panel timeline-editor-panel">
      <div className="timeline-editor">
        <div className="timeline-editor__header">
          <div>
            <h2>Timeline editor</h2>
            <p>Structured form that writes Mermaid timeline code and keeps preview in sync.</p>
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

        <div className="timeline-editor__sections">
          {document.sections.length === 0 ? (
            <div className="timeline-empty-state">
              <p>No sections yet. Add one to start building the timeline visually.</p>
            </div>
          ) : (
            document.sections.map((section, sectionIndex) => (
              <section key={section.id} className="timeline-section-card">
                <div className="timeline-section-card__header">
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
                              candidateIndex === sectionIndex
                                ? { ...candidateSection, title: event.target.value }
                                : candidateSection
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
                  {section.periods.map((period, periodIndex) => (
                    <article key={period.id} className="timeline-period-card">
                      <div className="timeline-period-card__header">
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
                                            candidatePeriodIndex === periodIndex
                                              ? { ...candidatePeriod, label: event.target.value }
                                              : candidatePeriod
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
                                          periods: candidateSection.periods.filter(
                                            (_, candidatePeriodIndex) => candidatePeriodIndex !== periodIndex
                                          )
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
                        {period.events.map((event, eventIndex) => (
                          <div key={event.id} className="timeline-event-row">
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
                                                        candidateEventIndex === eventIndex
                                                          ? { ...candidateEvent, text: changeEvent.target.value }
                                                          : candidateEvent
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
                                                      events: candidatePeriod.events.filter(
                                                        (_, candidateEventIndex) => candidateEventIndex !== eventIndex
                                                      )
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
                        ))}
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
                                                  createEmptyTimelineEvent(
                                                    sectionIndex,
                                                    periodIndex,
                                                    candidatePeriod.events.length
                                                  )
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
                  ))}
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
                                  periods: [
                                    ...candidateSection.periods,
                                    createEmptyTimelinePeriod(sectionIndex, candidateSection.periods.length)
                                  ]
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
            ))
          )}
        </div>
      </div>
    </section>
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

  const sections = reorder(document.sections, sectionIndex, nextIndex)
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
      ? { ...candidateSection, periods: reorder(candidateSection.periods, periodIndex, nextIndex) }
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
              ? { ...candidatePeriod, events: reorder(candidatePeriod.events, eventIndex, nextIndex) }
              : candidatePeriod
          )
        }
      : candidateSection
  )

  commit({ ...document, sections }, 'Timeline event reordered')
}

function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const reorderedItems = [...items]
  const [movedItem] = reorderedItems.splice(fromIndex, 1)
  reorderedItems.splice(toIndex, 0, movedItem)
  return reorderedItems
}