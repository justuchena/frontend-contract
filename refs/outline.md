# outline

> Outline is a team knowledge base and wiki: a React single-page app and a Koa API
> server in one repository, sharing a `shared/` tier and a ProseMirror editor.
> This ref exists for one decision: outline keeps session policy out of its
> transport layer, so the one HTTP client owns serialization, CSRF, retries,
> dedup and status-to-error mapping, and nothing else.

**Stack.** React 19 with MobX (observable classes, decorators) and
styled-components, Vite for the build, Vitest for tests, oxlint and oxfmt for
lint and format, Koa + Sequelize on the server side of the same tree. Yarn, no
workspaces, no monorepo tooling: one `package.json`, one `tsconfig.json`.

**Scale.** 844 `.ts`/`.tsx` files under `app/`, 1,206 across `app/` and
`shared/`, 161,959 lines between them. Largest by `wc -l`:
`shared/editor/components/Styles.ts` 2,881,
`app/scenes/Developer/components/ExampleData.ts` 2,656,
`app/actions/definitions/documents.tsx` 1,971,
`shared/editor/commands/table.ts` 1,360, then
`app/components/Lightbox.tsx` 1,344, which is the largest hand-written UI
component. The first three are a style-constant table, a fixture file and an
action registry, so the real component ceiling is around 1,300 lines and the
ordinary component is 100 to 350. There is no `max-lines` rule anywhere in
`.oxlintrc.json`. Contributors signal is unavailable: my clone is shallow
(`.git/shallow` present, one commit in `git log`), so I can report recency but
not authorship spread.

**Read at.** `35dd15b9718bcb8e547b86c1428d55170b49250b`, committed 2026-09-10.
Verified 2026-10-16.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | `app/` + `server/` + `shared/` + `plugins/` + `public/`, one tree | `AGENTS.md:7-12` |
| Structure inside the app | Layer-based: `actions components editor hooks menus models routes scenes stores types utils` | `docs/ARCHITECTURE.md:11-23` |
| Page unit | A "scene" is a full-page view; scenes nest their own `components/` | `docs/ARCHITECTURE.md:18` |
| Co-location | State logic and styles sit with the component unless global | `docs/ARCHITECTURE.md:7` |
| Data layer | One class, one exported singleton, `baseUrl` defaulting to `/api` | `app/utils/ApiClient.ts:95` |
| Auth in transport | Cookie and CSRF; the 401 policy is injected from outside | `app/utils/ApiClient.ts:115` |
| Client extras | In-flight dedup, batching into `/batch`, retries, typed errors | `ApiClient.ts:87`, `:78`, `:424`, `:502-510` |
| Who calls the client | Stores do; components go through the store | `app/stores/base/Store.ts`, `AGENTS.md:104` |
| Server cache | 35 `*Store.ts` files extending a generic normalized collection | `app/stores/base/Store.ts:40` (`RPCAction`), `:49` (`PAGINATION_SYMBOL`) |
| State split | UI state is global but in its own store, never in an entity store | `app/stores/UiStore.ts`, `app/stores/DialogsStore.ts` |
| URL state | Query params read from the router through hooks, not mirrored into MobX | `app/hooks/useQuery.ts`, `useConsumeQueryParam.ts`, `useQueryNotices.ts` |
| Per-screen request state | `{data, loading, loaded, error, request}`, guarded by `useIsMounted()` | `app/hooks/useRequest.ts:67`, `:28`, `:40-52` |
| Module boundaries | Path aliases only: `@server/*`, `@shared/*`, `~/*`, `plugins/*` | `tsconfig.json:32-36` |
| Strictness | `strict: false`, assembled flag by flag instead | `tsconfig.json:5`, `:26`, `:28` |
| Error handling | One reusable class boundary, applied per area, with chunk-error recovery | `app/components/ErrorBoundary.tsx:37-38`, `:65-75` |
| Forms | `react-hook-form`, six files under `app/`, validation constants in `shared/` | `package.json:229`, `shared/validations.ts` |
| Code splitting | One named wrapper per route tree: `lazyWithRetry`, plus `createLazyComponent` | `app/routes/index.tsx:8`, `app/routes/settings.tsx:3` |
| File naming | Upper camel case for components and stores, no lint rule | convention only |

## What they wrote down

`docs/ARCHITECTURE.md:7`, the co-location rule, which is also the only sentence
in the architecture doc that constrains anything:

> Unless global, state logic and styles are always co-located with React
> components together with their subcomponents to make the component tree easier
> to manage.

`AGENTS.md:100-104`, the whole state policy, four lines:

> - Use MobX stores for global state management.
> - Keep stores in `app/stores/`.
> - Use `observable`, `action`, and `computed` decorators appropriately.
> - Prefer computed values over manual calculations in render.
> - Keep business logic in stores, not components.

The anti-rules are in `AGENTS.md:33` and `:38`, and the first is the most
unusual instruction in any of the four repos:

> - Critical – Do not create new markdown (.md) files.

> - Do not add translation strings manually; they will be extracted
>   automatically from the codebase.

`app/utils/ApiClient.ts:109-111`, the reason the transport does not own the
session:

> Registers a handler invoked when a request is rejected as unauthenticated
> (a 401, or a 403 indicating the user was suspended). Used to keep
> session/logout policy out of the transport layer.

`app/components/ErrorBoundary.tsx:69-72`, the stale-chunk case written out:

> If the editor bundle fails to load then reload the entire window. This
> can happen if a deploy happens between the user loading the initial JS
> bundle and the async-loaded editor JS bundle as the hash will change.
> Don't reload if this is a repeated error to avoid infinite reload loops.

`app/utils/lazyWithRetry.ts:54-55`, the same failure from the other side:

> Retrying a removed chunk is futile, the only recovery is to
> reload and fetch a fresh index.html with current chunk URLs.

`.oxlintrc.json:97`, the only import restriction in the repo, and it names the
replacement:

> Use the wrappers from shared/editor/commands/table instead, which respect the
> target index and place the cursor in the inserted cell.

`.github/workflows/ci.yml:159-162`, the contract of the aggregate status check:

> Always runs, so it can be used as the single required status check. Jobs
> above are skipped when irrelevant to the changes, which is a pass here.
> Audit is intentionally excluded, it reports advisories that can have no
> fix available or affect dev only and should not block merging.

## How it is held

**By a script.** `yarn lint --quiet`, which is `oxlint --type-aware app server
shared plugins` (`package.json:16`); `yarn tsc` as its own job
(`.github/workflows/ci.yml:86`); `yarn test:app` and `test:shared` as a matrix
(`:107`); `yarn npm audit` (`:95`); a dockerized `actionlint` gated on
`.github/**` changes; and a `bundle-size` job that builds production and ships
`webpack-stats.json` to RelativeCI (`:148-155`), which reports rather than
fails. The `changes` job (dorny/paths-filter) gates every later job, and the
`ci` job at `:163-171` fails if any of them failed, which is what branch
protection points at.

**By a type.** `typescript/no-floating-promises: "error"`
(`.oxlintrc.json:121`), so every fire-and-forget has to be `void`-ed.
`strictNullChecks` and `noImplicitAny` are on without `strict`.

**By a custom lint plugin.** `.oxlint/mobx.mjs` is a hand-written oxlint JS
plugin registered at `.oxlintrc.json:12`, supplying
`mobx/observable-needs-initializer: "error"` (`:14`). It walks decorators and
`makeObservable(this, …)` calls. This is the only MobX-specific enforcement in
the repo, and it exists because the convention it protects is invisible to the
type checker.

**By review.** Layering. There is no eslint-plugin-boundaries, no
dependency-cruiser, no project references, no `import/no-restricted-paths`. The
`app` / `shared` / `server` split is held by four path aliases and nothing
checks that a scene does not reach into another scene.

**Where the repo's own description does not match the repo.** Two cases.

1. The formatter is not a CI gate. `format:check` exists
   (`package.json:19`) and `docs/ARCHITECTURE.md:3` says *"oxfmt formatting and
   Oxlint are enforced by CI"*, but no workflow in `.github/workflows/` runs
   `oxfmt` or `format:check`. The only place formatting runs is
   `lint-staged.config.mjs:11`, on staged files, locally. A contributor
   committing with hooks disabled is not stopped by CI.
2. `docs/ARCHITECTURE.md:57` describes `shared/` as *"generally small
   utilities"*. `shared/` holds the entire ProseMirror editor, including the
   largest file in the repository (`shared/editor/components/Styles.ts`, 2,881
   lines) and `shared/editor/commands/table.ts` at 1,360.

## What I took from it

- **FC-001.** One client, one singleton, and stores are the only callers. The
  cleanest example in the set of components being kept off the transport without
  any lint rule to force it.
- **FC-002.** `ApiClient.ts` is the evidence for what belongs in the client:
  base URL (`:95`), CSRF, retries, dedup (`:87`), batching (`:78`), and
  status-to-typed-error mapping. It is also the evidence for what does not,
  which is the 401 handler at `:115`. That distinction is why FC-002 says
  "error mapping" and not "error policy".
- **FC-003.** 35 entity stores against `UiStore` and `DialogsStore`. UI state is
  global here, and still in a different container, which is the point FC-003 is
  making: the rule is about the container, not about scope.
- **FC-004.** Query params read through `useQuery` and friends, never copied
  into MobX. A MobX codebase that could trivially have mirrored the URL into an
  observable and did not.
- **FC-007.** `ErrorBoundary.tsx` is where the recovery half of the rule comes
  from. The fallback does not just apologise: it detects a stale chunk, reloads
  once, and keeps a five-minute error window in storage (`:37-38`) so a repeated
  failure escalates instead of looping. `lazyWithRetry.ts` is the same recovery
  one layer down.
- **FC-008.** `no-floating-promises` at error, paired with `useIsMounted()`
  before every post-await `setState` in `useRequest.ts`.
- **FC-011.** By counter-example. The `bundle-size` job reports to RelativeCI
  and cannot fail the build, and `audit` is deliberately excluded from the
  aggregate check with the reason written down at `ci.yml:161-162`. That is the
  honest version of a reporting-only check: named, reasoned, and visibly outside
  the gate. FC-011 asks for exactly that, an explicit flag rather than a silent
  exit 0.

## What I did not take, and why

**MobX.** Four products, four state answers, each defended. FC-003 rules on the
container and stays quiet on the library.

**Layer-based top-level structure.** `components/ scenes/ stores/ hooks/` works
here because it is one app read by one small team. Mattermost and affine both
went the other way and both had reasons. Mature products disagree, so the
standard says nothing about folder names, and FC-006 is phrased as an outcome
about entry points so it survives either layout.

**Path aliases.** `~/*` for the app tree is a good convention and lemmy-ui bans
aliases outright in favour of relative imports. A genuine coin flip; the
standard does not call it.

**No boundary enforcement at all.** Outline gets away with zero import rules
because it is a single application with no second consumer. I did not weaken
FC-006 to match, because the same absence in a monorepo is how packages grow
into each other. I did take the shape of outline's one restriction: the message
names the correct import, which is now half of FC-006.

**`strict: false` with flags assembled individually.** FC-005 requires the gate,
not the setting, and explicitly allows a baseline. Outline is the evidence that
a large production codebase can run a mandatory typecheck without full strict
mode, which is why FC-005 does not demand it on day one.

**No file-size rule.** Outline has none and ships 1,300-line components in the
editor surface. Mattermost has a warning-level one that 104 files exceed. Nobody
in the set holds a line limit, so the standard does not invent one.

**react-hook-form.** Outline is the only one of the four with a decided form
story, which is suggestive but is one repo, not consensus. The standard stays
quiet on form libraries.
