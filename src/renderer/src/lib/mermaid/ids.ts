import type { VisualNode } from './types'

export function sanitizeId(id: string): string {
  const sanitizedId = id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '')
  if (!sanitizedId) {
    return 'node'
  }

  return /^[a-zA-Z_]/.test(sanitizedId) ? sanitizedId : `node_${sanitizedId}`
}

export function sanitizeErId(id: string): string {
  return sanitizeId(id).toUpperCase()
}

export function sanitizeErRole(text: string): string {
  return text.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'relates_to'
}

export function toClassId(node: VisualNode): string {
  return sanitizeId(node.data.label || node.id)
}

export function toErId(node: VisualNode): string {
  return sanitizeErId(node.data.label || node.id)
}
