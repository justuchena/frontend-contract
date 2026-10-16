# Grafana

> Grafana is an observability and dashboarding product whose frontend is a
> single large React app plus a set of published `@grafana/*` packages.
> This ref exists because Grafana decided enforcement *identity* better than
> anyone else I read: every policy is a named rule, so a backlog can be
> recorded per policy, counted per policy, and burned down per policy.

**Stack.** React 19 with function components; TypeScript; Redux Toolkit slices
plus RTK Query for data (`AGENTS.md:130`); Emotion CSS-in-JS via `useStyles2`;
webpack and rspack side by side (`package.json:15-21`); Yarn workspaces driven
by Nx, with the task graph keyed on tags rather than paths (`nx.json:17-28`).

**Scale.** 7,176 `.ts`/`.tsx` files and 1,197,451 lines under `public/app` plus
`packages/grafana-eslint-rules` in this checkout. Largest file by `wc -l`:
`public/app/features/dashboard-scene/scene/DashboardScene.test.tsx` at 4,565
lines; largest non-test file `public/app/features/alerting/unified/mockGrafanaNotifiers.ts`
at 3,675, and the largest real component is
`public/app/features/dashboard-scene/scene/DashboardScene.tsx` at 2,096.
Contributor and commit-history signals are not readable here: the clone is
sparse and depth-1, so `git log` holds one commit. `AI_POLICY.md:44` is the
honest proxy, since it is written in terms of volunteer reviewer time.

**Read at.** `3b40a770d3ea3e15a3045057e15630069ef27972`, 2026-10-16
(`Revert "Authz: Honor existing alerting config permissions" (#135224)`), read
2026-10-16. Sparse checkout: `public/app`, `packages/grafana-eslint-rules`,
`.github`, `scripts/cli`, `contribute`, root configs. Anything about
`packages/grafana-ui/src` internals or `e2e-playwright/` I could not open, and
I do not claim it below.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | Five named trees under `public/app`: `core/`, `features/`, `plugins/`, `types/`, `store/`, with features by domain | `AGENTS.md:124-128`; feature-internal layout at `contribute/style-guides/frontend.md:307-324` |
| Data layer | RTK Query, and generated clients preferred over hand-written endpoints | `AGENTS.md:130`; `public/app/features/alerting/unified/AGENTS.md` ("always prefer the auto-generated clients from `@grafana/api-clients`") |
| State split | One typed store; `react-redux` hooks banned outright so nothing reaches the store untyped | `eslint.config.js:73-77` |
| State that may not be state | `localStorage`, `config.apps`, `config.panels`, `config.datasources`, `config.featureToggles` each banned by their own named rule | `packages/grafana-eslint-rules/rules/no-restricted-syntax.cjs` |
| URL state | Router-owned, no written rule found in this checkout | not documented; I note the gap rather than infer one |
| Module boundaries | Four stacked mechanisms, all derived from a name or a path, never from a hand-kept list | `eslint.config.js:41-102` (composable base), `:542-556` (one generic zone), `rules/no-plugin-external-import-paths.cjs:15-29` (path-derived), `:679-692` (no barrels) |
| Error handling | `ErrorBoundary`/`ErrorBoundaryAlert` at interior seams, each with a `boundaryName` | `public/app/core/components/AppChrome/AppChrome.tsx:189`, `.../FullscreenWorkspace/FullscreenWorkspaceShell.tsx:115` |
| Forms | `react-hook-form` v7, with a worked reference directory named | `public/app/features/alerting/unified/AGENTS.md` |
| File naming | Named after the primary export: PascalCase for a class or component, camelCase for a function; kebab-case directories | `contribute/style-guides/frontend.md:82-98` |
| Code splitting | One named wrapper, `SafeDynamicImport`, used per route | `public/app/core/components/DynamicImports/SafeDynamicImport.tsx:5`, applied at `public/app/routes/routes.tsx:58` |
| Typecheck | Its own CI job, separate from lint, and run twice (full plus smoke) | `.github/workflows/frontend-lint.yml:96,116-117`; script at `package.json:80` |

## What they wrote down

The header comment on the generated-rules module is the single most useful
sentence in the repo for my purposes (`packages/grafana-eslint-rules/rules/no-restricted-syntax.cjs:3-5`):

> ```
> // This is a bit different - instead of defining a custom rule manually, we use
> // eslint-no-restricted to turn no-restricted-syntax config into actual eslint rules.
> // This gives them individual rule names for suppression and reporting.
> ```

That module turns 13 selector/message pairs into 13 named rules, which
`packages/grafana-eslint-rules/index.cjs:26` spreads into the plugin beside the
ten hand-authored ones. 23 rule names, one plugin.

Why the plugin is not published (`packages/grafana-eslint-rules/README.md:3`):

> "This package contains custom eslint rules for use within the Grafana codebase only. They're extremely specific to our codebase, and are of little use to anyone else. They're not published to NPM, and are consumed through the Yarn workspace."

Messages that name the replacement rather than only refusing:

> `Direct usage of localStorage is not allowed. import store from @grafana/data instead`
> (`rules/no-restricted-syntax.cjs:16-19`)

> `getDataSourceSrv is being phased out in Grafana core. Use the async data source APIs from @grafana/runtime instead (getDataSourceInstance, getDataSourceInstanceSettings, getDataSourceInstanceList). See the migration guide https://github.com/grafana/grafana/issues/125083.`

> `Usage of legacy config.featureToggles is no longer allowed. Use OpenFeature feature flags instead.`

> `Import '{{importPath}}' reaches outside the '{{pluginRoot}}' plugin directory. Plugins should only import from external dependencies or relative paths within their own directory.`
> (`rules/no-plugin-external-import-paths.cjs:90-91`)

The import bans carry their reason in the message too
(`eslint.config.js:41-89`): `@grafana/ui/src/*` and siblings get *"Import from
the public export instead."*; `react-redux`'s hooks get *"Please import from
app/types/store instead."*; `\.test$` gets *"Do not import test files. If you
require reuse of constants/mocks across files, create a separate file with no
tests"*.

The anti-rules, which are the ones I value most:

> "Used to find all instances of `theme` tokens being used in the codebase and emit the counts as metrics. Should **not** be used as an actual lint rule!"
> (`packages/grafana-eslint-rules/README.md:175`, on `theme-token-usage`)

> "Never include links (Slack, GitHub, Jira, etc.) in code comments."
> (`AGENTS.md:38`)

> "Only add a comment when it explains **why** something is done or reveals non-obvious logic that a reader must know to safely change the code. If the code is self-explanatory, no comment is needed."
> (`AGENTS.md:37`)

And a rule about where return types are *not* enforced, stated against
themselves (`contribute/style-guides/frontend.md:271`):

> "Specify function return types explicitly in new code. … **Note:** Linting is not enabled for this issue because there is old code that needs to be fixed first."

Component form, as a bad/good pair (`frontend.md:343-356`):

> ```
> // bad
> export const Component: React.FC<Props> = (props) => { ... }
> // good
> export function Component(props: Props) { ... }
> ```

Export policy (`frontend.md:325-333`): *"Avoid using default exports"*, and
*"Export only the code that is meant to be used outside the module."*

`AI_POLICY.md` regulates volume rather than disclosure:

> "Aim at having no more than 3 PRs open at any given time." (`AI_POLICY.md:44`)
> "Keep changes focused and of manageable size. (maximum 500 lines of code)" (`:48`)
> "❌ Open a 3,000-line AI-generated pull request that maintainers cannot review effectively." (`:89-93`)

## How it is held

**By a script or a type.** The bundle gate is the clearest one.
`.github/workflows/pr-bundle-size.yml:18` sets `MAX_BUNDLE_SIZE_INCREASE: 51200`
(50.0 KiB of raw `fs.stat` bytes, not gzipped). `:53` resolves the baseline with
`base_sha="$(git merge-base "$HEAD_SHA" "$BASE_SHA")"`, a matrix leg builds each
side, and `:128-131` runs `scripts/cli/checkBundleSize.mjs` over the two stat
blobs. The comparison is per entrypoint asset group, not a total:
`checkBundleSize.mjs:19-29` unions both key sets, defaults a missing side to
`0`, and flags `change > maxIncrease`. Strictly greater, so an increase of
exactly 51200 passes. `parseBundleSizes` (`:4-17`) throws on a malformed line
rather than tolerating it.

**By a self-pruning baseline.** `eslint-suppressions.json` is 92,576 bytes
holding 603 file entries across exactly 13 rules, and its shape is file to rule
to `{count}` with no line or column, so moving code inside a file does not
churn it. I recounted it: `@typescript-eslint/no-explicit-any` 590 violations,
`consistent-type-assertions` 301, `@grafana/require-no-margin` 249,
`@grafana/no-config-feature-toggles` 245, down to
`@grafana/no-config-panels` 1. Nine of the 13 are Grafana's own rules, which is
what lets them ship a brand-new hand-written rule at `error` on day one. The
ratchet tightens without anyone being asked (`lefthook.yml:13-19`):

> ```yaml
>     frontend-lint:
>       glob: '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'
>       run: |
>         yarn eslint --ext .js,.jsx,.ts,.tsx,.mjs,.cjs,.mts,.cts --cache --prune-suppressions --fix {staged_files} &&
>         git add eslint-suppressions.json &&
>         yarn prettier --write {staged_files}
>       stage_fixed: true
> ```

and the file is owned by a bot so it never reaches human review
(`.github/CODEOWNERS:1205`: `eslint-suppressions.json @grafanabot`).

**By a test, in the same job that trusts the script.**
`.github/workflows/pr-bundle-size.yml:118` runs
`node --test scripts/cli/checkBundleSize.test.mjs` before `:128` uses the
checker. The test pins the boundary exactly: `app.js` moving 100000 to 151201 is
`tooLarge: true`, `dark.css` moving 20000 to 71200 is `change: 51200,
tooLarge: false`, and a new entrypoint with no base side is measured against
zero.

**By a live comparison instead of a file.** `frontend-lint.yml:280-346` checks
the PR into `./pr` and `grafana/grafana@main` into `./main`, runs madge in each,
and fails if the PR's circular-dependency count is higher. Two full installs
per PR buys a baseline that cannot go stale.

**By review only.** The squad-level direction is prose with nothing behind it:
`public/app/features/alerting/unified/AGENTS.md` says *"Our direction is to use
RTK Query for data fetching, NOT Redux"* and marks Redux Toolkit *"Avoid for
new features"*, but nothing mechanical distinguishes a new RTK Query endpoint
from a new slice. The same is true of reducer purity and of the return-type rule
quoted above.

## What I took from it

- **FC-006** (deep imports fail, and the error names the allowed path). The
  per-message naming habit is Grafana's, and so is the scaling property I
  actually prescribe: `rules/no-plugin-external-import-paths.cjs:15-29` parses
  the owning root out of the filename with one regex and returns an empty
  visitor outside a plugin, so the config does not grow when the codebase does.
  `eslint.config.js:542-556` is the same idea in config form, one generic zone
  plus a glob list.
- **FC-005** (typecheck is its own gate). `frontend-lint.yml:96,116-117`.
- **FC-011** (a check that reports a violation exits non-zero). Grafana wrote my
  own failure down before I did: `css:probe` was authored and never wired in, so
  it ran only when somebody remembered.
- **FC-012** (the gating check is itself tested, in the same job). The
  `node --test` step at `pr-bundle-size.yml:118` is the whole rule, and the
  strictly-greater boundary is only knowable because that test exists.
- **FC-009** (generated output is committed and CI fails on a diff). The theme
  SASS and API-client regeneration steps in `frontend-lint.yml`.
- **Adoption**, the whole section. The counts-not-positions baseline shape, the
  `--prune-suppressions` pre-commit, the bot owner, and "one named rule per
  policy" all come from here, and the last of them is quoted verbatim in the
  standard.

## What I did not take, and why

**The 23 rules themselves.** They are specific to Emotion, to
`@grafana/e2e-selectors`, to one theme object, and the README says so
(`packages/grafana-eslint-rules/README.md:3`). I took the shape, not the
contents.

**A bundle-size rule.** The number 51200 is Grafana's build, Grafana's
entrypoint count and Grafana's CDN. A standard that ships a byte budget would be
asserting a figure it cannot justify for anyone else, and of the repos I read
only this one gates on bytes at all. So the standard stays quiet on budgets and
keeps only the mechanism lesson (FC-012).

**Redux Toolkit, or any state library.** Four mature products, four answers, all
defended. FC-003 rules on the container split and says nothing about the
container.

**Emotion, `useStyles2`, and the whole styling axis.** That is
[design-contract](https://github.com/justuchena/design-contract)'s territory,
not this repo's.

**The per-codeowner coverage ratchet** (`scripts/compare-coverage-by-codeowner.js:17`,
`DROP_TOLERANCE_PCT = 0.02`). I like it, but it needs a generated
CODEOWNERS-to-files manifest and an opt-in per team, which is organisational
machinery a zero-config checker cannot assume. It is in the Adoption reasoning,
not in a rule.

**File naming.** `frontend.md:82-98` is a clear, defensible scheme, and PostHog,
immich and lemmy-ui each use a different one. Mature products disagree here, so
the standard stays quiet.
