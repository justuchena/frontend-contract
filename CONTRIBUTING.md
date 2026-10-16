# Contributing

Thanks for looking. One kind of contribution here has an unusual bar, and it
is worth stating before you spend an evening on it.

## The bar for a new rule

**I did not choose the twelve rules in [`standard/STANDARD.md`](standard/STANDARD.md), and I
cannot choose the thirteenth either.** Each one is a decision that four or more
independently maintained production frontends already made the same way, read
at source, and written up in [`refs/`](refs/INDEX.md) so you can check me.

That is the whole claim this repo makes. A prescriptive standard that is
zero-config has no design doc to point at when someone asks "who says?", so
the only answer it has is the evidence. One rule resting on my taste costs
the other twelve their authority.

So a rule proposal needs five things:

1. **Four or more references that already do it**, named by repository, file
   and line. Not blog posts, not framework documentation, not a style guide —
   source. A write-up in `refs/` is the form: read the repo, fill the
   template, and say what the repo does rather than what its docs claim.
2. **A failure it prevents**, concretely. What breaks, in what order, when the
   rule is absent. "The model invents a second fetch path per file" beats "it
   is cleaner".
3. **Nothing that mature teams split on.** Where the references disagree, the
   standard stays quiet — it does not pick your state library, your
   import-alias convention, your file naming or your form library, because the
   references genuinely split on all four. If your candidate rule has two
   defensible answers in production, it is a preference.
4. **A fixture case** in [`enforce/fixture/`](enforce/fixture), and an assertion in
   [`enforce/test.mjs`](enforce/test.mjs). A rule with no fixture is a rule that will quietly
   stop working.
5. **A deliberate-OK beside it** — something that looks like a violation and
   must not fire. This is the part people skip and the part that decides
   whether the rule survives a real codebase. The first FC-004 flagged 68
   legitimate `goto` calls in immich before I narrowed it; FC-007 produced 44
   false findings in PostHog.

A rule that cannot be checked mechanically can still land — FC-005, FC-009 and
FC-012 are gates, not code patterns — but it needs the same evidence, and
`standard/NEXT.md` is where it waits if the checker cannot hold it yet.

## Correcting me

**The most valuable contribution is showing that a receipt is false.** Writing
`refs/` produced nine corrections to my own claims, two of them in the
published standard, and they are fixed in place with the correction visible
rather than quietly deleted. That is the posture — a repo whose argument is
"people believe rules are enforced that aren't" cannot be precious about its
own.

So: if a cited file no longer says what I said it says, or a count is wrong,
or a rule fires on something defensible, open an issue with the line. A false
positive report is worth more than a feature.

## Everything else, all welcome

- **Fixing a false positive.** Include the source line that fired and why it
  is legitimate.
- **A new reference.** Eight are in `refs/`. A production frontend in a
  framework the set under-covers — Angular, Solid, anything mobile-web — would
  make the next rule better evidenced. Use the existing template.
- **Typos and broken links.** Always fine, no issue needed.

## Before you open a PR

```bash
npm run verify
```

That runs the checker's own tests, the staleness check on the plugin's skill
copy, and the repo under its own standard. It is the same thing CI runs on every push and
pull request — except that Actions is locked on my account for a billing
reason and GitHub is declining to start the jobs, so for now your local run is
the only one that happens. Say in the PR that it passed.

`enforce/self-baseline.json` records the findings this repo keeps on purpose:
the fixture's one-per-rule violations, plus FC-005 on `package.json`, which
fires because the fixture's `.tsx` files live inside a repo that has no
TypeScript of its own. If your change moves them, rewrite it with `npm run
baseline` and say in the PR why the new set is right.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), checked:

```
type(scope): subject

A body that explains why. The diff already shows the what.
```

```bash
node enforce/commit-check.mjs --range origin/main..HEAD
git config core.hooksPath .githooks   # or check it as you write it
```

**Types** — `feat` `fix` `refactor` `docs` `test` `chore` `style` `build`
`ci` `perf` `revert`.

**Scopes** — `repo` `standard` `next` `refs` `enforce` `fixture` `skill`
`plugin` `licence` `deps` `ci`. Several are allowed when a change genuinely
crosses areas (`docs(standard,refs): …`). A scope outside the list usually
means the change is wider than it looks, so add one only when a real area
appears.

**`!` before the colon** for a breaking change: `feat(enforce)!: …`.

What the check fails on: a subject that does not match the format, an unknown
type or scope, a full stop at the end of the subject, `Update`/`changes`/`wip`
as the opening word, a missing blank line before the body, and a
`Co-Authored-By` trailer. What it only warns about: sentence case (a rule id
or a filename is a legitimate exception, and a check that cannot hold its own
exception should not fail a build), a missing body, and a subject over 150
characters.

The first six commits in this repo predate the convention. They are named in
`PRE_CONVENTION` in the checker rather than skipped silently, because
force-pushing a public history to make this repo look tidier than it was would
be the wrong trade for a project whose whole argument is honest receipts.

## Licence

Apache-2.0. By contributing you agree your contribution is licensed under it.
