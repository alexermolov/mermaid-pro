export function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"')
}

export function escapeSequenceText(text: string): string {
  return normalizeInlineText(text)
}

export function escapeQuotedText(text: string): string {
  return text.replace(/"/g, '\\"').replace(/\s+/g, ' ').trim()
}

export function escapeClassText(text: string): string {
  return normalizeInlineText(text)
}

export function escapeStateText(text: string): string {
  return normalizeInlineText(text)
}

export function escapeErText(text: string): string {
  return escapeQuotedText(text)
}

export function escapeMindmapText(text: string): string {
  return normalizeInlineText(text)
}

export function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function escapeFlowchartPipeLabel(text: string): string {
  return normalizeInlineText(text).replace(/\|/g, '\\|')
}

export function normalizeEscapedText(text: string): string {
  return text.replace(/\\"/g, '"').replace(/^['"]|['"]$/g, '').trim()
}

export function normalizeFlowchartLabel(text: string): string {
  const normalizedText = normalizeEscapedText(text)
  const labelWithoutLeadingIcon = normalizedText.replace(/^(?:fa[a-z]*):fa-[A-Za-z0-9-]+\s+/i, '')

  return labelWithoutLeadingIcon || normalizedText
}

export function normalizeMindmapLabel(content: string): string {
  return content
    .replace(/^root\(\(/, '')
    .replace(/\)\)$/, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/^[^:]+:\s+/, '')
    .trim()
}
