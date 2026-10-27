export type Window = { pct: number; resetsAt?: string }
export type Reading = {
  ctxTokens?: number
  ctxWindow: number
  ctxPct?: number
  session?: Window
  weekly?: Window
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { reading: Reading | null; now: number; isHidden: boolean }
  }
}
