/** Reserved canvas ids for Mermaid `[*]` start / end pseudo-states (see state diagram syntax). */
export const STATE_STAR_START_ID = '__mpro_state_star_start__'
export const STATE_STAR_END_ID = '__mpro_state_star_end__'

/** Separates composite path segments in internal graph ids (not used in emitted Mermaid). */
export const STATE_SCOPE_SEP = '__mpro__'

/** Suffix on composite graph id for scoped `[*]` start (avoids collision with normal state ids). */
export const STATE_INNER_STAR_START_SUFFIX = `${STATE_SCOPE_SEP}mproStarStart`
export const STATE_INNER_STAR_END_SUFFIX = `${STATE_SCOPE_SEP}mproStarEnd`
