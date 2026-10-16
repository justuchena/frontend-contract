# Reference codebases

Eight production frontends, read locally at a pinned SHA. Each ref records the
decisions, quotes the project's own prescriptive rules, separates what is held
by a script or a type from what is held by review, and says which of the twelve
rules in [../standard/STANDARD.md](../standard/STANDARD.md) the codebase is
evidence for. Where a project's documentation disagrees with its code, the ref
says so with the evidence, because that disagreement is the most useful thing in
any of them.

Nothing here is a recommendation. These are the trees the standard was derived
from, and the four that disagree with each other are why six of the twelve rules
are phrased as outcomes rather than mechanisms.

| Ref | What it is | Why it is in the set |
| --- | --- | --- |
| [outline.md](outline.md) | Team wiki; React 19 + MobX + styled-components, one app and its API server in one tree | Keeps session policy out of the transport layer: the 401 handler is injected into the one HTTP client from outside |
| [mattermost.md](mattermost.md) | Team messaging; React + Redux, npm-workspace monorepo with plugin-facing published packages | Publishes its own list of unsettled standards, which is what makes the rules it does state trustworthy |
| [element-web.md](element-web.md) | Matrix client; React 19, singleton stores and MVVM view models, Nx + pnpm | Treats the lint config as the arbiter: disagreeing with the linter means a PR against the lint rules, not an exception in the code |
| [affine.md](affine.md) | Local-first docs and whiteboard; React 19 + custom DI + RxJS `LiveData`, yarn workspaces + Rust | Makes the module graph you may draw exactly the one each `package.json` declares, with no hand-maintained zone list |
| grafana.md | Observability platform; large React monorepo | 23 hand-written lint rules that name the replacement symbol, and a count-only suppression baseline that prunes itself |
| posthog.md | Product analytics; React + Kea | Restricts URL-to-state syncing to the scene logic, so the URL has exactly one owner |
| immich.md | Self-hosted photo library; SvelteKit | Reaches one-client from the opposite direction, a generated SDK with one central mutation-error policy, and shows the cost of dropping barrels entirely |
| lemmy-ui.md | Link aggregator; Inferno SSR, class components, no store library | Represents every server-backed field as a four-state discriminated union, with no `isLoading` booleans anywhere |

The four rows without links are written by another author; their detail lives in
those files.

## What the set agrees on

Fifteen points of agreement came out of the audit. These are the ones that
survived into rules, or that every ref independently confirms.

**One module talks to the server, and view code does not call it.** Outline's
`ApiClient` is called only by stores; Mattermost says it in prose at
`STYLE_GUIDE.md:126` and allows bypass only with a documented reason;
element-web funnels everything through `MatrixClientPeg`; affine's module
`stores/` are the only callers of the generated `fetcher.ts`. Four
implementations, four different technologies, one shape. This is FC-001, and the
variety is why it names an outcome rather than a client.

**Base URL, auth, CSRF and status-to-error mapping live in that one module, set
once at boot.** Mattermost's 5,500-line `client4.ts` derives every route from
one `getBaseRoute()`; affine's client is generated so there is nowhere else for
it to go. FC-002.

**Server data and client state live in separate containers.** The single most
agreed point in the survey, and the only one all four state explicitly in some
form. Mattermost writes it down (`state.entities` versus `state.views`); outline
puts 35 entity stores against `UiStore` and `DialogsStore`; element-web splits
stores and view models from `SettingsStore` levels; affine separates module
`stores/` and `entities/` from React-local state. FC-003.

**Typecheck is a separate mandatory CI gate from lint.** All four, under four
names: `yarn tsc`, `make check-types`, "Typescript Syntax Check",
`yarn typecheck`. FC-005.

**A deep import into another package is a lint error whose message names the
allowed path.** element-web bans `matrix-js-sdk/src/**` with the reason in the
comment and a sibling package path with *"Please use
@element-hq/web-shared-components"*; Mattermost bans `@mattermost/*/src/*` with
*"Don't include the src folder"*; affine bans `**/src` and `**/dist` outright;
outline's one restriction names the wrapper to use instead. FC-006. Naming the
replacement, not just refusing, is the part every one of them got right.

**Error boundaries sit at interior seams and the fallback offers a way out.**
Mattermost wraps a single post and passes `clearError` to the fallback so you
retry in place; affine has ten seams at route, page and peek-view level;
element-web pairs an app-level boundary offering "clear cache and reload" with a
per-event-tile one; outline's boundary detects a stale chunk and reloads once,
guarded against looping. FC-007.

**An unhandled promise is an error, not a warning.** All four, affine strictest
at `ignoreVoid: false, ignoreIIFE: false`. FC-008.

**Generated output is committed and CI fails if regeneration changes it.** The
most reinvented check in the survey: affine's `check-git-status`, element-web's
declarative `assert-diff: true`, Mattermost's `i18n-extract:check` with its
*"To update: npm run i18n-extract"* message, and immich's version for its
OpenAPI client. FC-009. The mechanism is `git diff --exit-code`, which is why it
leads the implementation order.

**i18n strings are extracted by a tool and the extraction is verified.** Nobody
hand-edits a catalogue. Outline goes further and tells its agents not to:
*"Do not add translation strings manually; they will be extracted automatically
from the codebase."*

**Code splitting has exactly one named wrapper.** `lazyWithRetry`,
`makeAsyncComponent`, `AsyncWrapper`, module-level dynamic import. One per
repo, never two.

**Styles are co-located with the component, one file per component.**
styled-components in file, `my_component.scss` beside `my_component.tsx`,
`.module.css` beside the component, vanilla-extract `.css.ts` beside the
component. Four technologies, same placement.

**Per-directory lint overrides are how "tests and scripts are different" gets
expressed.** All four. None of them relaxes a rule globally to accommodate
tests.

**A single always-running aggregate status check is what branch protection
points at.** Outline's `ci` job carries the reasoning in a comment;
element-web's is labelled *"Dummy job to simplify branch protections"*. This is
what lets a many-gate pipeline skip irrelevant jobs without weakening the gate.

**The cheapest enforcement rides a gate that already exists.** Three of the five
most valuable checks across all eight are not tools: a `git diff --exit-code`, a
`satisfies` type riding `tsc`, and a lint `message` field that names the correct
alternative.

## Where the set splits

These are the decisions the standard deliberately does not make, and the ref
that documents each disagreement.

**State library.** MobX (outline), Redux (mattermost), none at all (element-web:
singleton stores plus MVVM over `useSyncExternalStore`), RxJS `LiveData` in a DI
container (affine), and `this.state` on a class component (lemmy-ui). Five
positions, each defended with a product-specific reason: element-web moved off
both of the popular options on purpose, affine needs offline streams. All five
agree on FC-003 and on nothing else.

**Top-level organisation.** Layer-based inside one app (outline), monorepo
packages plus folder-by-feature under `components/` (mattermost), views versus
structures in a two-level hierarchy (element-web), 70 feature modules with five
named internal layers each (affine). Each is right for its distribution model:
outline has one reader, mattermost has plugin authors, affine needs features to
be wired into a container.

**File size.** Mattermost is the only one with a numeric rule, `max-lines` at
**warn** 800, and 104 of its files exceed it. element-web constrains contents
instead ("approximately one interface, class, or enum per file"), and does not
enforce that either. affine enforces file *names* instead. Outline has nothing.
No rule.

**File naming.** snake_case (mattermost), upper camel case (element-web, written
down), kebab-case (affine, lint-enforced). Three repos, three answers, each
internally consistent.

**Import style.** Aliases (outline, affine), package names mandatory with
relative paths into packages banned (mattermost, element-web), and lemmy-ui
banning aliases outright in favour of relative imports. A genuine coin flip.

**Boundary enforcement.** None at all (outline, viable because it is one app),
project references plus targeted restrictions (mattermost), Nx graph plus knip
plus a per-directory override table (element-web), per-package declared
dependencies (affine). Only affine mechanically enforces the whole graph. FC-006
takes the outcome and affine's mechanism, and stays out of the rest.

**Dead-code detection.** element-web gates on knip and pays for it with a long
commented exception list. The other three do not try.

**Coverage.** element-web requires 80% on changed lines with a labelled escape
hatch. Mattermost collects coverage without a gate. Outline and affine have no
threshold. One repo is not consensus, so diff coverage appears in the standard's
Adoption section as a ratchet pattern and not as a rule.

**Bundle budget.** Nobody enforces a byte limit. Outline comes closest, with a
production build shipping stats to RelativeCI on every pull request, advisory.
Mattermost has a manual profiling script. The realistic rule is a reported,
reviewable budget, which is why the standard asks for a check that can fail
rather than for a number.

**Forms and validation.** The largest hole in the set. Outline has decided
(`react-hook-form` plus shared validation constants). element-web hand-rolls per
dialog. affine hand-rolls, with `react-hook-form` only in its admin package.
Mattermost publishes the gap: *"Validation & Submission Handling: Needs Review;
validation remains ad-hoc with no shared framework."* One decided repo out of
four is not evidence, so the standard says nothing, and this is where a
prescriptive standard would add the most value if the evidence ever arrives.

**Request-state representation.** Booleans from a hook (outline's
`{data, loading, loaded, error}`), a thunk returning `{data}` or `{error}`
(mattermost), ad hoc per store or view model (element-web), `LiveData` plus RxJS
operators (affine), and a four-state discriminated union used uniformly
(lemmy-ui). lemmy-ui's is the strongest of the five and it is also the only one
doing it, so there is no consensus to codify.

**Class versus function components.** Three say functional only. element-web
dissents and gives its reason: components it classifies as "structures" own
long-lived imperative lifecycles, so they use classes.

**Where the per-directory guidance lives.** One long root file (outline's
`AGENTS.md`, identical to its `CLAUDE.md`), a root file plus a style guide plus
nested `CLAUDE.OPTIONAL.md` per directory (mattermost), `code_style.md` plus
`docs/` with no agent file (element-web), `docs/CONTRIBUTING.md` plus a
`README.md` per module (affine). Mattermost's nested form puts the rule next to
the code it governs, which is the pattern I would copy, but it is one repo's
habit rather than a decision the standard should make.
