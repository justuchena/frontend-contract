---
name: frontend-contract
description: Build a frontend that is structurally coherent. Use when creating or extending any web application's structure, data layer, state, module boundaries, flows, error handling or CI gates; when setting up a new frontend project; when reviewing frontend architecture; or when deciding where a file, a fetch or a piece of state belongs. Carries twelve rules that four production frontends already agree on, the evidence for each, and a zero-dependency checker that holds all twelve.
license: see LICENSE and NOTICE at the repo root
---

# frontend-contract

Twelve rules, with the reasoning in `standard/STANDARD.md`. All twelve are checked by
`enforce/frontend-check.mjs`, which needs no configuration.

Run the checker before you report work finished:

```bash
node enforce/frontend-check.mjs .
```

## The rules, short

1. **FC-001** One server client. View code never calls it; it goes through a data layer.
2. **FC-002** Base URL, auth, CSRF and status-to-error mapping live in that client, set once.
3. **FC-003** Server data is not copied into component state. It lives in a cache that knows it is server data.
4. **FC-004** The URL is the router's. Whatever belongs in it is synced at the route level only, by one owner.
5. **FC-005** Typecheck is its own CI gate, separate from lint.
6. **FC-006** Importing another module means importing its entry point. Derive the boundary from the directory name or a tag, never from a hand-maintained list.
7. **FC-007** Every seam whose failure differs from its parent's declares its own error UI, and that UI offers a way out.
8. **FC-008** A floating promise is an error, not a warning.
9. **FC-009** Generated output is committed, and CI regenerates it and fails on a diff.
10. **FC-010** A catch either reports, or carries a comment saying what is lost.
11. **FC-011** A check that reports a violation exits non-zero. Reporting-only is an explicit flag.
12. **FC-012** A script that can block a merge has tests, and they run before it is trusted.

## What this standard does not decide

State library, import-alias convention, file-naming case, form library,
breakpoints. Mature products genuinely disagree on all of these. If the project
has already chosen, follow the project. Do not introduce a second answer.

## Phrasing

Every rule is an outcome plus a trigger, never a folder name or a library. If a
rule seems to require a `features/` directory, a CSS-in-JS file or a React
`ErrorBoundary`, you are reading a React assumption into it: in a file-routed
framework the router is already the feature tree, and the error-UI equivalent
is a route-level error page.

## If you cannot follow a rule

Say which rule, and why, in the pull request. Do not suppress it silently, and
do not add a second way of doing something that the project already does one
way.
