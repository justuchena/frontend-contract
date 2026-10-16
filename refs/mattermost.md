# mattermost

> Mattermost is a self-hosted team messaging platform; `webapp/` is its React
> client, an npm-workspace monorepo whose shared code is published as packages
> so third-party plugins can depend on it.
> This ref exists for one decision: Mattermost publishes its own list of
> unsettled standards, so its style guide can be trusted on the rules it does
> state.

**Stack.** React with Redux (thunks, `createSelector`) and react-intl, SCSS
co-located per component, webpack, Jest, ESLint with a first-party plugin plus
stylelint, npm workspaces. No Nx, no Turbo: `tsc -b` project references are the
build graph.

**Scale.** 4,229 `.ts`/`.tsx` files under `webapp/` and 4,101 under
`channels/src` alone, with 362 entries under `channels/src/components`. Largest
by `wc -l`: `channels/src/components/admin_console/admin_definition.tsx` 6,809,
`platform/client/src/client4.ts` 5,511,
`channels/src/packages/mattermost-redux/src/reducers/entities/posts.test.ts`
4,911, `channels/src/actions/websocket_actions.ts` 2,694. Contributors signal is
unavailable: my clone is shallow (`.git/shallow` present, one commit in
`git log`).

**Read at.** `502cf7e3e5379ce054bee24e279ec1779911aa38`, committed 2026-09-05.
Verified 2026-10-16. **This is a partial checkout: only `webapp/` and the
root-level docs are present.** There is no `.github/workflows` directory, so
every claim about CI below is reconstructed from the `Makefile` and the npm
scripts that CI calls, and I say so at each point rather than describing a
pipeline I cannot see.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | npm workspaces: `channels/` plus `platform/{client,components,shared,types,eslint-plugin,mattermost-redux}` | root `webapp/package.json` `workspaces` |
| Structure inside the app | Layer-based at the top of `channels/src`, folder-by-feature below `components/` | `channels/src/components/CLAUDE.OPTIONAL.md:4` |
| Feature folder shape | `index.ts` re-export, `my_component.tsx`, `my_component.scss`, `my_component.test.tsx` | `channels/src/components/CLAUDE.OPTIONAL.md:12-15` |
| Shared UI | A published package, not a folder; import by package name only | `AGENTS.md:21` |
| Data layer | One singleton `Client4`, 5,511 lines, every route derived from `getBaseRoute()` | `platform/client/src/client4.ts:277` |
| Base URL and auth | Instance state set once at boot | `client4.ts:171`, `:189-190`, `:217`, `:229-234` |
| Who calls the client | Redux actions only, and bypassing it requires a written reason | `STYLE_GUIDE.md:114`, `:126` |
| New endpoints | Added to `Client4` in `platform/client`, nowhere else | `STYLE_GUIDE.md:127` |
| Error handling in actions | `bindClientFunc`, or try/catch with `forceLogoutIfNecessary` + `logError` | `STYLE_GUIDE.md:115` |
| Action return shape | `{data}` or `{error}`, always | `STYLE_GUIDE.md:113` |
| State split | `state.entities` for server data, `state.views` for web-app state | `STYLE_GUIDE.md:122`, `channels/src/types/store/index.ts:21-25` |
| UI slices | `channels/src/reducers/views/*`, one file per surface | directory, 25+ slices |
| Redux access | `useSelector`/`useDispatch` over `connect` for new components | `STYLE_GUIDE.md:21` |
| Selector memoization | `createSelector` for any new object or array; `makeGet…` factory for parameterised | `STYLE_GUIDE.md:117`, `:119` |
| Batching | A documented rule, not a client feature: bulk from a parent, or `DelayedDataLoader` | `STYLE_GUIDE.md:116` |
| File size | `max-lines` at **warn**, 800 | `platform/eslint-plugin/configs/base.js:420-427` |
| Complexity | Configured at severity 0, so written down and off | `platform/eslint-plugin/configs/base.js:330-333` |
| Module boundaries | `tsc -b` project references plus targeted `no-restricted-imports` | `platform/eslint-plugin/configs/base.js:494-508`, `channels/eslint.config.mjs:61-78` |
| Error handling | A HOC applied at small interior seams, fallback receives `clearError` | `channels/src/components/with_error_boundary/index.tsx:18`, `:34-48` |
| Forms | Undecided, and said so | `STYLE_GUIDE.md:146` |
| Code splitting | One named wrapper, `makeAsyncComponent` | `channels/src/components/async_load.tsx:10`, `STYLE_GUIDE.md:24` |
| File naming | snake_case files and folders | `channels/src/components/CLAUDE.OPTIONAL.md:12-15`, convention |
| Per-directory guidance | Nested `CLAUDE.OPTIONAL.md` beside the code it governs | `channels/src/components/`, `channels/src/reducers/` |

## What they wrote down

`STYLE_GUIDE.md:126-127`, the networking rule, which is the plainest statement
of one-client in any of the four repos:

> - **Client4**: All HTTP should use the singleton `Client4` instance,
>   preferably in a Redux action. In cases where it needs to be bypassed,
>   document the reason for that.
> - **New Endpoints**: New API endpoints should be added to the `Client4` class
>   in the Client package (`platform/client`).

`STYLE_GUIDE.md:113-116`:

> - **Action Results**: Async thunks should always return either an object with
>   a `data` field or an object with an `error` field.
> - **Making Requests Using Client4**: `Client4` should only be used directly in
>   Redux actions. When needed, that data should be cached in Redux.
> - **Handling Client4 Errors**: Actions which use a method of `Client4` should
>   use `bindClientFunc` if possible for convenience and to follow standard
>   error handling. If they don't, the `Client4` call should be wrapped in a
>   try/catch, and the catch block should contain a `forceLogoutIfNecessary` and
>   dispatch a `logError`.
> - **Batching Network Requests**: Batch network requests whenever possible to
>   reduce the number of network requests made. This can be done by either
>   making a bulk request from a parent component containing multiple children
>   or by using an action which uses `DelayedDataLoader`.

`STYLE_GUIDE.md:122`, the state split:

> - **Organizing Redux State**: When adding new fields to the Redux state, put
>   data that comes from the server in `mattermost-redux` and in
>   `state.entities`, and put web app state that needs to be persisted outside
>   of `mattermost-redux` and in `state.views`.

`AGENTS.md:21`, the import form, an anti-rule:

> Always import via the full package name (`@mattermost/shared/...`), never via
> relative paths into `platform/shared/`.

`AGENTS.md:26`, another, on the plugin surface:

> **Do not add new top-level `window.*` globals for plugins.** Publish new
> plugin-facing APIs as sub-namespaces of `window.WebappUtils` instead.

`channels/src/components/CLAUDE.OPTIONAL.md:81`, the test-layer boundary, which
is prose only:

> - **Import Rule**: Never import directly from `@testing-library/react` or
>   `react-dom/test-utils`. All testing utilities (`act`, `screen`,
>   `fireEvent`, `waitFor`, `waitForElementToBeRemoved`, `userEvent`,
>   `renderWithContext`, etc.) must be imported from
>   `tests/react_testing_utils`, which re-exports everything from
>   `@testing-library/react` alongside project-specific helpers.

`channels/src/plugins/published_modals.ts:30` and `:43-44`, two comments that
carry a whole enforcement scheme:

> // Curated allowlist, not an escape hatch for rendering arbitrary core components.

> // Fails the build here if a modal's real props drift from the published contract,
> // instead of silently breaking plugins.

And the section no other repo in the set has. `STYLE_GUIDE.md:136-146`, under
the heading *"Standards Still Needing Refinement or Definition"*:

> These items are gaps identified in the code analysis. They are areas for
> active refactoring and cleanup.

> - **Styling: !important**: Needs to be eliminated. Over 300 instances remain,
>   primarily in legacy modal overrides.

> - **Navigation Utilities**: Mixed usage of getHistory() from browser_history
>   vs. the useHistory() hook from React Router.

> - **Validation & Submission Handling**: Needs Review; validation remains
>   ad-hoc with no shared framework.

> - **useEffect Composition**: Mixed usage; some legacy modules still use single
>   "mega-effects" with internal branching instead of separate effects for
>   separate concerns.

> - **Local Contexts**: Mixed usage; prop drilling persists in many areas, with
>   contexts only used for a few component families like menus.

## How it is held

**By a type, and this is the most interesting mechanism in the set.**
`channels/src/plugins/published_modals.ts` makes `tsc` the enforcer of the
plugin-facing API. The declared contract (`PublishedModalId`,
`PublishedModalIdCandidate`, `PublishedModalProps`) lives in
`platform/shared/src/types/global/`, a package that cannot import the
implementation. The implementation is one literal allowlist closed with
`satisfies Record<PublishedModalId, React.ComponentType<any>>`
(`published_modals.ts:40`), which forces both directions: every published id has
an implementation and no extra id sneaks in. Drift is then caught by a
conditional type that is never used at runtime (`:43-47`):

```ts
type ContractHonored<T extends {[K in PublishedModalId]: ModalData<React.ComponentProps<(typeof publishedModals)[K]>>['dialogProps']}> = T;
type AssertPublishedModalContract = ContractHonored<PublishedModalProps>;
```

If a real component's props change, `tsc -b` fails in that file, at the
boundary, with a name that says what broke, instead of in a plugin months later.
`canOpenPublishedModal` at `:59` is a type guard built from `Object.keys` of the
allowlist, so a plugin on a different app version can feature-detect and have
the check narrow its type. `AGENTS.md` protects the trick from cleanup by naming
it and telling you not to delete the apparently-unused aliases. It costs zero
runtime and zero CI script: it rides a gate that already exists.

**By a script.** All reconstructed from the `Makefile`, since the checkout has
no workflows. `make check-style` (`Makefile:49`) runs `npm run check`, which is
`check:eslint && check:stylelint` (`channels/package.json:184`). `make
check-types` (`Makefile:61`) runs `tsc -b` across workspaces. `make test`
(`Makefile:43`) runs Jest. `make i18n-extract-check` (`Makefile:73`) is a
hand-written drift gate (`channels/package.json:199`): re-extract to a temp
file, `diff` against committed `en.json`, and on failure print *"en.json is out
of sync with code. To update: npm run i18n-extract"*.
`webapp/package.json:23` adds `check-external-links`, a bespoke crawler over
`channels/src` and `platform/*/src` with a named exclusion list and a reason per
entry. `platform/eslint-plugin/rules/` holds first-party rules including
`no-dispatch-getstate` and `use-external-link`.

**By a test.** `channels/src/components/with_error_boundary/index.test.tsx`
covers the error-boundary HOC itself.

**By review.** The testing-library import rule. The `state.entities` versus
`state.views` placement: the types describe the split
(`channels/src/types/store/index.ts:21-25`) but nothing stops a server payload
from landing in a `views` slice. The one file pinned to one person is
`/webapp/channels/src/packages/mattermost-redux/src/store/configureStore.ts`
(`CODEOWNERS:1`), which is review as enforcement for a single file.

**Where the repo's own configuration does not match the repo.** `max-lines` is
set to warn at 800 (`platform/eslint-plugin/configs/base.js:420-427`) and
disabled in tests (`:622`). 104 files under `channels/src` and `platform/*/src`
exceed 800 lines, the largest by a factor of eight. `complexity` is configured
at `:330-333` with severity 0, which means it is a documented preference and not
a rule. Both are honest about their own severity, which is more than most
configs manage, but neither holds anything.

## What I took from it

- **FC-001.** The clearest written form of the rule anywhere, at
  `STYLE_GUIDE.md:126`, including the escape hatch done right: bypassing is
  allowed, with a documented reason. That phrasing is why FC-001 is about the
  data layer rather than about banning an import.
- **FC-002.** `client4.ts` is the proof by scale. Token, CSRF and URL are set in
  one place (`:217`, `:229-234`) and roughly 5,500 lines of routes all derive
  from one `getBaseRoute()` at `:277`. One client with one base URL survived to
  5,500 lines; a second place to put a base URL does not stay one place.
- **FC-003.** The single most quoted sentence behind the rule,
  `STYLE_GUIDE.md:122`, plus the directory layout that implements it. Server
  data and web-app state are not just separate slices, they are separate
  packages.
- **FC-005.** `make check-types` is `tsc -b`, separate from `make check-style`.
  Two targets, two gates.
- **FC-006.** `channels/eslint.config.mjs:72-77` bans
  `@mattermost/*/src/*` with *"Don't include the src folder when importing from
  packages in webapp/platform"*, and `AGENTS.md:21` bans relative paths into
  `platform/shared/`. Both name the allowed form, which is the half of FC-006
  that most configs skip.
- **FC-007.** The strongest evidence for the recovery half. `withErrorBoundary`
  passes `clearError` to the fallback (`index.tsx:34-48`), and
  `components/post/post_error_boundary.tsx` renders *"An error occurred while
  rendering this post."* with a Retry button that calls it. Recovery in place,
  at the smallest seam whose failure differs from its parent's: one post.
- **FC-009.** `i18n-extract:check` is the drift gate in its most copyable form,
  and its failure message names the exact command to run.
- **FC-012.** The error-boundary HOC has a test. Not a CI script, but the same
  instinct: the mechanism everything else leans on gets its own test.

The publishing habit itself is the other thing I took, though it is not a rule:
`STYLE_GUIDE.md:136-146` is the only place in the survey where a project names
its own unsettled decisions. It is what makes the rest of that document
credible, and it is why the standard has a "What this standard does not decide"
section instead of pretending to twelve complete answers.

## What I did not take, and why

**Redux.** Same reason as MobX. FC-003 rules on the container, not the library.

**Folder-by-feature under `components/`.** 362 feature folders works here
because plugins consume the packages, not the folders. Outline's layer-based
tree works for the same reasons that do not apply here. Mature products
disagree, so the standard stays quiet on structure and FC-006 talks about entry
points.

**snake_case file names.** element-web mandates upper camel case, affine
lint-enforces kebab-case, mattermost uses snake_case. Three repos, three
answers, all internally consistent. The standard does not pick one.

**`max-lines`.** Mattermost is the only one of the four with a numeric size
rule, it is a warning, and 104 files exceed it. That is evidence against the
rule, not for it.

**`{data}` or `{error}` as the action return shape.** It is a real convention
and it works, but it is a Redux-thunk idiom. lemmy-ui's discriminated
`RequestState<T>` is strictly better as a representation of request state, and
outline, element-web and affine each do something different again. There is no
consensus to codify, so the standard does not prescribe a request-state shape.

**Forms.** Mattermost says at `STYLE_GUIDE.md:146` that validation is ad-hoc
with no shared framework. element-web hand-rolls per dialog, affine uses
`react-hook-form` only in its admin package. Only outline has decided. One repo
is not evidence, so the standard says nothing about forms, and this is the
largest genuinely open hole in the set.

**The published-contract type trick, as a rule.** I took it as the lesson behind
FC-009 and FC-005 (the cheapest enforcement rides a gate you already have), but
I did not make it a rule. It needs an external consumer to be worth its cost,
and most frontends do not have one.
