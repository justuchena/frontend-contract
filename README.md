<div align="center">

# frontend-contract

**Twelve rules four production frontends already agree on, the evidence for
each, and a zero-dependency checker that holds the ones a machine can hold.**

For anyone building a frontend with an AI agent and getting back work that is
locally plausible and structurally incoherent.

[![licence: Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](package.json)
[![dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](package.json)
[![rules: 12](https://img.shields.io/badge/rules-12-blue.svg)](standard/STANDARD.md)
[![checked: 9](https://img.shields.io/badge/mechanically%20checked-9%2F12-blue.svg)](enforce/frontend-check.mjs)

</div>

---

## In one minute

```bash
git clone https://github.com/justuchena/frontend-contract
cd frontend-contract

# the checker, against a deliberately broken fixture
cd enforce/fixture && node ../frontend-check.mjs .

# then your own project
node /path/to/enforce/frontend-check.mjs ~/your-app
```

No configuration file. Nothing to turn on.

## The premise

`design-contract` answers whether an interface looks designed and tells the
truth. This answers whether it is *built* correctly, and it takes the opposite
posture on authority.

That repo is config-first on purpose: your design doc governs, and a rule that
cannot name a section of it is a preference. Which means it serves a project
that has already made decisions.

Someone building a frontend with an agent has made none. No conventions, no
data layer, no boundary — which is the whole reason the output drifts, because
a model with no specification invents one per file. So here **the standard
governs**, and there is nothing to configure.

## Why these twelve

Because I did not choose them. Each is a decision that four independently
maintained production frontends already made the same way — Mattermost,
Outline, element-web and AFFiNE read at source, cross-checked against Grafana,
PostHog and immich. Where those products disagree, this standard stays quiet:
it does not pick your state library, your import-alias convention, your file
naming or your form library, because mature teams genuinely split on all four
and a standard that rules there is expressing taste while claiming consensus.

[`standard/STANDARD.md`](standard/STANDARD.md) carries all twelve with the
evidence, the enforcement level, and what each one deliberately does not say.

Two of the twelve came from my own mistakes rather than from anyone's good
practice:

**FC-011 — a check that reports a violation exits non-zero.** My own
`audit-architecture.mjs` printed nine unenforced feature directories and three
stale zones, and exited 0. So did my `design-check.mjs` — no exit path in it at
all. Both had been decorative for as long as they had existed. The checker in
this repo rediscovered both on its first run against that tree.

**FC-006 — derive a boundary from a directory name or a tag, never from a
hand-maintained list.** The nine unenforced directories above were missing from
a per-feature array. Path-zone enforcement needs one entry per feature, so it
drifts the moment someone adds a feature. vscode's mechanism is the one to
copy: the directory *name* is the declaration, so the config does not grow
when the codebase does.

## Adoption, which is settled before the rules

A prescriptive checker that prints 500 findings on first run gets uninstalled.

```bash
# gate what you write from today; the backlog reports but does not block
frontend-check --since origin/main

# or record the backlog once, by count, and gate everything after it
frontend-check --write-baseline .frontend-contract-baseline.json
frontend-check --baseline .frontend-contract-baseline.json
```

The baseline records `file → rule → count` with **no line numbers**, so
refactoring does not churn it. That shape is Grafana's, whose own
`eslint-suppressions.json` covers 603 files across 13 rules — nine of them
Grafana's own, which is exactly what lets them ship a new hand-written rule at
`error` on day one.

## Verify it before you trust it

```bash
cd enforce/fixture && node ../frontend-check.mjs .   # expect 9 findings in 4 files
npm test                                             # asserts all of it
```

The fixture is laid out in pairs: each violation sits beside the deliberate
pattern that must stay silent. A `fetch` with an `Authorization` header is a
finding in a component and correct in the data layer, and both are in there. A
file whose copy mentions a bearer token and holds a URL in a string reports
nothing. Two catches pass — one comments what it gives up, one reports — while
the empty one fails.

Those negatives are the assertions that matter, because any regex catches the
violation and the hard part is leaving the deliberate pattern alone. Both were
learned the expensive way: the first version of the catch rule reported immich's
*correct* central error handler 182 times, and the first version of the
boundary rule read `app/store/store` as a boundary crossing and produced 7,571
findings in Grafana. If you add a rule, add a pair.

## What it found on real trees

Run at the versions checked out on 2026-10-16, after both rules above were
fixed:

| Tree | Findings | The honest reading |
|---|---|---|
| immich | 6 | A 116k-star project with excellent CI. Six direct transport calls from view code. |
| Grafana | 2,224 | 2,159 are cross-feature deep imports — real, because Grafana enforces plugin boundaries but not feature ones. This is what the baseline is for. |
| PostHog | 63 | Mostly transport reaching into view code. |
| Outline | 43 | 40 are FC-001, which is the shape of a MobX store layer calling the client directly. |

A high count is not an insult to a codebase. Grafana's enforcement engineering
is the best I read anywhere; it simply never wrote this particular rule down.

## Limits, stated plainly

Nine of the twelve rules are mechanically checked. **FC-004** (one URL owner),
**FC-007** (error boundaries at seams) and **FC-008** (no floating promises)
are not, and FC-008 is already better served by `@typescript-eslint`'s
`no-floating-promises` with `ignoreVoid: false` — use that, and this repo will
not reimplement it.

The checker reads source text with comments and string bodies masked. It has no
type information, so FC-001 sees `fetch` and `axios` but not your generated
SDK, and FC-003 is a heuristic about `useEffect` and `useState` living together.
Rules that need to know what a module *does* — whether a submit path guards
against double submission, whether a failed read renders an empty state — need
type-aware analysis and are not in this release. They are the interesting half,
and they are honestly not here yet.

Every claim in this README was run, not assumed. Where I could not verify
something I have said so.

## Install

### As a Claude Code plugin

```
/plugin marketplace add justuchena/frontend-contract
/plugin install frontend-contract
```

### As a skill, cloned

```bash
git clone https://github.com/justuchena/frontend-contract ~/.claude/skills/frontend-contract
```

### With any other agent

[`AGENTS.md`](AGENTS.md) is the short form that Cursor, Codex, Copilot and
Aider read by convention. CodeRabbit ingests it as code guidelines, so the
standard is enforced in review as well as in CI.

### As a script in a project

```json
{
  "scripts": {
    "frontend": "node ../frontend-contract/enforce/frontend-check.mjs",
    "frontend:new": "node ../frontend-contract/enforce/frontend-check.mjs --since origin/main"
  }
}
```

Node 18 or newer. No dependencies, required or optional.

## Related

[design-contract](https://github.com/justuchena/design-contract) — the same
posture applied to how an interface looks and whether it tells the truth:
tokens, grounds, contrast, type, motion, voice, the bans, and the state-honesty
rules. Two authorities, one body of work.
