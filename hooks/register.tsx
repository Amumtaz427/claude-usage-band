import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit, Timer } from 'claude-code'

import type { Reading, Window } from '../types'

const reading = atom({ plugin: 'usage-band', key: 'reading' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-band', key: 'isHidden' } as const, false)

const PANE = 'usage-band'
const CTX = '#38bdf8'
const SESS = '#a78bfa'
const WEEK = '#2dd4bf'
const WARN = '#f5b84b'
const CRIT = '#f2666a'

const tone = (p: number, base: string) => (p >= 90 ? CRIT : p >= 75 ? WARN : base)

const fmtK = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n))

const left = (iso: string | undefined, t: number) => {
  if (!iso) return 'reset time unknown'
  const ms = Math.max(0, Date.parse(iso) - t)
  const D = 864e5, H = 36e5
  const d = Math.floor(ms / D), h = Math.floor((ms % D) / H), m = Math.floor((ms % H) / 6e4)
  return `resets in ${d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`}`
}

const toReading = (context: SessionContextUsage, limits: SessionRateLimit[]): Reading => {
  const win = (kind: string): Window | undefined => {
    const r = limits.find(l => l.kind === kind)
    return r ? { pct: r.percentUsed, resetsAt: r.resetsAt } : undefined
  }
  return {
    ctxTokens: context.tokens,
    ctxWindow: context.window,
    ctxPct: context.percent,
    session: win('five_hour'),
    weekly: win('seven_day'),
  }
}

export const register: Register = on => {
  let tick: Timer | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    $.command.register({ name: 'usage-band', description: 'Show or hide the usage meters panel' })
    if (!(await read($, isHidden))) void $.ui.open({ id: PANE, title: 'Usage' })
    try {
      const u = await $.session.usage()
      await update($, reading, () => toReading(u.context, u.rateLimits))
    } catch {}
    await update($, now, () => Date.now())
    tick?.cancel()
    tick = $.clock.every(30_000, () => {
      void update($, now, () => Date.now())
    })
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, reading, () => toReading(e.context, e.rateLimits))
    await update($, now, () => Date.now())
    return next(e)
  })

  on('command.run', { command: 'usage-band' }, async ($, e, next) => {
    const hidden = await read($, isHidden)
    await update($, isHidden, () => !hidden)
    if (hidden) await $.ui.open({ id: PANE, title: 'Usage' })
    else await $.ui.close({ id: PANE })
    return { text: hidden ? 'Usage meters shown.' : 'Usage meters hidden. Run /usage-band to show them again.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const r = await read($, reading)
    const t = (await read($, now)) || Date.now()
    const { Box, Text } = $.ui.resolve(e)

    const ctxPct = r?.ctxPct ?? 0
    const cOn = ctxPct > 0 ? Math.max(1, Math.round((ctxPct / 100) * 16)) : 0
    const cc = tone(ctxPct, CTX)

    const head = (label: string, pct: number | undefined, color: string) => (
      <Box flexDirection="row" justifyContent="space-between" gap={2}>
        <Text dimColor weight="medium">{label}</Text>
        <Text color={color} weight="medium" tabular>{pct === undefined ? '—' : `${Math.round(pct)}%`}</Text>
      </Box>
    )

    const sess = r?.session
    const sp = sess?.pct ?? 0
    const sOn = sp > 0 ? Math.max(1, Math.round((sp / 100) * 9)) : 0
    const sc = tone(sp, SESS)

    const week = r?.weekly
    const wp = week?.pct ?? 0
    const W = 24
    const wAt = Math.min(W - 1, Math.round((wp / 100) * (W - 1)))
    const wc = tone(wp, WEEK)

    return (
      <Box flexDirection="row" flexWrap="wrap" borderStyle="round" borderDimColor paddingX={2} paddingY={1} columnGap={4} rowGap={1}>
        <Box flexDirection="column" flexGrow={1} minWidth={22} gap={1}>
          {head('CONTEXT', r?.ctxPct, cc)}
          <Text>
            <Text color={cc}>{'■'.repeat(cOn)}</Text>
            <Text dimColor>{'□'.repeat(16 - cOn)}</Text>
          </Text>
          <Text tabular>
            {r?.ctxTokens !== undefined ? `${fmtK(r.ctxTokens)} / ${fmtK(r.ctxWindow)} tokens` : `0 / ${fmtK(r?.ctxWindow ?? 0)} tokens`}
          </Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} minWidth={20} gap={1}>
          {head('SESSION · 5H', sess?.pct, sc)}
          <Text>
            <Text color={sc}>{'▰'.repeat(sOn)}</Text>
            <Text dimColor>{'▱'.repeat(9 - sOn)}</Text>
          </Text>
          <Text tabular>{sess ? left(sess.resetsAt, t) : 'no reading yet'}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} minWidth={26} gap={1}>
          {head('WEEKLY · 7D', week?.pct, wc)}
          <Text>
            <Text color={wc}>{'━'.repeat(wAt)}●</Text>
            <Text dimColor>{'┄'.repeat(W - 1 - wAt)}</Text>
          </Text>
          <Text tabular>{week ? left(week.resetsAt, t) : 'no reading yet'}</Text>
        </Box>
      </Box>
    )
  })
}
