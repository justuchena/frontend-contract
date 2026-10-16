# PostHog

> PostHog is a product-analytics platform whose web app is one React tree over
> a Django monolith and a set of per-product frontends.
> This ref exists because PostHog decided *honesty about enforcement* better
> than anyone else: every written rule carries a tag saying whether a machine
> catches a violation or only a reader does.

**Stack.** React with TypeScript; kea for state, with `kea-typegen` generating
inline logic types (`.kearc`); kea-forms for forms (`frontend/package.json:243`,
used in 90 files under `frontend/src`); one hand-written `lib/api.ts` as the
server client; Tailwind utilities plus a `LemonUI` component set; oxlint and
oxfmt in place of ESLint and Prettier; pnpm workspaces across 26 globs
(`pnpm-workspace.yaml`), with `products/desktop` explicitly excluded; `tach` for
the Python module graph.

**Scale.** 6,375 files under `frontend/src`, of which 5,888 are `.ts`/`.tsx`,
and 1,221,850 lines in those. Largest file by `wc -l`:
`frontend/src/lib/components/MarkdownNotebook/MarkdownNotebook.test.ts` at
10,237; then `frontend/src/queries/schema/schema-general.ts` at 9,457,
`frontend/src/types.ts` at 8,298 and `frontend/src/lib/api.ts` at 7,328. The
clone is sparse and depth-1, so I cannot read contributor counts or commit
cadence from it; the HEAD commit date is the only recency signal I have.

**Read at.** `3e00484f67436f2565b52a9caa3d2b593984eaee`, 2026-10-16
(`chore(devex): make devex required codeowner of agent and pr instructions
(#118459)`), read 2026-10-16. Sparse checkout: `frontend/src`, `.github`, `bin`,
root configs. The budget scripts under `frontend/bin/` are outside it, so where
a gate's threshold lives in one of those scripts I describe only the workflow
that runs it.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | A product's UI lives in `products/<name>/frontend/`, not in `frontend/src/scenes/`; app-level scenes stay in `scenes/` | `frontend/src/AGENTS.md:38-40` |
| Code ownership of placement | A product is scaffolded, never hand-rolled, and the scaffold is linted | `AGENTS.md:174` (`[lint: hogli product:lint --all]`) |
| Data layer | Django serializers are the source of truth; types and API functions are generated into `frontend/src/generated/core/` | `AGENTS.md:197`, `frontend/src/AGENTS.md:50-60` |
| Server client | One `frontend/src/lib/api.ts` (7,328 lines), with `ApiRequest` as the builder (`:488`) | `.oxlintrc.json:311` bans `lib/api` from the toolbar and names the alternative |
| State split | Two layers: a `*Logic.ts` kea file holds actions, reducers, selectors and listeners; the component is an entrypoint | `AGENTS.md:234` and `:173`, `frontend/src/AGENTS.md:62-64` |
| URL state | `urlToAction`/`actionToUrl` in the scene's logic. 130 files under `frontend/src` reference `urlToAction` and 122 of them are logic files | measured, not written down; the restriction is a convention |
| Module boundaries | `no-restricted-imports` overrides per boundary, with a named companion script when the rule cannot see transitively | `.oxlintrc.json:297` and `:301`; `frontend/bin/check-toolbar-graph.mjs` |
| Barrels | Banned for new code, with the reason given as graph size | `frontend/src/AGENTS.md:70`; `.oxlintrc.json:126` |
| Error handling | `RootErrorBoundary` plus a `ChunkLoadErrorBoundary` that reloads once on a stale-deploy chunk mismatch and re-throws non-chunk errors | `frontend/src/RootErrorBoundary.tsx`, `frontend/src/scenes/ChunkLoadErrorBoundary.tsx:13-21` |
| Loading and empty | Three separate screens, never derived from one another | `frontend/src/AGENTS.md:73` |
| Forms | kea-forms, plus a double-submit rule stated across all three trigger shapes | `AGENTS.md:235` |
| File naming | One component per file, named after its export, named exports only, exactly one import path per symbol | `frontend/src/AGENTS.md:70` |
| Code splitting | A scene registry of `() => import(...)` thunks | `frontend/src/scenes/appScenes.ts:8-10` |
| Typecheck | Its own CI job, `pnpm --filter=@posthog/frontend typescript:check` run with tsgo | `.github/workflows/ci-frontend.yml:787-788,859-860` |

## What they wrote down

The convention that makes the rest of the document readable
(`AGENTS.md:166-168`):

> "Each rule is tagged with what catches a violation.
> `[lint: <id>]` means a linter, semgrep rule, or invariant test blocks it, so CI is the check and this text is only the reasoning.
> `[review]` means nothing catches it automatically — a reader is the only control."

The ladder that follows from it, with prose ranked last (`AGENTS.md:278-283`):

> "When automating a convention, try these in order — only fall back to the next if the previous isn't suitable:
> 1. **Linters** (ruff, oxlint, semgrep) — code pattern enforcement, always paired with CI
> 2. **lint-staged / husky** — file-level validation or warnings at commit time
> 3. **Skills** (`.agents/skills/`) — scaffold with `hogli init:skill`
> 4. **AGENTS.md / CLAUDE.md instructions** — when automated enforcement isn't suitable"

The two-layer state rule, tagged as unenforced
(`AGENTS.md:234`):

> "**TypeScript with explicit return types. Business logic goes in the kea logic file, not a React hook.** `[review]`"

and the discovery hint in the tree-local file
(`frontend/src/AGENTS.md:62-64`):

> "## Rule 4 — Business logic in kea, not React hooks
> Covered by the root `AGENTS.md` (Code Style → Frontend). The discovery hint for this tree: if a scene/component has a `*Logic.ts`, that's where actions/reducers/selectors/listeners belong."

What the component is allowed to be (`AGENTS.md:173`):

> "**Keep entrypoints thin.** `[review]` The runtime calls the entrypoint first: a DRF view, a management command `handle()`, a Celery task body, an HTTP handler, a Rust `main()`, a React component. An entrypoint reads the input, connects the dependencies, and formats the output. All other logic goes in a function the entrypoint calls, so a test can call it directly."

The anti-rules. First, on deriving one state from another
(`frontend/src/AGENTS.md:73`):

> "**Loading, empty, and error are three different screens.** Never derive "empty" from data that hasn't resolved — branch on the loading/unknown state first."

Second, on hand-written API types (`frontend/src/AGENTS.md:50-52`):

> "## Rule 3 — Don't handwrite API types; use the generated ones
> Django serializers are the source of truth. `hogli build:openapi` generates TypeScript types (suffix `Api`) and API functions. **Never write an `interface` that mirrors a backend serializer** — import the generated type instead."

Third, on renaming (`frontend/src/AGENTS.md:74`):

> "**Renames sweep code symbols completely; wire strings stay frozen.** Event names, property names/values, flag keys, `data-attr` values, storage keys, and URL paths are API (dashboards, rollouts, and Playwright depend on them) — pin them with a comment instead of renaming."

Fourth, on building a component at all (`frontend/src/AGENTS.md:5-7`):

> "**Before building any UI element, search for an existing one.** PostHog already has a badge, a label, a table, a tag, a card, a modal. Hand-rolling one with raw `<div>`/`<table>` + Tailwind is the single most common agent mistake here, and it produces unbounded, off-design output."

Fifth, and the one I have not seen anywhere else, a refusal rather than a
requirement (`frontend/src/AGENTS.md:76-87`, Rule 6):

> "**Do not build for mobile.** No phone-width layouts, no touch-sized targets, no `sm:` variants for a viewport nobody runs the app at. "Narrow" means a docked panel on a laptop."

with the arithmetic that justifies it:

> "the nav sidebar takes ~215px, an open side panel ~512px more, and the scene pads 32px on top. So a 1280px window with the side panel open leaves a scene about 520px wide — narrower than a `md:` breakpoint ever fires at."

The double-submit rule, enumerated across every shape that can fire a request
(`AGENTS.md:235`):

> "**Guard every network-triggering button against double submission.** `[review]` Disable it and show a loading state (`loading` / `disabledReason` on `LemonButton`, or equivalent) while the request is in flight, and reset in both the success and error paths. Applies to `<form onSubmit>`, any `onClick` that calls `api.*`, and any kea `listener` that issues a request."

Import bans that quote their own cost (`.oxlintrc.json:104`, `:126`, `:96`):

> "Value imports of monaco-editor statically couple ~4 MB of editor code into your chunk. Use `import type`, or render via the lazy facade in lib/monaco/CodeEditor."

> "Import the per-asset stub instead: import * as name from '@posthog/brand/hoggies/png/<name>'. The barrel pulls every hoggie's stub into the graph."

> "Do not directly import dayjs. Only import the dayjs exported from 'lib/dayjs'."

And the boundary message that names its own companion checker
(`.oxlintrc.json:297`, `:301`):

> "The toolbar ships to customer pages and must not depend on app scenes. Import from lib/, or fetch via toolbarFetch. The listed exceptions are the toolbar's intentional seams; the full transitive boundary is enforced by frontend/bin/check-toolbar-graph.mjs."

> "The toolbar must not import product manifests or product frontends — that pulls the whole product graph into the customer-facing bundle."

`AI_POLICY.md` regulates evidence and attribution rather than volume:

> "**Prove it works.** Before submitting, please verify the change actually works end-to-end — don't rely on "it compiles" or "tests pass" alone.
> - **Frontend changes:** include a short demo (screenshot, screen recording, or GIF) of the feature working in the PR description. Ideally you demo more than just the happy path.
> - **Backend changes:** add tests for new behavior, and describe your test strategy in the PR description: what you tested, how you tested it, and what edge cases you considered.
> PRs that clearly weren't run or tested will be closed under this policy." (`AI_POLICY.md:12-18`)

> "**Prefer PRs over AI-generated issues.** If AI helped you find a bug, fix it and open a pull request — don't paste the AI's output into an issue. Unreviewed, AI-generated bug reports and security disclosures will be closed without response." (`:25-27`)

> "- **First time:** We'll close the PR/issue with a link to this policy and a brief explanation.
> - **Two or more closures:** We'll block the account." (`:35-36`)

> "We think the best contributions in 2026 often involve AI. … **The key difference is that they're driving the AI, not the other way around.**" (`:40-44`)

## How it is held

**By a script, blocking.** `pnpm --filter=@posthog/frontend typescript:check` is
its own job (`ci-frontend.yml:787-788,859-860`) and is one of the results the
aggregate gate checks (`:1307`). Three toolbar gates run against the PR build
before the base rebuild overwrites `dist/`: a size check against the CloudFront
gzip limit, the transitive graph check, and a CSP `eval` check
(`ci-frontend.yml:621-631`).

**By a script, advisory.** The duplication limiter is the interesting one, and
it is deliberately not a wall. `bin/lint-duplication.limits.json` is three lines:

> ```json
> {
>     "production": 70,
>     "test": 150
> }
> ```

Units are jscpd tokens. `bin/lint_duplication.py` scans two detached git
worktrees, `HEAD` and the merge-base, with identical flags, then diffs the clone
sets itself rather than using jscpd's own baseline. A clone's identity is
`(frozenset(firstFile, secondFile), sha256(fragment))` (`:155-164`), so edits
elsewhere in the two files do not re-flag an old clone, and a `Counter` of
baseline keys is decremented as matches are found so a third copy of an already
duplicated fragment counts as new. The bar is the test limit only when both
sides are test files. Exit 1 on a finding, exit 2 reserved for "could not run",
and a status sentinel is written as `{"status":"failed"}` before the scans and
rewritten to `ok` only after both succeed.

And then the job declines to block (`.github/workflows/ci-duplication.yml:52-53`):

> ```yaml
>             - name: Lint for new duplication
>               # Keep the job successful while GitHub marks this failed step as a warning.
>               continue-on-error: true
> ```

So the number is real, the mechanism is careful, and the gate is a warning. The
complexity limiter is the same shape and says so in its own header: findings are
warnings and the check never fails a job, "advisory while the pre-existing
backlog settles". Its limits file is
`bin/lint-complexity.limits.json`: `{"production": 10, "test": 15}`, read by both
the Python and the JavaScript implementation so the two cannot drift.

**By a type.** `kea-typegen` writes a `MakeLogicType` block above each `kea()`
call (`.kearc`, `"inline": true`), so a logic whose selectors do not line up
fails typechecking rather than review, and a stale regeneration shows up as a
diff.

**By review only.** Both halves of the two-layer state rule are tagged
`[review]` (`AGENTS.md:234`, `frontend/src/AGENTS.md:62-64`). So is thin
entrypoints (`:173`) and so is double-submit guarding (`:235`). Nothing checks
whether logic sits in the logic file; what is checked is the doors, by path, in
`.oxlintrc.json`, and the symptom, by the complexity limiter.

## What I took from it

- **FC-004** (the URL is the router's, synced at one level). PostHog is one of
  only two surveyed repos that restricts URL syncing at all, and the shape of it
  is measurable here: 122 of the 130 `urlToAction` sites are logic files.
- **FC-003** (server data and client state in separate containers). The
  two-layer kea rule is the clearest written statement of the split, and the
  fact that it is tagged `[review]` is what pushed FC-003's level to "build
  where the shape is detectable, else review".
- **FC-009** (generated artifacts committed, CI fails on a diff). The generated
  API types, with three named enforcement ids in the tag at `AGENTS.md:197`.
- **FC-006** (deep imports fail, error names the allowed path). The negated
  allowlist entries inside a banned group, used to encode named seams, and the
  message that points at the companion script for the transitive case.
- **FC-011** (a check that reports exits non-zero). PostHog is the honest
  counter-example as much as the evidence: the duplication gate reports properly
  and then sets `continue-on-error: true`, which is exactly the state FC-011
  asks you to label rather than hide. A reporting-only mode is fine; it has to
  be chosen on purpose.
- **The enforcement-level column in the standard.** `🔒 / 🧪 / 👁` is PostHog's
  `[lint: <id>]` versus `[review]` with different glyphs, and the meta-rule
  about moving a 👁 to a 🔒 is their automation ladder compressed to one line.

## What I did not take, and why

**kea.** Four mature products, four state answers. FC-003 rules on the split and
not the library.

**The duplication and complexity numbers.** 70 tokens and complexity 10 are
policy figures for one codebase's taste, and PostHog itself ships both
warn-only. I took the two-bar shape into the Adoption reasoning and left the
numbers out of the rules.

**Rule 6, the responsive position.** "Do not build for mobile" is correct for an
internal analytics console and wrong for most products. Mature products
disagree, so the standard stays quiet on breakpoints, and the layout half of the
question belongs to design-contract anyway.

**One component per file, and named exports only.** Defensible, and immich does
not do it the same way; Grafana writes a different naming scheme at
`contribute/style-guides/frontend.md:82-98`. File naming is on the explicit
not-deciding list.

**Rule 7, the bare-text-node crash.** A real and well-documented React failure
class (`frontend/src/AGENTS.md:89-116`), but it is React-renderer specific and
has no equivalent on a compiled framework, so a rule written as outcome plus
trigger could not phrase it portably.

**The `[lint: <id>]` tag as a literal convention.** I adopted the idea and not
the syntax, because the standard's rules have permanent IDs of their own and two
ID systems in one sentence would be worse than one.
