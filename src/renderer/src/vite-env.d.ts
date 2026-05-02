/// <reference types="vite/client" />

import type { MermaidProApi } from '../../preload'

declare global {
  interface Window {
    mermaidPro: MermaidProApi
  }
}
