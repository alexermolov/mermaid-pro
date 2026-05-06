export function stripLeadingMermaidFrontmatter(lines: string[]): string[] {
  if (lines[0]?.trim() !== '---') {
    return lines
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (closingIndex === -1) {
    return lines
  }

  return lines.slice(closingIndex + 1)
}
