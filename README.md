<div align="center">

# frontend-contract

**Twelve rules four production frontends already agree on, the evidence for
each, and a zero-dependency checker that holds all twelve.**

For anyone building a frontend with an AI agent and getting back work that is
locally plausible and structurally incoherent.

[![verify](https://github.com/justuchena/frontend-contract/actions/workflows/verify.yml/badge.svg)](https://github.com/justuchena/frontend-contract/actions/workflows/verify.yml)
[![licence: Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](package.json)
[![dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](package.json)
[![rules: 12](https://img.shields.io/badge/rules-12-blue.svg)](standard/STANDARD.md)
[![checked: 12](https://img.shields.io/badge/mechanically%20checked-12%2F12-blue.svg)](enforce/frontend-check.mjs)
[![references: 8](https://img.shields.io/badge/references-8-blue.svg)](refs/INDEX.md)

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

**FC-011 — a check that reports a violation exits non-zero.** This one is in the
standard despite having no verified instance, and the story is in
[`standard/STANDARD.md`](standard/STANDARD.md#fc-011--a-check-that-reports-a-violation-exits-non-zero):
I believed two of my own checkers were decorative, because I measured their
exit codes through a pipe and read `tail`'s status instead of theirs. Both are
correct. The rule ships because the failure is cheap to detect and expensive to
have, and because trusting a green number I had not measured properly is the
same mistake one level up.

**FC-006 — derive a boundary from a directory name or a tag, never from a
hand-maintained list.** The nine unenforced directories above were missing from
a per-feature array. Path-zone enforcement needs one entry per feature, so it
drifts the moment someone adds a feature. vscode's mechanism is the one to
copy: the directory *name* is the declaration, so the config does not grow
when the codebase does.

## The references

[`refs/`](refs/INDEX.md) is eight production frontends read at source and
written up to one template, so they are comparable: Mattermost, Outline,
element-web, AFFiNE, Grafana, PostHog, immich and lemmy-ui. Each ref records
the decisions, the rules the project wrote down verbatim, how each decision is
actually held (script, type, test or review), which of the twelve rules the
codebase is evidence for, and what I did not take from it.

The useful parts are the disagreements and the places a project's own
documentation is wrong about the project. A few examples of what is in there:

- **lemmy-ui** carries a four-state union across 36 files and has **zero**
  occurrences of `isLoading`. It also has only 3 `case "failed"` branches
  against 38 guards, so the union's guarantee is that failure cannot be
  *mistaken* for emptiness, not that failure is rendered. The ref says so.
- **immich** is not the layer-folder counter-example it looks like: layer at
  depth one, feature at depth two, and 101 non-route files co-located inside
  `routes/`. It has no mechanical import boundary at all and a measurably clean
  graph, and `CODEOWNERS:4` explains why: one owner for 730 files.
- **Grafana** generates 13 of its 23 lint rules from configuration so each
  policy gets its own rule name, for suppression and reporting.
- **lemmy-ui** runs `tsc --noEmit` inside its `lint` script, which is the
  counter-example for FC-005: a typecheck that cannot fail on its own.

Where a sparse checkout meant a claim could not be verified, the ref says which
directory was missing rather than inferring.

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
| immich | 6 | A 116k-star project with excellent CI. Six direct transport calls from view code, and nothing else. |
| Outline | 45 | 40 are FC-001, which is the shape of a MobX store layer calling the client directly. |
| PostHog | 87 | Transport reaching into view code, and 19 failed reads that can render as empty. |
| Grafana | 2,228 | 2,159 are cross-feature deep imports: real, because Grafana enforces plugin boundaries but not feature ones. This is what the baseline is for. |

A high count is not an insult to a codebase. Grafana's enforcement engineering
is the best I read anywhere; it simply never wrote this particular rule down.

## Limits, stated plainly

All twelve rules are checked, but three are checked narrowly and you should
know how before you trust them.

**FC-008 is delegated, not implemented.** `@typescript-eslint`'s
`no-floating-promises` with `ignoreVoid: false` already does this properly, with
type information this checker does not have. So the check here is whether your
linter has the rule turned on, and the message says as much. I will not
reimplement it worse.

**FC-004 covers URL state, not navigation.** It reports `setSearchParams`,
`history.replaceState` and a query-string assignment from outside a route. It
deliberately says nothing about `goto` or `router.push`, because navigating is
not owning: the first version flagged 68 legitimate `goto` calls in immich
before I narrowed it.

**FC-007 only looks at routes.** A `Suspense` in a leaf whose error boundary
sits in a parent is correct, and flagging it produced 44 findings in PostHog
and 12 in Outline. So the rule asks the narrower question: does a route declare
a pending state and leave the failed one unanswered.

More generally: the checker reads source text with comments and string bodies
masked, and it has no type information. FC-001 sees `fetch` and `axios` but not
your generated SDK. FC-003 is a heuristic about `useEffect` and `useState`
appearing together. The rules that need to know what a module *does* — whether a
submit path guards against double submission, whether a success state was caused
by a verified response — are in
[`standard/NEXT.md`](standard/NEXT.md) with their evidence, and they are not in
this release. They are the interesting half and they are honestly not here yet.

Every claim in this README was run, not assumed. One of them was wrong and is
corrected in place: see FC-011 above.

## Install

### As a Claude Code plugin

```
/plugin marketplace add justuchena/frontend-contract
/plugin install frontend-contract
```

The loader scans a plugin's `skills/` directory and ignores a `SKILL.md` at
the root, so [`skills/frontend-contract/SKILL.md`](skills/frontend-contract/SKILL.md) is derived from the
root copy by [`enforce/derive-skill.mjs`](enforce/derive-skill.mjs), with its paths repointed and a
staleness check in `npm run verify`. Edit the root one.

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

## This repo under its own standard

`npm run verify` runs the checker's tests, the staleness check on the plugin's
skill copy, and the repo against all twelve rules. CI runs it on every push
and pull request across Node 18, 20, 22 and 24, and asserts the fixture's exit
status without a pipe — reading a pipeline's status is how a false receipt got
into the standard once already.

The findings this repo keeps on purpose are in `enforce/self-baseline.json`:
the fixture's one per rule, plus FC-005 on `package.json`, which fires because
the fixture's `.tsx` files live inside a repo that has no TypeScript of its
own. Writing that file found one real violation in the checker itself — an
empty `catch` with no comment, which is FC-010 — and it is fixed rather than
baselined.

[`CONTRIBUTING.md`](CONTRIBUTING.md) has the bar for a thirteenth rule: four or more
independently maintained production frontends that already do it, named by
file and line.

## Related

[design-contract](https://github.com/justuchena/design-contract) — the same
posture applied to how an interface looks and whether it tells the truth:
tokens, grounds, contrast, type, motion, voice, the bans, and the state-honesty
rules. Two authorities, one body of work.
