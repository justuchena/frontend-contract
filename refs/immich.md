# immich

> immich is a self-hosted photo and video library whose web client is a
> SvelteKit single-page app over a Go-free TypeScript server.
> This ref exists because immich is the codebase that corrected me: it is cited
> as a pure layer-folder frontend and it is not one, and it holds a measurably
> clean import graph with no mechanical import boundary at all.

**Stack.** SvelteKit 2 with Svelte 5 runes; TypeScript, strict, with `checkJs`;
TanStack Svelte Query for server data plus rune-class singletons for client
state; Tailwind 4 with one global stylesheet; Vite and Vitest;
`@immich/sdk`, an OpenAPI-generated client, as the only server client;
`@immich/ui` as the component package; pnpm workspaces with `mise` as the task
runner.

**Scale.** 730 files under `web/src`: 413 `.svelte`, 303 `.ts`, 67,136 lines
across the two. Largest file by `wc -l`:
`web/src/lib/managers/timeline-manager/timeline-manager.svelte.spec.ts` at 930,
then `web/src/lib/managers/edit/transform-manager.svelte.ts` at 888 and
`web/src/lib/components/asset-viewer/AssetViewer.svelte` at 732. Exactly two
`index.ts` files exist in those 730, and one of them is not a barrel. The clone
is sparse and depth-1, so contributor counts and commit cadence are not readable
from it; the ownership signal below is from `CODEOWNERS`, not from history.

**Read at.** `908222abfa511eebd9b909008cbad94c5b1792a2`, 2026-10-16
(`fix: user admin actions (#32491)`), read 2026-10-16. Sparse checkout: `web/`,
`docs/docs/developer`, `.github`, root configs. `packages/sdk` is outside it, so
where I describe the generated client I am reading its generation command and
its call sites, not its source.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | Layer at depth 1, feature at depth 2, plus a second feature axis in `routes/`. `web/src/lib/` holds `components/ 199`, `modals/ 69`, `utils/ 62`, `managers/ 42`, `services/ 23`, `stores/ 18`, `elements/ 15`, `actions/ 13`, `queries/ 6` | measured; nothing in the repo states it (see below) |
| Feature co-location | 101 of the files under `web/src/routes` are not SvelteKit-reserved `+*` files, i.e. page-local components living beside the page that uses them | measured: `find web/src/routes -type f ! -name '+*' \| wc -l` = 101 |
| Feature index | Filename prefix, not directory. `lib/modals/` is 69 flat files all shaped `<Feature><Action>Modal.svelte`; `lib/services/` is `<entity>.service.ts`; `lib/queries/` is `<entity>.query.ts` | convention only |
| Data layer | One generated client, `@immich/sdk`, imported in 338 files. Base URL comes from the SDK's `getBaseUrl()`, referenced 12 times in `web/src` and nowhere constructed; auth is a cookie read in one place | `web/src/lib/managers/auth-manager.svelte.ts:122-134`; generation command in `mise.toml:71-76` |
| Mutation and error policy | One `QueryClient` with a `MutationCache` whose `onSuccess`/`onError` read a typed `meta` to fire a toast and route every failure through `handleError` | `web/src/lib/queries/client.ts:46-70` |
| Loader-to-component contract | `createPreloadedQuery` throws `"<key> must be loaded first"` if a component mounts before its `+page.ts` loader primed the cache | `web/src/lib/queries/client.ts:81-101` |
| State split | Three idioms by lifetime: rune-class module singletons in `lib/managers/`, older `lib/stores/`, per-component `$state`. No written rule chooses between them | `docs/docs/developer/` is silent |
| URL state | Route params carry asset, album and person identity; search filters serialise into the query string; URL literals live once in a typed registry | `web/src/lib/route.ts` with `web/src/lib/route.spec.ts` |
| Module boundaries | None mechanical. One alias root, `$lib` | `web/svelte.config.js:28-36`; `web/tsconfig.json` has no `paths` at all; `web/eslint.config.js` has no `no-restricted-imports`, no `import/*` plugin and no boundaries plugin |
| Dependency direction | Encoded as a formatter rule | `web/.prettierrc:2` |
| Error handling | Route-level: `routes/+error.svelte` at the root, plus segment overrides at `routes/(user)/s/[slug]/+error.svelte` and `routes/(user)/share/[key]/+error.svelte`, all rendering `ErrorLayout.svelte` | `web/src/hooks.client.ts:33-37` |
| Forms | Hand-rolled. No schema library in `web/package.json`; validation is `$derived` booleans; `ssr = false` so form actions are unavailable | `web/src/routes/+layout.ts:9-10` |
| File naming | PascalCase components, `<entity>.service.ts`, `<entity>.query.ts`, `<entity>-utils.ts`, `*.svelte.ts` for rune modules. `unicorn/filename-case` explicitly off | `web/eslint.config.js` |
| Code splitting | SvelteKit's per-route chunks. No named wrapper, no bundle budget in CI | `vite.config.ts:44-49` has a visualizer behind `BUILD_STATS=true`, ungated |
| Typecheck | Two separate gates plus a zero-warning lint | `web/package.json:12-13,17` |

## What they wrote down

This is the thin part, and the thinness is the finding.

`docs/docs/developer/directories.md` documents the monorepo. Its entire
statement about the frontend is a table row:

> | `web/` | Source code for the `web` |

There is **no `web/src` layout documentation anywhere in the repo.** No
definition of `components` versus `elements` versus `modals`, no rule for which
layer new code goes in, no statement about `managers` versus `stores`.

The closest thing to a navigation rule delegates to the framework
(`web/README.md:3`):

> "This project uses the [SvelteKit](https://kit.svelte.dev/) web framework. Please refer to [the SvelteKit docs](https://kit.svelte.dev/docs) for information on getting started as a contributor to this project. In particular, it will help you navigate the project's code if you understand the basics of [SvelteKit routing](https://kit.svelte.dev/docs/routing)."

The only machine-enforced statement about where code may come from is a
formatter setting (`web/.prettierrc:2`):

> ```json
>   "importOrder": ["<THIRD_PARTY_MODULES>", "<BUILTIN_MODULES>", "^\\$(.*)$", "^@test-data(.*)$", "^[./]"],
> ```

Third party, then builtins, then `$lib`-aliased, then test data, then relative.
That is the dependency direction, written as a sort order.

The only architectural lint rule in the repo is a security rule
(`web/eslint.config.js:113-120`):

> ```js
>       // navigation-target query params must be origin-checked at the read site, not at the goto/redirect sink
>       'no-restricted-syntax': [
>         'error',
>         {
>           selector: `${NAVIGATION_PARAM_READ}:not(${ROUTE_CONTINUE} > ${NAVIGATION_PARAM_READ})`,
>           message: 'Pass this navigation-target query param through Route.continue() to reject cross-origin values.',
>         },
>       ],
> ```

The prescriptive web rules in the docs are a list of commands, not of
conventions (`docs/docs/developer/pr-checklist.md`):

> "## Web Checks
> - [ ] `mise //web:lint` (linting via ESLint)
> - [ ] `mise //web:format` (formatting via Prettier)
> - [ ] `mise //web:check-svelte` (type checking via SvelteKit)
> - [ ] `mise //web:check-typescript` (type checking via `tsc`)
> - [ ] `mise //web:test` (unit tests)"

`CONTRIBUTING.md` is prescriptive about process and silent on structure:

> "Please try to keep pull requests as focused as possible. A PR should do exactly one thing and not bleed into other, unrelated areas."

> "We ask you not to open PRs generated with an LLM. … LLMs must not be used to fix GitHub issues labelled good first issue."

**Where the repo's own framing is off.** The description of immich as a
layer-folder frontend does not survive `ls web/src/lib/components`: that
directory is 16 feature directories plus 25 loose files, `lib/managers/` contains
a feature module with its own `internal/`, and `routes/` holds 101 non-route
files, including 18 in `routes/(user)/user-settings/` and 24 in
`routes/admin/system-settings/`. The accurate description is layer at depth 1,
feature at depth 2. I also correct a line number my own research notes had wrong:
the frontend ownership entry is `CODEOWNERS:4`, not `:5`.

Separately, the layer names have stopped discriminating, and nothing in the repo
defines them: `lib/modals/` contains `timezone-utils.ts` and three `*Picker`
files that are not modals; `lib/elements/SearchBar.svelte` and
`lib/components/shared-components/search-bar/SearchBar.svelte` both exist;
`lib/components/shared-components/` sits inside `lib/components/` and is the
second-largest directory in the app.

## How it is held

**By a type, almost entirely.** This is immich's actual enforcement strategy.
`web/package.json:12` runs `svelte-check --no-tsconfig --fail-on-warnings`,
`:13` runs `tsc --noEmit`, and `:17` runs `eslint . --max-warnings 0`. The
compiler's own accessibility warnings become errors through
`--fail-on-warnings`. Type-aware promise rules are on at `error`, including
`@typescript-eslint/no-floating-promises`, `no-misused-promises`,
`await-thenable` and `switch-exhaustiveness-check`.

**By `git diff` in CI.** `.github/workflows/test.yml:898` regenerates the SDK
and the OpenAPI spec and exits 1 on drift; `:349` does the same for `i18n/`
formatting; `.github/workflows/check-openapi.yml` runs `oasdiff` breaking-change
detection against `main` with `fail-on: ERR`.

**By a test.** `web/src/lib/i18n.spec.ts:5-26` reads `../i18n/*.json` off disk
and fails if a locale file has no registered loader.
`web/src/lib/route.spec.ts` unit-tests the route registry's URL encoding,
including the `continue` parameter.

**By a runtime assertion standing in for a structural rule.**
`web/src/lib/queries/client.ts:81-101` throws if a component mounts without its
route loader having run. That is a boundary expressed as a crash rather than a
lint rule, and it is the only thing holding the loader-to-component contract.

**By one reviewer.** `CODEOWNERS:4` is the entire frontend ownership rule:

> ```
> /web/      @danieldietzler
> ```

One person owns 730 files. There is no per-feature ownership, so there is no
organisational pressure for per-feature folders, and the clean graph rests on
this. I measured the graph: 0 cross-route relative imports inside `routes/`, 0
`../../../` imports anywhere in `web/src`, 0 imports from `lib/` into `routes/`.
Those numbers are real and there is no tool producing them.

**Not held at all.** No bundle budget, no coverage floor, no dependency-graph
check, no import boundary. And the error path is bimodal: a mutation through
`lib/queries/*` gets its toast from the mutation cache, while the 210 `.svelte`
files that call the SDK directly must each remember `handleError` themselves.
Nothing fails if a new component forgets. 22 bare `catch {` blocks exist under
`web/src`, two of which swallow the whole auth-refresh and logout paths with no
log line (`web/src/lib/managers/auth-manager.svelte.ts:80-82`, `:101-103`), and
`web/src/hooks.client.ts:10-13` `console.log`s error payloads in production.

## What I took from it

- **FC-001** and **FC-002** (one server client; base URL, auth and error mapping
  set once inside it). immich reaches the same place as the Redux-singleton
  products from the opposite direction, with a generated SDK plus one central
  mutation-error policy, and that combination is what lets it survive with no
  import rules. It is the evidence that FC-001 must not name a client kind.
- **FC-007** (error UI at interior seams), and specifically its framework note.
  immich is why FC-007 is phrased as "every seam whose failure mode differs from
  its parent's declares its own error UI" rather than "wrap feature roots in an
  ErrorBoundary": SvelteKit has no component boundary, it has
  `routes/+error.svelte` and segment overrides, and the React phrasing is
  unimplementable here.
- **FC-005** (typecheck as its own gate). Two of them, plus `--max-warnings 0`.
- **FC-009** (generated artifacts committed, CI fails on a diff). The SDK and
  i18n drift gates.
- **FC-010** (a catch either reports or says what is lost). immich is the
  cautionary half of the evidence: an excellent central handler used at 178 call
  sites, and the auth path still swallowed silently.
- **FC-006**'s "not saying" clause. immich dropped barrels entirely, 2 `index.ts`
  in 730 files, and accepted having no boundary. That is why the standard
  requires an entry point rather than a barrel per directory, and why it refuses
  to make barrels mandatory.
- **The four conditions**, which are the most useful thing in this ref. Layer
  first is defensible when all of: one person or team owns the whole frontend and
  reviews every change (`CODEOWNERS:4`); all server access goes through a single
  generated client with one central error and caching policy
  (`lib/queries/client.ts:46-70`), so no feature owns a data module; the
  framework's router supplies a per-page directory the team actually uses for
  page-local code (101 files); and styling is utility-class or design-system
  based, so there is no per-component style file (one CSS file,
  `web/src/app.css`). If any of those fails, especially the first two, the
  argument does not transfer. immich satisfies all four, which is exactly why it
  is not the counterexample it gets cited as.

## What I did not take, and why

**Layer-first structure itself.** Not because it is wrong here, but because its
four preconditions are not properties a zero-config standard can check. The
standard therefore prescribes an outcome, co-location and one entry point, and
does not name a directory.

**The absence of an import boundary.** immich proves a clean graph is reachable
without one; it does not prove it is reachable without one owner. FC-006 keeps
the mechanical check and credits immich with the reason the rule must derive the
boundary from a name rather than a list.

**Hand-rolled form validation.** It is the weakest part of the codebase: server
field errors are flattened into one toast truncated to 75 characters
(`web/src/lib/utils/handle-error.ts:19-29,:50`) and there is no field-level error
contract at all. But the fix is an outcome, "a server field error reaches the
field it belongs to", not a library, and no four surveyed products agree on a
library. So the standard names no form library, and the outcome did not make the
twelve either, because I could not find four products that enforce it.

**Module-level mutable state.** immich exports 24 rune-class singletons and that
is safe only because `web/src/routes/+layout.ts:9` sets `ssr = false`. A rule
banning it would be an SSR rule wearing a framework label, so it is a note in the
standard's framing rather than a rule.

**`unicorn/filename-case: off` and the naming conventions.** The filename-prefix
index works well here and nobody else does it. Mature products disagree, so the
standard stays quiet.
