# Usage Band

A Claude mod that keeps a **Usage** panel beside the chat with three live meters:

- **Context**: tokens in the current chat against the model's context window
- **Session · 5H**: the 5-hour usage limit, with a countdown to its reset
- **Weekly · 7D**: the 7-day usage limit, with a countdown to its reset

Bars turn amber at 75% and red at 90%. The numbers come straight from Claude, so there is nothing to type in. Session and weekly readings appear after Claude's first reply in a chat, and only on a subscription plan. Run `/usage-band` to hide or show the panel.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install usage-band --marketplace Amumtaz427/claude-usage-band
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install usage-band --marketplace Amumtaz427/claude-usage-band
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Amumtaz427/claude-usage-band`, then **Add plugin**.
