# The standard

Twelve rules. Each one is a decision that four or more independently
maintained production frontends already made the same way, so none of them is
my taste. Each carries the evidence, the enforcement level, and the thing it
is deliberately *not* saying.

Rule IDs are permanent. They exist so an error message and a suppression
comment can name a rule, not so anyone has to memorise them.

## How to read a rule

**Level** is how the rule is held, and it is the most important column:

- 🔒 **build** — a script or a type fails. The rule cannot drift.
- 🧪 **test** — a test asserts it.
- 👁 **review** — a human has to look.

The meta-rule, lifted from my own `Helios/docs/CONVENTIONS.md`: *if you can
move a 👁 to a 🔒 or a 🧪, do that instead of writing a longer rule.* Every 👁
here is a confession that I have not built the check yet.

Each rule is written as **outcome plus trigger**, never as a folder name or a
library. That phrasing was forced on me by reading a SvelteKit codebase after
drafting against React ones: four of my early rules turned out to be React
assumptions wearing universal clothing, and a standard that only works for one
framework should say so on the tin rather than in a bug report.

---

## FC-001 — One server client, and UI code does not call it

🔒 build

There is exactly one module that talks to the server. Components, pages and
view code do not import it; they go through a data layer that does.

**Evidence.** Four large products converge, and one writes the rule down
plainly — Mattermost, `webapp/STYLE_GUIDE.md:126`: *"All HTTP should use the
singleton `Client4` instance, preferably in a Redux action. In cases where it
needs to be bypassed, document the reason for that."* Outline's
`app/utils/ApiClient.ts` goes further and keeps even session policy out of
transport: the 401 handler is injected from outside, *"to keep session/logout
policy out of the transport layer."* immich reaches the same place from the
opposite direction — a generated SDK plus one central mutation-error policy —
and that combination is what lets it survive with no import rules at all.

**Not saying.** Which client. Fetch, axios, a generated SDK and a GraphQL
fetcher all pass. One of them.

## FC-002 — Base URL, auth, CSRF and error mapping live in that client, set once

🔒 build

No component, hook or feature module constructs a base URL, attaches an auth
header, or decides what an HTTP status means.

**Evidence.** Mattermost's `client4.ts` sets the token, CSRF and URL in one
place, and roughly 5,500 lines of route definitions all derive from a single
`getBaseRoute()`. Every repo surveyed that had a second place to put a base
URL eventually had two different base URLs.

**Not saying.** Where configuration comes from. Environment, runtime
discovery, a bootstrap payload — one place reads it.

## FC-003 — Server data and client state live in separate containers

🔒 build where the shape is detectable, else 👁

Data that came from the server is not copied into component state. It lives in
a cache or store that knows it is server data.

**Evidence.** The single most agreed-upon rule in the entire survey. Mattermost
states it at `STYLE_GUIDE.md:122`: *"put data that comes from the server in
`mattermost-redux` and in `state.entities`, and put web app state that needs
to be persisted outside of `mattermost-redux` and in `state.views`."* Outline
mirrors it with 36 entity stores against a separate `UiStore`. Of five
defended positions on client state across the top repos, **all five agree on
this one point** while disagreeing on everything else.

**Not saying.** Which library. Four mature products, four answers, all
defended. That choice is not mine to make.

## FC-004 — The URL is owned by the router, and synced at exactly one level

🔒 build

State that belongs in the URL — filters, pagination, tabs, the selected
thing — is read from and written to the URL, at the route level only. No
mirroring it into a store, and no second component also syncing it.

**Evidence.** Only two surveyed repos write a URL-state rule at all, and both
independently say *one level*: Supabase via `nuqs`, PostHog by restricting
`urlToAction` to the scene logic. affine states the principle directly — the
URL of the active view is the URL of the application.

**Not saying.** That everything belongs in the URL. Only that whatever does
has one owner.

## FC-005 — Typecheck is a separate mandatory gate from lint

🔒 build

`tsc --noEmit` (or the framework's equivalent) runs in CI as its own step, and
failing it blocks the merge.

**Evidence.** All four locally audited products do this, and so does immich
(`svelte-check --fail-on-warnings` *and* `tsc --noEmit`). The counter-example
is what makes it a rule rather than an observation: a sibling of mine shipped
with no `typecheck` script at all and a bare build, and the defects that
reached its users were of a kind the compiler would have named.

**Not saying.** Strict mode on day one. A baseline is allowed; see Adoption.

## FC-006 — A deep import into another module's internals fails, and the error names the allowed path

🔒 build

Crossing into another feature or package means importing its declared entry
point. The failure message must name the correct import, not merely refuse.

**Evidence.** element-web bans `matrix-js-sdk/src/**` with the reason in the
message — *"to prevent unleashing hell"* — and bans a sibling package path
with *"Please use @element-hq/web-shared-components"*. Grafana blocks
`@grafana/ui/src/*` while allowing `@grafana/ui`, and nearly every one of its
23 hand-written rules names the replacement symbol and import path. Grafana's
`no-get-data-source-srv` even carries the migration issue URL.

**The mechanism matters more than the rule**, and this is the one place my own
code is the cautionary tale. Path-zone enforcement needs one config entry per
feature, and in my own `Helios` that list drifted: `scripts/audit-architecture.mjs`
reports nine feature directories absent from it and three pointing at
directories that no longer exist. So: derive the boundary from the directory
name or from a tag, never from a hand-maintained list. vscode's approach is the
cleanest — the directory *name* is the declaration, so the config does not grow
when the codebase does. Grafana's plugin rule parses the plugin root out of the
filename with one regex and is inert everywhere else.

**Not saying.** That barrels are required. One barrel per feature at the
feature root is fine; a barrel per directory for import convenience is what
PostHog and Supabase ban, and immich dropped barrels entirely (2 `index.ts` in
730 files) and accepted having no boundary. Deep imports plus this check gives
encapsulation without the bundle cost.

## FC-007 — Error boundaries sit at interior seams, with a recovery action

🔒 build

Every seam whose failure mode differs from its parent's declares its own error
UI, and that UI offers a way out — retry, reload, dismiss — not just an
apology.

**Evidence.** Mattermost wraps per *post* and per *plugin*, passing
`clearError` to the fallback so recovery happens in place. affine has roughly
ten such seams. Outline's boundary detects a stale-chunk error and reloads
once, guarded against repeating. And the anti-rule is as valuable as the rule,
from my own `Helios` conventions: *not around every leaf, because that turns
one failure into a page of small apologetic boxes.*

**Framework note.** "A boundary at each feature root" is a React phrasing. In a
file-routed framework the equivalent is a per-route error page — immich uses
`routes/+error.svelte` and segment-level overrides. The outcome is the rule;
the mechanism is the framework's.

## FC-008 — An unhandled promise is an error

🔒 build

Floating promises fail the build. Not a warning.

**Evidence.** All four, with affine strictest: `no-floating-promises` with
`ignoreVoid: false, ignoreIIFE: false`. Google's internal finding is the
reason for the severity rather than the rule — they enable cleaned-up checks
as errors because developers ignore warnings.

## FC-009 — Generated artifacts are committed, and CI fails if regeneration changes them

🔒 build

Anything generated — an API client, a type file, a translation catalogue, a
route manifest — is committed, and a CI step regenerates it and fails on a
diff.

**Evidence.** The most widely reinvented check in the survey. affine's
`check-git-status` runs every generator then fails if `git status --porcelain`
is non-empty, with the error naming the exact command to run. element-web's
declarative version is nicer: `assert-diff: true`. Mattermost does it for i18n
extraction, printing *"en.json is out of sync with code. To update: npm run
i18n-extract"*. immich does it for its OpenAPI client and again for i18n.

**Why it leads the implementation order.** The mechanism is `git diff
--exit-code`. It needs no AST, no types and no new tool, and it is the clearest
case of the general lesson from reading these repos: **the cheapest
enforcement rides a gate you already have.** Three of the five most valuable
checks found across all of them are not tools at all — a `git diff`, a
`satisfies` type riding `tsc`, and a lint message that names the alternative.

## FC-010 — A catch either reports, or carries a comment saying what is lost

🔒 build

Swallowing an error silently fails. Swallowing it deliberately, with a comment
stating what is being given up, passes.

**Evidence.** This rule exists in this shape because the obvious version was
wrong. In my own `Helios`, 209 bare `catch` blocks against 9 `reportError`
calls looked like mass violation; reading them showed they were almost all
`localStorage`, `Intl` and pointer-capture calls with the loss already
documented in a comment. A grep-derived rule would have flagged 200 correct
lines. The narrower rule is both true and checkable.

The independent receipt: a 50-project cross-language study found **29% of
exception handlers empty in its ten JavaScript projects — the worst of any
language studied.** And it reaches good codebases: immich, which has an
excellent central error handler used at 178 call sites, still swallows its
entire auth-refresh and logout paths in bare `catch { /* noop */ }` with no
logging.

## FC-011 — A check that reports a violation exits non-zero

🔒 build

If a script prints a finding, it fails. A reporting-only mode must be an
explicit flag, never the default.

**Evidence.** This is the rule I needed most and had broken myself.
`Helios/scripts/audit-architecture.mjs` prints nine unenforced feature
directories, three stale zones, five orphaned modules — and exits 0. Wiring it
into CI would have changed nothing, which means the check had been
decorative for as long as it had existed.

The same failure, written down by somebody else first, in Grafana's CI:
*"`css:probe` was written on 2026-08-31 and was never wired in, so it only ran
when somebody remembered — which is the same failure mode as a design
document."*

A check that cannot fail is documentation wearing a script's costume.

## FC-012 — The check that gates the build is itself tested, in the same job

🧪 test

A script that can block a merge has tests, and they run before it is trusted.

**Evidence.** Grafana and tldraw arrived at this independently. Grafana's
bundle-size job runs `node --test scripts/cli/checkBundleSize.test.mjs` before
using `checkBundleSize.mjs`, and the test pins the boundary condition — a
change of exactly the limit passes, because the comparison is strictly
greater. That detail is only knowable because the test exists.

---

## Adoption

A prescriptive checker that prints 500 findings on first run gets uninstalled,
so this is settled before the rules are.

**New code is the gate by default.** The existing backlog reports; it does not
block until you ask it to. Sonar ships new-code-only as the read-only default,
and that default *is* the ratchet.

**The baseline records counts, not positions.** Grafana's
`eslint-suppressions.json` is `file → rule → {count}` with no line or column,
across 603 files and 13 rules — so refactoring does not churn it, and nine of
those 13 rules are Grafana's own, which is precisely what lets them ship a new
hand-written rule at `error` on day one.

**The baseline prunes itself.** `lefthook.yml` runs `eslint
--prune-suppressions --fix` on staged files and re-adds the file, and
CODEOWNERS assigns it to a bot so it never enters review. Debt shrinks as a
side effect of ordinary work.

**`--fix` first, suppress only the residue.** That ordering is in ESLint's own
recommended bulk-suppression command and in `cargo fix --edition`. It is what
keeps a baseline small enough to burn down.

**The baseline suppresses CI failure, not editor feedback.** Android Lint's
`baseline.xml` is the oldest implementation of this and it is the best single
idea in the survey: the developer still sees the violation in the file they
have open, so the build stays green while the debt still gets noticed.

**One named rule per policy.** Grafana generates 13 of its 23 rules from
configuration for exactly this reason, stated in the file: *"This gives them
individual rule names for suppression and reporting."* Retrofitting rule
identity is painful, so it is here from the start.

**Nobody is judged on code they did not write.** Vendored, generated,
`node_modules` and declared legacy subtrees are exempt by policy, not by
per-file suppression. Rust's `--cap-lints allow` is the model.

**A versioning promise, before v1.** New rules land in preview for at least one
minor release; changes batch; the bundle is named with a year. Rust's editions
work because the name carries the year. TypeScript's `strict` is the
counter-example and admits it: an unversioned opt-in whose meaning changes
underneath you, so a routine upgrade can produce a cliff. A zero-config tool
owes this promise more than a configurable one does, because its users have no
config surface to work around it with.

## What this standard is not

It does not choose a state library, an import-alias convention, a file-naming
case, or a form library. Those are places where mature products genuinely
disagree, and a standard that rules on them is expressing taste while claiming
consensus. Vue's style guide has the best one-line defence of ruling anyway
where it *is* arbitrary — *"where multiple, equally good options exist, an
arbitrary choice can be made to ensure consistency"* — and that defence
applies to formatting, not to architecture.

It does not cover how an interface looks, whether it tells the truth in its
copy, or whether its contrast is legible. That is
[design-contract](https://github.com/justuchena/design-contract), which governs
tokens, grounds, contrast, type, motion, voice, the bans and state honesty.
This repo governs how the thing is built. Two authorities, one body of work.

It does not claim to measure AI-authored frontends. No such study exists —
every AI-code dataset is language-general or weighted to Java and C++, there is
no peer-reviewed work on Hooks misuse, and none on frontend state defects. I am
filling an evidence vacuum and would rather say so than dress it up.
