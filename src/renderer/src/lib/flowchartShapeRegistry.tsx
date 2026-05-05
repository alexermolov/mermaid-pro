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

function renderCommentBrace(
  appearance: FlowchartShapeAppearance,
  direction: 'left' | 'right'
): JSX.Element {
  const path =
    direction === 'left'
      ? 'M 70 10 C 45 10, 45 30, 30 30 C 45 30, 45 50, 70 50 C 45 50, 45 70, 30 70 C 45 70, 45 90, 70 90'
      : 'M 30 10 C 55 10, 55 30, 70 30 C 55 30, 55 50, 30 50 C 55 50, 55 70, 70 70 C 55 70, 55 90, 30 90'

  return (
    <path
      d={path}
      fill="none"
      stroke={appearance.stroke}
      strokeWidth={appearance.strokeWidth + 1}
      strokeLinecap="round"
    />
  )
}

function renderCylinderShape(appearance: FlowchartShapeAppearance): JSX.Element {
  return (
    <path
      d="M 14 18 C 14 8, 86 8, 86 18 L 86 82 C 86 92, 14 92, 14 82 Z M 14 18 C 14 28, 86 28, 86 18 M 14 82 C 14 72, 86 72, 86 82"
      fill={appearance.fill}
      stroke={appearance.stroke}
      strokeWidth={appearance.strokeWidth}
    />
  )
}

function renderDocumentShape(appearance: FlowchartShapeAppearance): JSX.Element {
  return (
    <path
      d="M 14 8 H 86 V 76 C 76 84, 66 80, 56 76 C 46 72, 36 80, 14 74 Z"
      fill={appearance.fill}
      stroke={appearance.stroke}
      strokeWidth={appearance.strokeWidth}
    />
  )
}

export const flowchartShapeRegistry: Record<FlowchartNodeShape, FlowchartShapeDefinition> = {
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
    render: renderCylinderShape
  },
  circle: {
    label: 'Circle',
    layout: { width: 112, minWidth: 112, height: 112 },
    render: (appearance) => <circle cx="50" cy="50" r="47" {...appearance} />
  },
  smallCircle: {
    label: 'Small circle',
    layout: { width: 96, minWidth: 96, height: 96 },
    render: (appearance) => <circle cx="50" cy="50" r="26" {...appearance} />
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
  framedCircle: {
    label: 'Framed circle',
    layout: { width: 118, minWidth: 118, height: 118 },
    render: (appearance) => (
      <>
        <rect x="10" y="10" width="80" height="80" rx="18" ry="18" fill="none" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
        <circle cx="50" cy="50" r="28" {...appearance} />
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
  },
  fork: {
    label: 'Fork / join',
    layout: { minWidth: 196, minHeight: 72 },
    render: (appearance) => <rect x="8" y="34" width="84" height="32" rx="6" ry="6" {...appearance} />
  },
  hourglass: {
    label: 'Hourglass',
    layout: { minWidth: 168, minHeight: 96 },
    render: (appearance) => <polygon points="18,8 82,8 62,50 82,92 18,92 38,50" {...appearance} />
  },
  comment: {
    label: 'Comment',
    layout: { minWidth: 176, minHeight: 88 },
    render: (appearance) => renderCommentBrace(appearance, 'left')
  },
  commentRight: {
    label: 'Comment right',
    layout: { minWidth: 176, minHeight: 88 },
    render: (appearance) => renderCommentBrace(appearance, 'right')
  },
  commentBoth: {
    label: 'Comment both sides',
    layout: { minWidth: 188, minHeight: 88 },
    render: (appearance) => (
      <>
        {renderCommentBrace(appearance, 'left')}
        {renderCommentBrace(appearance, 'right')}
      </>
    )
  },
  bolt: {
    label: 'Lightning bolt',
    layout: { width: 132, minWidth: 132, height: 132 },
    render: (appearance) => <polygon points="58,4 22,52 44,52 32,96 78,42 56,42" {...appearance} />
  },
  document: {
    label: 'Document',
    layout: { minWidth: 176, minHeight: 92 },
    render: renderDocumentShape
  },
  delay: {
    label: 'Delay',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <path
        d="M 10 10 H 62 A 28 28 0 0 1 62 90 H 10 Z"
        fill={appearance.fill}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
      />
    )
  },
  directAccessStorage: {
    label: 'Direct access storage',
    layout: { minWidth: 176, minHeight: 88 },
    render: (appearance) => (
      <path
        d="M 18 10 C 6 18, 6 82, 18 90 H 82 C 94 82, 94 18, 82 10 Z"
        fill={appearance.fill}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
      />
    )
  },
  linedCylinder: {
    label: 'Lined cylinder',
    layout: { minWidth: 176, minHeight: 88 },
    render: (appearance) => (
      <>
        {renderCylinderShape(appearance)}
        <line x1="26" y1="18" x2="26" y2="82" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.5" />
        <line x1="74" y1="18" x2="74" y2="82" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.5" />
      </>
    )
  },
  display: {
    label: 'Display',
    layout: { minWidth: 176, minHeight: 88 },
    render: (appearance) => (
      <path
        d="M 10 20 C 20 6, 78 6, 90 20 V 80 C 78 94, 20 94, 10 80 Z"
        fill={appearance.fill}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
      />
    )
  },
  dividedRectangle: {
    label: 'Divided rectangle',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <>
        <rect x="2" y="10" width="96" height="80" rx="12" ry="12" {...appearance} />
        <line x1="34" y1="10" x2="34" y2="90" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      </>
    )
  },
  triangle: {
    label: 'Triangle',
    layout: { width: 128, minWidth: 128, height: 112 },
    render: (appearance) => <polygon points="50,8 92,90 8,90" {...appearance} />
  },
  windowPane: {
    label: 'Window pane',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <>
        <rect x="8" y="12" width="84" height="76" rx="10" ry="10" {...appearance} />
        <line x1="50" y1="12" x2="50" y2="88" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
        <line x1="8" y1="50" x2="92" y2="50" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      </>
    )
  },
  filledCircle: {
    label: 'Filled circle',
    layout: { width: 92, minWidth: 92, height: 92 },
    render: (appearance) => <circle cx="50" cy="50" r="18" fill={appearance.stroke} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
  },
  linedDocument: {
    label: 'Lined document',
    layout: { minWidth: 176, minHeight: 92 },
    render: (appearance) => (
      <>
        {renderDocumentShape(appearance)}
        <line x1="26" y1="28" x2="74" y2="28" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.55" />
        <line x1="26" y1="42" x2="74" y2="42" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.55" />
        <line x1="26" y1="56" x2="66" y2="56" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.55" />
      </>
    )
  },
  notchedPentagon: {
    label: 'Notched pentagon',
    layout: { minWidth: 176, minHeight: 92 },
    render: (appearance) => <polygon points="8,16 66,16 78,4 92,16 92,86 8,86" {...appearance} />
  },
  flippedTriangle: {
    label: 'Flipped triangle',
    layout: { width: 128, minWidth: 128, height: 112 },
    render: (appearance) => <polygon points="8,16 92,16 50,92" {...appearance} />
  },
  slopedRectangle: {
    label: 'Sloped rectangle',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <polygon points="18,10 98,10 82,90 2,90" {...appearance} />
  },
  stackedDocument: {
    label: 'Stacked documents',
    layout: { minWidth: 184, minHeight: 98 },
    render: (appearance) => (
      <>
        <path d="M 22 16 H 82 V 70 C 74 78, 66 76, 58 72 C 50 68, 40 74, 22 70 Z" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.6" />
        <path d="M 12 8 H 72 V 74 C 64 82, 56 80, 48 76 C 40 72, 30 80, 12 74 Z" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      </>
    )
  },
  stackedRectangle: {
    label: 'Stacked rectangles',
    layout: { minWidth: 184, minHeight: 92 },
    render: (appearance) => (
      <>
        <rect x="18" y="18" width="68" height="56" rx="10" ry="10" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.58" />
        <rect x="8" y="8" width="68" height="56" rx="10" ry="10" {...appearance} />
      </>
    )
  },
  paperTape: {
    label: 'Paper tape',
    layout: { minWidth: 188, minHeight: 88 },
    render: (appearance) => (
      <path
        d="M 10 18 H 68 L 90 50 L 68 82 H 10 Q 22 66 10 50 Q 22 34 10 18 Z"
        fill={appearance.fill}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
      />
    )
  },
  bowTieRectangle: {
    label: 'Bow tie rectangle',
    layout: { minWidth: 184, minHeight: 88 },
    render: (appearance) => <polygon points="8,12 34,12 50,30 66,12 92,12 74,88 50,70 26,88" {...appearance} />
  },
  crossedCircle: {
    label: 'Crossed circle',
    layout: { width: 108, minWidth: 108, height: 108 },
    render: (appearance) => (
      <>
        <circle cx="50" cy="50" r="36" {...appearance} />
        <line x1="28" y1="28" x2="72" y2="72" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
        <line x1="72" y1="28" x2="28" y2="72" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
      </>
    )
  },
  taggedDocument: {
    label: 'Tagged document',
    layout: { minWidth: 176, minHeight: 92 },
    render: (appearance) => (
      <>
        {renderDocumentShape(appearance)}
        <polygon points="60,8 86,8 86,30 74,38 60,30" fill={appearance.stroke} opacity="0.18" />
      </>
    )
  },
  taggedRectangle: {
    label: 'Tagged rectangle',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <>
        <rect x="4" y="10" width="92" height="80" rx="12" ry="12" {...appearance} />
        <polygon points="64,10 92,10 92,34 78,44 64,34" fill={appearance.stroke} opacity="0.18" />
      </>
    )
  },
  notchedRectangle: {
    label: 'Notched rectangle',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => <path d="M 4 14 H 34 L 46 2 H 96 V 90 H 4 Z" fill={appearance.fill} stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} />
  },
  linedRectangle: {
    label: 'Lined rectangle',
    layout: { minWidth: 176, minHeight: 84 },
    render: (appearance) => (
      <>
        <rect x="4" y="10" width="92" height="80" rx="12" ry="12" {...appearance} />
        <line x1="20" y1="28" x2="80" y2="28" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.5" />
        <line x1="20" y1="42" x2="80" y2="42" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.5" />
        <line x1="20" y1="56" x2="80" y2="56" stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} opacity="0.5" />
      </>
    )
  },
  cloud: {
    label: 'Cloud',
    layout: { minWidth: 196, minHeight: 96 },
    render: (appearance) => (
      <path
        d="M 24 76 C 10 76, 6 54, 18 46 C 16 28, 34 18, 48 24 C 56 10, 78 10, 84 26 C 96 24, 104 34, 100 48 C 110 54, 106 76, 88 76 Z"
        fill={appearance.fill}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
      />
    )
  }
}

export const flowchartNodeShapes = Object.entries(flowchartShapeRegistry).map(([value, definition]) => ({
  value: value as FlowchartNodeShape,
  label: definition.label
}))

export function getFlowchartShapeDefinition(shape: FlowchartNodeShape): FlowchartShapeDefinition {
  return flowchartShapeRegistry[shape]
}