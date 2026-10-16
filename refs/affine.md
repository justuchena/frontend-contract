# affine

> AFFiNE is a local-first knowledge base combining documents and a whiteboard:
> a React frontend, a custom dependency-injection framework, the BlockSuite
> editor engine and a NestJS backend, all in one yarn-workspace monorepo with
> Rust native modules.
> This ref exists for one decision: affine makes the module graph you are
> allowed to draw exactly the one each package declared in its `package.json`,
> and enforces it with a lint rule rather than a hand-maintained zone list.

**Stack.** React 19, no Redux and no MobX: RxJS `LiveData` held inside a custom
DI container. GraphQL through a client generated from the backend's own schema
file. vanilla-extract for styling, Vite, Vitest, Playwright, oxlint and oxfmt,
yarn workspaces plus Cargo.

**Scale.** 6,581 `.ts`/`.tsx` files under `packages/` and `blocksuite/`, 70
feature modules under `packages/frontend/core/src/modules`. Largest excluding
generated output: `packages/frontend/core/src/components/affine/onboarding/switch-widgets/toolbar.tsx`
3,726, `blocksuite/affine/all/src/__tests__/adapters/markdown.unit.spec.ts`
5,649 and `html.unit.spec.ts` 3,182 (both tests),
`blocksuite/affine/blocks/embed-doc/src/embed-linked-doc-block/styles.ts` 2,232.
The two largest files in the repository are generated:
`packages/frontend/i18n/src/i18n.gen.ts` 11,216 and
`packages/common/graphql/src/schema.ts` 8,634. There is no `max-lines` rule.
Contributors signal is unavailable: my clone is shallow.

**Read at.** `cfda485`, committed 2026-09-09. Verified 2026-10-16.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | Yarn workspaces: `packages/{frontend,common,backend}/*`, `blocksuite/*`, `tools/*`, `tests/*` | root `package.json:7-16` |
| Structure inside the app | 70 feature modules under `packages/frontend/core/src/modules`, each with the same internal layers | directory; `packages/frontend/core/src/modules/doc/` is the canonical shape |
| Module layer names | `entities/ services/ stores/ scopes/ providers/ events/ types.ts index.ts` | `packages/common/infra/src/framework/core/components/` |
| Why those names | They are framework base classes, not a naming convention | `component.ts:9`, `entity.ts:4`, `service.ts:4`, `store.ts:4` |
| Architecture enforcement | The DI container throws if a component is built outside a provider scope | `packages/common/infra/src/framework/core/components/component.ts:17` |
| Disposal | Built into the base class, including `Symbol.dispose` | `component.ts:9`, `:25` |
| Data layer | One generated GraphQL client, schema read from the backend in the same repo | `packages/common/graphql/codegen.yml:26-27` |
| Codegen strictness | `strict: true`, `maybeValue: T \| null`, `avoidOptionals.field: true`, formatter hook after write | `codegen.yml:5`, `:6`, `:8`, `:2` |
| Transport | One `fetcher.ts`; the query document's type determines variables and response | `packages/common/graphql/src/fetcher.ts:25-27` |
| Error normalization | Everything becomes `GraphQLError` from `@affine/error` | `fetcher.ts:2` |
| Who calls the fetcher | Module `stores/` do; UI depends on a module service | convention, module directory shape |
| Other data paths | `@affine/nbstore` for local-first storage, Y.js for realtime, `@affine/electron-api` for desktop IPC | workspace packages |
| State placement | `stores/` for persistence, `services/` for logic, `entities/` for observable per-instance state, `scopes/` for lifetime, `events/` for cross-module | module directory shape, enforced by the base classes |
| State primitive | RxJS `LiveData` with request-shaped operators (`backoffRetry`, `smartRetry`, `catchErrorInto`, `exhaustMapSwitchUntilChanged`) | `packages/common/infra/src/livedata/` |
| Custom hook staleness | `exhaustive-deps` extended to five project hooks | `.oxlintrc.json:389-394` |
| URL state | `modules/workbench` owns routing; the active View's URL is the app URL | `packages/frontend/core/src/modules/workbench/README.md:25` |
| Deep imports | `**/src` and `**/dist` banned outright, type imports included | `.oxlintrc.json:125-141` |
| Declared dependencies | Every import must be a declared dependency, internal packages included | `.oxlintrc.json:436-446` and four per-package overrides |
| Cycles | `import/no-cycle` with `ignoreTypes: true`, plus `no-self-import` | `.oxlintrc.json:309-314`, `:319` |
| Build graph | `tsconfig.json` project references, `tsc -b`, separate web and node environments | `tsconfig.json`, `tsconfig.web.json`, `tsconfig.node.json` |
| Error handling | `AffineErrorBoundary` at ten route, page and peek-view seams | 10 files under `packages/frontend/core/src` |
| Async handlers | A mandated wrapper that converts an async callback to sync and routes the error | `packages/frontend/core/src/components/hooks/affine-async-hooks.ts:19-30` |
| Floating promises | Error with `ignoreVoid: false, ignoreIIFE: false`, the strictest in the set | `.oxlintrc.json:379-385` |
| File naming | kebab-case, lint-enforced | `.oxlintrc.json:294-299` |
| Code splitting | Module-level dynamic import | convention |
| Forms | Hand-rolled, plus `useAsyncCallback`; `react-hook-form` only in the admin package | `packages/frontend/admin/package.json` |
| PR hygiene | The pull request title is piped through commitlint in CI | `.github/workflows/pr-title-lint.yml:32` |

## What they wrote down

affine writes down less prose than the other three and more framework. The
clearest statement of its architecture is a thrown error,
`packages/common/infra/src/framework/core/components/component.ts:17`:

```ts
throw new Error('Component must be created in the context of a provider');
```

and four marker fields that make the layer names load-bearing:

```ts
// entity.ts:4   readonly __isEntity = true;
// service.ts:4  readonly __isService = true;
// store.ts:4    readonly __isStore = true;
```

`packages/frontend/core/src/modules/workbench/README.md:25`, the URL rule, which
is the plainest URL-ownership statement in the survey:

> There is always one **active View**, and the URL of the active View is
> considered the URL of the entire application.

`packages/frontend/core/src/components/hooks/affine-async-hooks.ts:5-7` and
`:14-17`, the async-handler contract, including an anti-rule about return
values:

> /**
>  * App should provide a global error handler for async callback in the root.
>  */

> /**
>  * Translate async function to sync function and handle error automatically.
>  * Only accept void function, return data here is meaningless.
>  */

The anti-rules in `.oxlintrc.json:129-138` are two lines long and absolute:

> "message": "Don't import from dist"

> "message": "Don't import from src"

`.github/workflows/build-test.yml:472` is the codegen-drift gate's error
message, and it names the exact command:

> Run 'yarn affine init && yarn affine gql build && yarn affine i18n build && yarn affine server genconfig' and make sure all changes are submitted

`docs/CONTRIBUTING.md:23`:

> 4. **Open a PR to `canary`** with a
>    [Conventional Commits](https://www.conventionalcommits.org/) title, e.g.
>    `fix(editor): keep selection after paste` — the title format is enforced by
>    CI.

## How it is held

**By the runtime, which no other repo in the set does.** The DI container is the
architecture. `Component`'s constructor throws unless it is being built inside a
provider scope (`component.ts:17`), so a service cannot be instantiated outside
the scope that is supposed to own it. Disposal is on the base class
(`component.ts:9`, `:25`) rather than being a discipline, so teardown is the
default and leaking is the thing that requires effort. The `entities/`,
`services/`, `stores/` and `scopes/` directory names are the names of those base
classes, which is why they stay consistent across 70 modules with no lint rule
checking the layout.

**By lint, as a dependency manifest.** This is the strongest boundary
enforcement of the four. `.oxlintrc.json:125-141` bans every `**/src` and
`**/dist` path, `allowTypeImports: false`, so there is no way into another
package except its entry point. Then
`import-x-js/no-extraneous-dependencies` with `includeInternal: true` is applied
to `packages/**`, `tools/**` and `blocksuite/**` (`:436-446`), with per-package
self-whitelists such as `{"whitelist": ["@affine/core"]}` for
`packages/frontend/core/**/*` (`:459-470`). The result is dependency-cruiser-grade
graph enforcement with no graph tool and no zone list: the edges you may draw
are the ones each `package.json` declares, so the config does not grow when the
codebase does. `import/no-cycle` (`:309-314`) closes the remaining hole.

**By a script.** `.github/workflows/build-test.yml`: a `Lint` job at `:66` that
installs `actionlint` via Go and runs it (`:70-79`), runs `oxlint`
(`:89`), and runs `yarn dedupe --check` (`:98-99`), so a duplicated transitive
version fails the build. A `Typecheck` job at `:102` that regenerates i18n and
then runs `tsc -b`, with `git status --porcelain` checks at `:117` and `:128`.
A `check-git-status` job whose `Run Check` step (`:466-477`) runs every
generator, then:

```sh
if git status --porcelain | grep -q .; then
  echo "Run 'yarn affine init && yarn affine gql build && yarn affine i18n build && yarn affine server genconfig' and make sure all changes are submitted"
  exit 1
```

A `check-yarn-binary` job (`:480-490`) that re-pins yarn from
`package.json#packageManager` and runs `git diff --exit-code`. Plus CodeQL,
`cargo fmt --check` and `cargo clippy -- -D warnings`, Playwright suites for web
and BlockSuite, Android instrumentation tests on an emulator, and iOS simulator
unit tests. `pr-title-lint.yml:32` pipes the PR title through commitlint.

**By a type.** `fetcher.ts:25-27` ties a query document to its variables and its
response through the generated unions:

```ts
export type QueryResponse<Q extends GraphQLQuery> = Extract<Queries | Mutations, { name: Q['id'] }>['response'];
```

A wrong variable shape is a compile error rather than a runtime 400. Because the
schema is read from `../../backend/server/src/schema.gql`
(`codegen.yml:26`), a backend change that breaks the frontend breaks `tsc`, not
production.

**By review.** The state-placement rules. Nothing checks that a network call
lives in a `stores/` file rather than a `services/` file, or that a component
does not reach past a service into a store. The directory shape is consistent
across all 70 modules and that consistency is held by the base classes plus
habit.

**Where the configuration is narrower than it looks.** Three cases, all
precision rather than contradiction.

1. `typescript/no-floating-promises` is `"allow"` at the top level of
   `.oxlintrc.json` (`:105`). The strict setting, `{"ignoreVoid": false,
   "ignoreIIFE": false}`, exists only inside the override block for
   `packages/**`, `tools/**` and `blocksuite/**` (`:379-385`). In practice that
   covers all the source, but the rule is scoped by an override rather than set
   globally, and `.oxlintrc.json:417` turns `no-restricted-imports` off entirely
   for another glob.
2. `react/exhaustive-deps` is a `"warn"`, not an error (`.oxlintrc.json:390`),
   even with the custom hooks added. And `useAsyncCallback` itself contains two
   `oxlint-disable` comments for that rule
   (`affine-async-hooks.ts:25`, `:28`). Neither carries an explanation, which is
   the one place element-web's "a suppression carries a nearby comment saying
   why" rule would have caught something here.
3. The research I started from said "roughly 60 modules" and
   `i18n.gen.ts` as the largest generated file. The module count is 70 as of
   this SHA, and `packages/common/graphql/src/schema.ts` at 8,634 lines is a
   second generated file that does not carry `.gen` in its name, so a
   largest-file scan that filters on `.gen.` will report it as hand-written.

## What I took from it

- **FC-001.** The generated-client variant. One `fetcher.ts`, and UI code
  reaches it through a module service, never directly. Together with Outline's
  hand-written client, Mattermost's 5,500-line class and element-web's SDK peg,
  that is four different implementations of the same rule, which is why FC-001
  names an outcome and not a library.
- **FC-002.** The client is generated, so there is physically nowhere else for
  the base URL or the request shape to be decided.
- **FC-003.** Module `stores/` and `entities/` hold server and persisted state;
  React local state is permitted but not for anything shared. The separation is
  structural here rather than written down, which is evidence that FC-003 can be
  satisfied by a framework instead of a rule.
- **FC-004.** The single best sentence for the rule, from
  `modules/workbench/README.md:25`. One owner of the URL, stated as an identity
  rather than a convention.
- **FC-005.** `yarn typecheck` is `tsc -b` in its own CI job, separate from
  `Lint`.
- **FC-006.** The primary evidence for the mechanism half of the rule, and the
  reason FC-006 says *derive the boundary from the directory name or a tag, never
  from a hand-maintained list*. affine derives it from each package's declared
  dependencies, which is a list the project already has to maintain for other
  reasons. My own `Helios` zone list drifted precisely because it was a list
  maintained for nothing else.
- **FC-007.** Ten boundaries at route, page, dialog and peek-view seams, so a
  broken document does not blank the workbench. The clearest demonstration in
  the set that the right granularity is "a seam whose failure differs from its
  parent's" rather than "the app root" or "every leaf".
- **FC-008.** The strictest setting found: `ignoreVoid: false` means even
  `void somePromise()` fails, so the escape hatch other repos leave open is
  closed. Paired with `useAsyncCallback`, there is effectively no way to fire an
  unhandled async handler from a React event.
- **FC-009.** The canonical implementation. `check-git-status` runs every
  generator and fails if anything moved, and the failure message is the command
  to fix it. `check-yarn-binary` applies the same idea to the package manager
  itself.
- **FC-010.** `AsyncCallbackContext` is the positive form: the default handler
  is `console.error`, so the error has somewhere to go before anybody writes a
  catch block.

## What I did not take, and why

**The DI framework.** It is the most thorough architecture enforcement I found,
and it is one product's framework. Requiring it would be requiring affine, not
describing consensus. FC-003 and FC-006 take the outcomes.

**`modules/<feature>/{entities,services,stores,scopes,events}`.** Five named
layers per feature is a real answer to where code goes, and it is affine's
alone: outline is layer-based at the top, mattermost is folder-by-feature under
`components/`, element-web splits views from structures. Mature products
disagree, so the standard does not name a directory.

**RxJS `LiveData`.** affine needs streams because it is local-first and offline,
which Redux models badly. That is a reason specific to the product. No rule.

**kebab-case file names, lint-enforced.** The enforcement holds and the
choice is arbitrary: three of the four repos pick a different case and each
enforces or documents its own. The standard stays quiet, and this is exactly the
kind of decision Vue's style guide defends ruling on for consistency's sake,
which is a defence that applies to formatting and not to architecture.

**Path aliases.** Same coin flip as outline.

**`yarn dedupe --check` and the PR-title commitlint gate.** Both are cheap and
both work. Neither is a frontend architecture decision, and only affine does
either, so they are notes for an adopter rather than rules.

**`exhaustive-deps` extended to custom hooks.** I wanted this one. It is at
`warn` here, and FC-008's own evidence is that developers ignore warnings, so
taking it as a rule would mean prescribing at a severity the evidence does not
support. One repo, at warn, with undocumented suppressions in the hook it was
written for.
