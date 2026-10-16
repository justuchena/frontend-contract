# element-web

> element-web is the Element Matrix client: a React app in an Nx/pnpm monorepo
> alongside its desktop shell, shared component package and environment modules.
> This ref exists for one decision: element-web treats the lint config as the
> arbiter of its style guide, so a disagreement with the linter is a pull
> request against the lint rules rather than an exception in the code.

**Stack.** React 19 with no state library: singleton stores plus MVVM view
models over `useSyncExternalStore`. `matrix-js-sdk` is the data layer. Vite and
Vitest (browser mode via Playwright) with Jest still present, oxlint and oxfmt,
PostCSS and `.module.css`, pnpm workspaces with a dependency catalog, Nx as the
task graph, knip for dead code, Storybook for the shared components package.

**Scale.** 3,272 `.ts`/`.tsx` files across `apps/`, `packages/` and `modules/`,
2,136 of them under `apps/web/src`, 370,583 lines. 44 files in
`apps/web/src/stores`, 75 non-test files under `apps/web/src/viewmodels`.
Largest by `wc -l`: `apps/web/src/components/structures/RoomView.tsx` 2,750,
`MatrixChat.tsx` 2,325, `MatrixChat.test.tsx` 2,065, `TimelinePanel.tsx` 1,929,
`apps/web/src/viewmodels/room-list/RoomListViewModel.test.ts` 1,908. Test files
sit in the top five, which is unusual in this set. Contributors signal is
unavailable: my clone is shallow.

**Read at.** `5efdc33`, committed 2026-09-04. Verified 2026-10-16.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | `apps/`, `packages/`, `modules/`, each with a stated publishing contract | `docs/monorepo.md:11-24` |
| What a directory means | `apps` not published, lock-step versions; `packages` published, SemVer, independent | `docs/monorepo.md:12-19` |
| Structure inside the app | Two-level: view or structure, then functional grouping | `code_style.md:224` |
| File contents | Approximately one interface, class or enum per file, name matching | `code_style.md:175-177` |
| Components per file | One, plus unexported utility components for the primary one | `code_style.md:231-232` |
| Exported constants | Must not share a file with a component or store | `code_style.md:233-234` |
| Data layer | No HTTP client; one singleton peg around `matrix-js-sdk` | `apps/web/src/MatrixClientPeg.ts:59-60` |
| SDK surface | Deep imports into the SDK are banned; only `matrix-js-sdk/src/matrix` and a short allowlist | `oxlint.config.ts:384`, `:405-434` |
| Stores | Singleton with a static instance, must accept an alternative client and dispatcher | `code_style.md:235`, `:252` |
| Store coupling | Interdependence minimised; break shared pieces out to utilities | `code_style.md:255` |
| View logic | In a ViewModel class whose interface the **view** declares | `docs/MVVM.md:41-42`, `:93`, `:102` |
| Naming of MVVM artifacts | A five-row table: `FooView`, `FooViewSnapshot`, `FooViewActions`, `FooViewModel`, `FooViewModel.ts` | `docs/MVVM.md:27-32` |
| Settings placement | A layered handler stack, so each preference declares its level | `apps/web/src/settings/handlers/` |
| Window geometry | Centralised in `UIStore`; direct `window.innerWidth` etc. banned | `oxlint.config.ts:373-377` |
| Media URLs | Centralised in `Media`; `mxcUrlToHttp` and `getHttpUriForMxc` banned | `oxlint.config.ts:378-381` |
| Sibling packages | Entered by package name only; relative paths into them banned | `oxlint.config.ts:495-497` |
| Event emitters | `events` banned app-wide in favour of `TypedEventEmitter` | `oxlint.config.ts:392` |
| React 19 migration | `forwardRef` banned by lint, not by documentation | `oxlint.config.ts:26` |
| Platform split | `Buffer` and `process.env` banned in web source, inverted for desktop and scripts | `oxlint.config.ts:297`, `:300`, `:359` |
| Error handling | App-level boundary with clear-cache recovery, plus a tile-scoped one | `apps/web/src/components/views/elements/ErrorBoundary.tsx`, `packages/shared-components/src/room/timeline/event-tile/EventTileView/` |
| Cleanup | A documented `disposables` abstraction owned by whoever constructed the model | `docs/MVVM.md:168`, `:172` |
| Forms | Hand-rolled per dialog; no form library in the dependency tree | 29 `onSubmit` handlers across `components/views/dialogs/*.tsx` |
| Code splitting | `apps/web/src/AsyncWrapper.tsx` plus `apps/web/src/async-components/{structures,views}` | directory |
| File naming | Upper camel case for component source files | `code_style.md:223` |
| Class vs function | Hooks preferred, except for "structures", which use classes | `code_style.md:264-266` |

## What they wrote down

`code_style.md:22-30`, the coding practices, which are the reason this ref
exists:

> 1. Lint rules enforce decisions made by this guide. The lint rules and this
>    guide are kept in perfect sync.

> 3. When there is disagreement with a code style approved by the linter, a PR
>    is opened against the lint rules rather than making exceptions on the
>    responsible code PR.
> 4. Rules which are intentionally broken (via eslint-ignore, @ts-ignore, etc)
>    have a comment included in the immediate vicinity for why. Determination of
>    whether this is valid applies at code review time.

`code_style.md:175-177`, the file-contents rule they chose instead of a line
limit:

> 30. There should be approximately one interface, class, or enum per file
>     unless the file is named "types.ts", "global.d.ts", or ends with
>     "-types.ts".
>     1. The file name should match the interface, class, or enum name.

`code_style.md:224`, the structure rule:

> 2. They are organised in a typically two-level hierarchy - first whether the
>    component is a view or a structure, and then a broad functional grouping
>    (e.g. 'rooms' here)

`code_style.md:231-234`, two anti-rules in four lines:

> 7. One component per file, except when a component is a utility component
>    specifically for the "primary" component. The utility component should not
>    be exported.
> 8. Exported constants, enums, interfaces, functions, etc must be separate from
>    files containing components or stores.

`code_style.md:252` and `:255`, the store rules:

> 10. Stores must support using an alternative MatrixClient and dispatcher
>     instance.

> 12. Interdependence between stores should be kept to a minimum. Break
>     functions and constants out to utilities if at all possible.

`code_style.md:266-267`, the one place they dissent from the rest of the set and
say why:

>     1. Unless the component is considered a "structure", in which case use
>        classes.
> 17. Write more views than structures. Structures are chunks of functionality
>     like MatrixChat while views are isolated components.

`docs/MVVM.md:41-42`, the view contract:

> 2. Views are simple react components (eg: `FooView`) with very little state
>    and logic.
> 3. Views must call `useViewModel` hook with the corresponding view model
>    passed in as argument. [...] This entire mechanism is powered by
>    [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore).

`docs/MVVM.md:145-147`, a rule with its failure mode attached:

> All view model actions must be defined as arrow functions to ensure they are
> bound to the class instance.
> Using standard class methods can result in `this` being undefined when the
> function is passed as a callback (e.g. to a React event handler), which may
> cause runtime errors.

`docs/MVVM.md:168`, ownership of teardown:

> It is the responsibility of whoever creates the view model to call the dispose
> method when the view model is no longer necessary.

The lint messages are documentation in their own right. `oxlint.config.ts:384`:

> // Ban matrix-js-sdk/src imports in favour of matrix-js-sdk/src/matrix imports to prevent unleashing hell.

`oxlint.config.ts:26`, `:297`, `:336-341`, `:376`, `:379`, `:392`, `:497`, each
naming the replacement rather than only refusing:

> "Use ref props instead."
> "Buffer is not available in the web."
> "Use Compound <Heading> instead"
> "Use UIStore to access window dimensions instead."
> "Use Media helper instead to centralise access for customisation."
> "Please use TypedEventEmitter instead"
> "Please use @element-hq/web-shared-components"

And `knip.ts:61`, an exception that dates itself:

> // count tests as entry points. NewTimelinePanel picks it up in a follow-up PR,

## How it is held

**By a script, in the largest number of named gates in the set.**
`.github/workflows/static_analysis.yaml` is a matrix of ten checks, each a hard
gate, aggregated by a job whose own comment at `:142` reads *"Dummy job to
simplify branch protections"*. The entries, at `:25-54`: Typescript Syntax Check
(`lint:types`), Oxfmt (`oxfmt --check`, `package.json:17`), Oxlint, Style Lint,
Workflow Lint (a `find`+`action-validator` one-liner, `package.json:21`),
Analyse Dead Code (`knip --no-tag-hints && knip --strict --exclude
unlisted,dependencies,binaries`, `package.json:22`), Rethemendex Check, Module
API Docs Check, Docs, and Unused settings (`package.json:23`). Two entries carry
`assert-diff: true` (`:45`, `:50`), which runs `git diff --exit-code` afterwards
(`:92-94`), so generated artifacts must already be committed. A `zizmor` job at
`:97` lints the Actions themselves; an i18n matrix at `:114-132` runs a shared
`matrix-web-i18n` workflow per app.

`scripts/find-unused-settings.ts` is the most engineered of these: it parses
`Settings.tsx` with the TypeScript compiler API, derives search terms per setting
from both the enum member and its resolved string value, `git grep`s the rest of
`apps/`, and carries a documented manual override set.

**By a test, in the form of a coverage gate.**
`.github/workflows/tests.yml:222-236` runs sharded Jest and Vitest, merges
coverage, then measures diff coverage against the base branch with `fail-under:
80` and a `Z-Skip-Coverage` label as the escape hatch. Eighty percent on changed
lines, not on the whole tree, which is the only form of coverage gate in the set
that could be switched on in an existing codebase.

**By a type.** `typescript/no-floating-promises` at error with `checkThenables:
true` (`oxlint.config.ts:202-206`), though `ignoreIIFE: true`, so an immediately
invoked async function is exempt. `typescript/explicit-function-return-type` at
error (`:195-199`), stated reason: make signature changes obvious in review.

**By the lint config as a per-directory policy table.** `oxlint.config.ts`
`overrides[]` is where the architecture lives: web source bans `Buffer` and
`process.env` (`:297`, `:300`) while desktop, scripts and webpack config invert
both (`:359`); `packages/shared-components/**` bans raw `h1`-`h6` in favour of
the Compound `<Heading>` (`:332-341`); `apps/web/**` cannot reach into
`packages/shared-components` by path (`:495-497`). A first-party rule,
`element-call/copyright-header` (`:184`), requires an exact SPDX header. Test,
story and Playwright globs relax roughly forty rules, each listed individually
rather than switched off wholesale.

**By the dependency manifest.** `pnpm-workspace.yaml` pins one version per
dependency in a `catalog:` block (`:13` onward) and sets
`linkWorkspacePackages`, `cleanupUnusedCatalogs`, `dedupePeers` and
`minimumReleaseAgeStrict: true`, so no dependency newer than the cooldown window
installs without an explicit per-package exclusion. Nx supplies the task graph.

**By review.** The prescriptive parts of `code_style.md` that no rule covers,
which is most of them.

**Where the repo's own documentation does not match the repo.**
`code_style.md:22-23` claims *"The lint rules and this guide are kept in perfect
sync."* They are not, and cannot be with the rules as written. §30
(approximately one interface, class or enum per file), React §7 (one component
per file), React §8 (exported constants separate from components and stores),
React §1 (upper camel case file names) and React §16 (classes for structures)
have no corresponding lint rule: there is no `max-classes-per-file`, no
`unicorn/filename-case`, and nothing in the config that distinguishes a view
from a structure. The config does enforce the restricted imports, restricted
properties, restricted globals, forbidden elements and the copyright header, all
of which are *additions* to the guide rather than restatements of it. The claim
is aspirational; the mechanism it describes, opening a PR against the lint rules
instead of an exception in the code, is real and worth copying regardless.

## What I took from it

- **FC-001 and FC-002.** The variant that proves the rule is not about HTTP.
  There is no bespoke client here: the peg is a singleton holding an SDK
  instance, and base URL and auth live in `SdkConfig` plus
  `apps/web/src/Lifecycle.ts`. FC-001 says "one module that talks to the
  server", not "one fetch wrapper", because of this repo.
- **FC-003.** Stores and view models against `SettingsStore` levels. Different
  mechanism, same separation. **FC-004.** Routing state is read by the view
  stores rather than mirrored, so the URL has one owner. **FC-005.** "Typescript
  Syntax Check" is its own matrix entry, separate from Oxlint and Oxfmt.
- **FC-006.** The primary evidence, and the source of the second half of the
  rule. `oxlint.config.ts:384` bans `matrix-js-sdk/src/**` with the reason in
  the comment, and `:497` bans a relative path into a sibling package with
  *"Please use @element-hq/web-shared-components"*. Both name the correct import.
  The `!matrix-js-sdk/src/matrix` and `!matrix-js-sdk/src/crypto-api` negations
  at `:433-434` are also why FC-006 says entry point rather than barrel: the
  allowed surface is a curated set of module paths, not one index file.
- **FC-007.** The app-level boundary here offers "clear cache and reload" and a
  bug-report button, and there is a second boundary scoped to a single event
  tile. Two seams with genuinely different failure modes and different recovery
  actions, which is the distinction FC-007 is drawing.
- **FC-008.** `no-floating-promises` with `checkThenables: true`.
- **FC-009.** `assert-diff: true` is the nicest shape of the rule I found:
  declarative, attached to the named check that produces the artifact, rather
  than a bespoke shell block. FC-009 is written around `git diff --exit-code`
  because of this and affine's version of it.
- **FC-010.** `code_style.md:28-30` is the nearest thing in the set to the rule:
  an intentional suppression carries a comment nearby saying why. FC-010 applies
  the same shape to a swallowed error.
- **FC-011.** `treatConfigHintsAsErrors: true` and `treatTagHintsAsErrors: true`
  in `knip.ts:147-148` are the rule applied to the checker's own config: a stale
  exception fails too. That is the strictest reading of "a check that reports a
  violation exits non-zero" anywhere in the survey.

## What I did not take, and why

**MVVM.** It is the most prescriptive state scheme in the set and the only one
that makes the view/logic split testable without React. It also costs an extra
file, a five-row naming table and a base class per model. One repo adopting it
mid-life is not consensus, and FC-003 already gets the separation without
mandating the mechanism.

**No state library at all.** Same answer. Four products, four positions.

**Classes for "structures".** element-web is the lone dissenter here and gives a
reason: structures own long-lived imperative lifecycles. A standard that banned
class components would be overruling a defended position, so it says nothing.

**"One interface, class or enum per file."** Better than a line limit, and
unenforced here, which is the problem. FC-011 exists because of checks that
cannot fail, and a rule nobody checks is the same failure in documentation form.

**Diff coverage at 80%.** The one I came closest to taking, and the only
coverage gate in the set adoptable on day one. Left out because every one of the
twelve rules is a decision four or more products made the same way, and this is
one product. It belongs in Adoption as a ratchet pattern, not in the rules.

**knip as a blocking gate.** Dead-code detection costs a long, commented
exception list that someone has to maintain, and element-web is the only one of
the four paying it. Mature products disagree, so the standard stays quiet.

**Upper camel case file names.** Three repos, three conventions. Not mine to
call. And `react/forbid-elements` on headings is design-system enforcement,
which belongs to design-contract rather than here.
