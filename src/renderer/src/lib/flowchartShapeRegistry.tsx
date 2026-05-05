import type { CSSProperties, JSX } from 'react'
import type { FlowchartNodeShape } from './mermaid'

export type FlowchartShapeAppearance = {
  fill: string
  stroke: string
  strokeWidth: number
}

type FlowchartShapeDefinition = {
  label: string
  layout: CSSProperties
  render: (appearance: FlowchartShapeAppearance) => JSX.Element
}

export const flowchartShapeRegistry = {
  rectangle: {
    label: 'Rectangle',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <rect x="1.5" y="1.5" width="97" height="97" rx="16" ry="16" {...appearance} />
  },
  rounded: {
    label: 'Rounded',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <rect x="1.5" y="1.5" width="97" height="97" rx="22" ry="22" {...appearance} />
  },
  stadium: {
    label: 'Stadium',
    layout: { minWidth: 168, minHeight: 84 },
    render: (appearance) => <rect x="1.5" y="12" width="97" height="76" rx="38" ry="38" {...appearance} />
  },
  subroutine: {
    label: 'Subroutine',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <>
        <rect x="1.5" y="1.5" width="97" height="97" rx="16" ry="16" {...appearance} />
        <line x1="14" y1="10" x2="14" y2="90" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
        <line x1="86" y1="10" x2="86" y2="90" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      </>
    )
  },
  cylinder: {
    label: 'Cylinder',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <path
        d="M 14 18 C 14 8, 86 8, 86 18 L 86 82 C 86 92, 14 92, 14 82 Z M 14 18 C 14 28, 86 28, 86 18 M 14 82 C 14 72, 86 72, 86 82"
        fill={appearance.fill}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
      />
    )
  },
  circle: {
    label: 'Circle',
    layout: { width: 112, minWidth: 112, height: 112 },
    render: (appearance) => <circle cx="50" cy="50" r="47" {...appearance} />
  },
  doubleCircle: {
    label: 'Double circle',
    layout: { width: 112, minWidth: 112, height: 112 },
    render: (appearance) => (
      <>
        <circle cx="50" cy="50" r="47" {...appearance} />
        <circle cx="50" cy="50" r="38" fill="none" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      </>
    )
  },
  diamond: {
    label: 'Decision diamond',
    layout: { width: 132, minWidth: 132, height: 132 },
    render: (appearance) => <polygon points="50,2 98,50 50,98 2,50" {...appearance} />
  },
  hexagon: {
    label: 'Hexagon',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <polygon points="18,2 82,2 98,50 82,98 18,98 2,50" {...appearance} />
  },
  parallelogram: {
    label: 'Parallelogram',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <polygon points="14,2 98,2 86,98 2,98" {...appearance} />
  },
  trapezoid: {
    label: 'Trapezoid',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <polygon points="18,2 82,2 98,98 2,98" {...appearance} />
  },
  inverseTrapezoid: {
    label: 'Inverse trapezoid',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <polygon points="2,2 98,2 82,98 18,98" {...appearance} />
  },
  asymmetric: {
    label: 'Asymmetric',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <polygon points="2,2 86,2 98,50 86,98 2,98 14,50" {...appearance} />
  }
} satisfies Record<FlowchartNodeShape, FlowchartShapeDefinition>

export const flowchartNodeShapes = Object.entries(flowchartShapeRegistry).map(([value, definition]) => ({
  value: value as FlowchartNodeShape,
  label: definition.label
}))

export function getFlowchartShapeDefinition(shape: FlowchartNodeShape): FlowchartShapeDefinition {
  return flowchartShapeRegistry[shape]
}