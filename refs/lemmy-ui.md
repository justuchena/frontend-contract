# lemmy-ui

> lemmy-ui is the web client for Lemmy, a federated link aggregator, built on
> Inferno with server-side rendering and class components.
> This ref exists for one decision, and it is the single most valuable idea in
> the whole reference set: every server-backed field is a discriminated union
> with four states, so "failed" cannot be represented as "empty".

**Stack.** Inferno 9 with class components, SSR from an Express server;
TypeScript; no state library at all, state lives in the page component's
`this.state`; `lemmy-js-client` as the published API client, wrapped by one
singleton; Bootstrap SASS; webpack; prettier and ESLint; Woodpecker CI.

**Scale.** 260 files under `src`, of which 203 are `.ts`/`.tsx`, 47,429 lines in
those. Largest file by `wc -l`:
`src/shared/components/person/settings.tsx` at 2,140, then
`person/profile.tsx` 1,803, `post/post.tsx` 1,715, `community/community.tsx`
1,595. Those are page components holding their own state, and they are the
largest files in any frontend in this set relative to the codebase. There are no
test files anywhere in the repo. The clone is full on disk but depth-1, so I
cannot read contributor counts or cadence from `git log`; HEAD's date is the
only recency signal.

**Read at.** `c277a8adba68faa39f76a72716bae319e4cd09b8`, 2026-09-01
(`Update dependency sass-loader to v17.0.1 (#4318)`), read 2026-10-16. Full
working tree, no sparse checkout, so everything below is checked in the source.
`node_modules` is absent, so the definition of `RequestState<T>` itself lives in
a package I could not open; I describe it from its re-export and its use sites.

## The decisions

| Decision | What they chose | Where it is written or enforced |
| --- | --- | --- |
| Top-level structure | `src/{assets,client,server,shared,embedded}`, with `shared/{components,services,utils}` and components grouped by domain | measured; `src/shared/components/` is `common/ 69`, `home/ 25`, `post/ 13`, `community/ 12`, `person/ 11`, `multi-community/ 9`, `app/ 7`, `comment/ 4`, `private_message/ 4`, `mixins/ 3` |
| Data layer | One singleton with a private constructor and a `static get client()` | `src/shared/services/HttpService.ts:19-33` |
| Base URL | Read once from `getBackendHostExternal()` in that constructor | `src/shared/services/HttpService.ts:23` |
| Who may call the client | Nothing stops a component. 39 of the 49 files referencing `HttpService` are under `src/shared/components` | measured |
| Request state | `RequestState<T>`, a discriminated union over `"empty" \| "loading" \| "success" \| "failed"`, with `EMPTY_REQUEST` and `LOADING_REQUEST` constants | re-exported at `src/shared/services/HttpService.ts:5-13`, defined in `lemmy-js-client` |
| Loading flags | None. `isLoading` appears 0 times in `src` | measured |
| State split | Server data and view flags both live in the page component's `this.state`, but server data is typed as `RequestState<T>` and view flags as plain booleans | `src/shared/components/home/home.tsx:137-150` |
| URL state | Each page declares a typed `getQueryParams<Props>` mapping at module level; the parser is one shared function | `src/shared/utils/helpers.ts:76-92`, 17 page components declare one |
| Module boundaries | Absolute imports of the source top-level directories are banned in favour of relative ones; three `@`-prefixed aliases are permitted | `eslint.config.mjs:78-88`; aliases at `tsconfig.json:21-26` |
| Error handling | No error boundary anywhere. `componentDidCatch` appears 0 times. Instead an SSR-side `ErrorGuard` renders `ErrorPage` when the isomorphic payload carries error data, and reloads on unmount so the error does not survive the next route | `src/shared/components/common/error-guard.tsx:8-25` |
| Error reporting at the call site | `res.state === "failed"` guards plus a `toast(..., "danger")` | `src/shared/components/home/home.tsx:1320` |
| Forms | Hand-rolled `<form onSubmit>` with module-level handler functions taking the component as the first argument | `src/shared/components/home/authenticate/login.tsx:106,180` |
| File naming | kebab-case files, lowercase directories, one page component per file | convention; no written rule |
| Code splitting | Lazy loading only for three heavy optional dependencies (translations, date-fns, highlight.js), with a reporting harness that counts failed dynamic imports | `src/shared/utils/dynamic-imports.ts:7-17` |
| Typecheck | `tsc --noEmit`, but inside the `lint` script, not as its own gate | `package.json:16` |

## What they wrote down

lemmy-ui documents almost nothing in prose. Its prescriptive statements are
lint rules, and they are unusually well commented for lint rules.

The `removeEventListener` rule, with its test cases written into the comment
(`eslint.config.mjs:101-120`):

> ```js
>       "no-restricted-syntax": [
>         "error",
>         /* To figure out the node types and hierarchy, set the info view to ESTree in the
>          * typescript-eslint Playground (https://typescript-eslint.io/play/) and move the cursor in
>          * the code view to the positions you're interested in.
>          *
>          * For the selector syntax: https://eslint.org/docs/latest/extend/selectors
>          */
>         {
>           /* Expected to catch:
>            * document.removeEventListener("", () => {});
>            * document.removeEventListener("", function () {});
>            * document.removeEventListener("", function notAnon() {});
>            */
>           selector:
>             "CallExpression[callee.property.name=removeEventListener] > :matches(FunctionExpression, ArrowFunctionExpression):nth-child(2)",
>           message:
>             "removeEventListener has to be called with the same listener as addEventListener. You are passing a new function.",
>         },
>       ],
> ```

That message states a correctness fact rather than a preference: a new function
literal in the second argument position means the listener is never removed.

The DOM-access anti-rule (`eslint.config.mjs:89-100`):

> ```js
>       "no-restricted-properties": [
>         "error",
>         {
>           object: "document",
>           property: "getElementById",
>           message: "Use createRef instead",
>         },
>         {
>           property: "querySelector",
>           message: "Use createRef instead",
>         },
>       ],
> ```

Note the second entry has no `object`, so any receiver's `querySelector` is
caught, at the cost of false positives.

And the import rule, which is the opposite of what three of the other four
repos in this set enforce (`eslint.config.mjs:78-88`):

> ```js
>       "no-restricted-imports": [
>         "error",
>         {
>           patterns: [
>             {
>               group: ["assets/*", "client/*", "server/*", "shared/*"],
>               message: "Use relative import instead.",
>             },
>           ],
>         },
>       ],
> ```

**Where this is more subtle than it reads.** The rule bans importing the source
top-level directories as absolute specifiers, not aliases as such: `tsconfig.json:21-26`
defines `@/*`, `@utils/*`, `@services/*` and `@components/*`, and the codebase
uses them constantly, including in the first two lines of
`src/shared/services/HttpService.ts`. So the accurate statement is that
lemmy-ui requires relative imports for the five source trees and permits three
curated `@`-prefixed entry points. It is still a deliberate inversion of the
alias-everything convention, and still a genuine coin flip; it is not a blanket
ban on aliases, and my own earlier notes overstated it.

## How it is held

**By a type, and this is the whole point.** Every server-backed field in a page's
state is declared as `RequestState<T>`
(`src/shared/components/home/home.tsx:138-139`):

> ```ts
> interface HomeState {
>   postsRes: RequestState<PagedResponse<PostView>>;
>   commentsRes: RequestState<PagedResponse<CommentView>>;
> ```

initialised to the empty member rather than to `undefined` or `null`
(`:295`, `postsRes: EMPTY_REQUEST,`), moved to loading explicitly when a fetch
starts (`:1070`, `this.setState({ commentsRes: LOADING_REQUEST, postsRes:
EMPTY_REQUEST })`), and rendered by switching on the tag (`:777`):

> ```tsx
>       switch (this.state.postsRes?.state) {
>         case "empty":
>           return <div style="min-height: 20000px;"></div>;
>         case "loading":
>           return <PostsLoadingSkeleton />;
>         case "success": {
>           const posts = this.state.postsRes.data.items;
> ```

`data` is reachable only inside the `"success"` arm, because it exists only on
that member of the union. That is the mechanism: the compiler refuses to let you
read the payload of a request that has not succeeded, and it refuses to let the
four states collapse into two. 157 `RequestState<` annotations across 38 files,
399 comparisons against a state tag, and `isLoading` appears zero times in the
entire source tree.

The honest limit: `case "failed"` appears only 3 times, in
`home/authenticate/login.tsx:247`, `signup.tsx:337` and
`home/oauth/oauth-callback.tsx:120`. Elsewhere failure is handled with an
`if (res.state === "failed")` guard before the render switch, 44 references to
`"failed"` in total, and a `toast(..., "danger")` at the call site
(`home.tsx:1320`). So the union makes failure *representable and
distinguishable*, which is the valuable part; it does not force a failure branch
in the render path, because TypeScript's exhaustiveness checking is not switched
on for these switches. The guarantee is "you cannot mistake failed for empty",
not "you must render failed".

**By lint, on three narrow things.** The three rules above, plus
`@typescript-eslint/no-unused-vars` and `eqeqeq`, both `error`.
`pnpm lint` is `translations:generate && tsc --noEmit && eslint
--report-unused-disable-directives && pnpm prettier:check` (`package.json:16`),
so a stale `eslint-disable` also fails.

**By CI, barely.** `.woodpecker.yml` runs, on pull requests only:
`prettier --no-config --arrow-parens avoid -c .` (`:14-17`), `shfmt -i 2 -d` over
shell scripts (`:21-27`), `pnpm i`, `pnpm lint` (`:38-42`), and
`pnpm build:dev` (`:46-51`). There is no test step, because there are no tests.
Typecheck is not a separate gate: it is the second command inside `pnpm lint`,
so a type error and a formatting error produce the same single red step.

**By review only.** Everything else. Nothing prevents a component from calling
`HttpService.client` directly, and 39 component files do. Nothing enforces file
size, and four page components are over 1,500 lines.

**Not held at all.** No error boundary; `componentDidCatch` has 0 occurrences.
`src/shared/components/common/error-guard.tsx` is an SSR payload check, not a
runtime catch: it renders `ErrorPage` when the isomorphic data carries error
data, and forces `window.location.reload()` on unmount with the reason inline,
*"Without reload the error data is still present at the new route"* (`:11`). A
render-time throw in a page component has nothing above it.

## What I took from it

- **FC-003** (server data and client state live in separate containers), from an
  unexpected direction. lemmy-ui has one container, `this.state`, and still
  separates the two by *type*: server-backed fields are `RequestState<T>`, view
  flags are plain booleans. That is the proof that FC-003 is about a container
  that knows it is server data, not about a library. It is also why FC-003's
  level reads "build where the shape is detectable": here the shape is the
  detectable thing.
- **FC-004** (the URL has one owner, synced at one level). Each page declares one
  typed `getQueryParams<Props>` mapping, and the parsing lives in a single shared
  function (`src/shared/utils/helpers.ts:76-92`). One owner per route, written as
  a type.
- **FC-001** and **FC-002**, as the counter-example that sharpens them. The
  singleton is textbook, private constructor and all
  (`HttpService.ts:19-33`), and nothing stops 39 component files reaching
  through it. One client is necessary and not sufficient; FC-001 needs its second
  clause about view code, and lemmy-ui is why.
- **FC-007** (error UI at interior seams, with a way out), as the other
  counter-example. Zero boundaries in 47,429 lines, and the one error surface
  recovers by reloading the window.
- **FC-005** (typecheck as its own gate), again as the counter-example: burying
  a real `tsc --noEmit` inside the lint script makes a type failure and a
  prettier failure indistinguishable in CI.
- **The one idea I would put above all the others in this set.** A request has
  four states, the type says so, and no boolean shadows it. Nothing else I read
  makes "failed" unrepresentable as "empty" at the type level. outline reduces it
  to `{data, error, loading, loaded}` booleans, Mattermost to a thunk returning
  `{data}` or `{error}`, element-web leaves it per view model. This is the choice
  I would make.

## What I did not take, and why

**`RequestState<T>` as a twelfth-rule candidate.** I wanted to, and I could not
justify it. The standard's bar is that four or more independently maintained
production frontends already made the decision the same way, and on this one
exactly one did. Writing it as a rule would be me expressing taste while
claiming consensus, which is the specific failure mode the standard's closing
section commits against. So it lives here, argued, with its evidence, and not in
the rules.

**The relative-imports-only position.** A genuine coin flip: lemmy-ui goes one
way, Grafana, PostHog and immich go the other. The standard's not-deciding list
names the import-alias convention for exactly this reason.

**Class components, and state in the page component.** Defensible on Inferno
with SSR, and the cost is visible in the file sizes: four page components over
1,500 lines, the largest 2,140. I did not take it and I did not write a rule
against it either, because file size is another place mature products disagree:
Mattermost warns at 800 lines, element-web rules on what is in a file instead,
Grafana and immich say nothing.

**No tests.** Not a decision to learn from. It is the reason FC-012 is worth
stating at all: a repo whose CI cannot fail on behaviour is held entirely by
`tsc` and one reviewer, and lemmy-ui is what that looks like at 47k lines.

**`document.querySelector` banned with no `object`.** I like the rule and the
receiver-agnostic form is the same trick Grafana uses for
`config.featureToggles`, trading false positives for coverage. But "use a ref"
is framework-specific phrasing, and a standard written as outcome plus trigger
has nowhere to put it.
