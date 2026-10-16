# Changelog

## 0.1.1 — 2026-10-16

Nothing about the standard changed. This is the open-source furniture the
first release shipped without, and one thing that was simply broken.

- **The commit convention is held, not just stated.**
  `enforce/commit-check.mjs` checks Conventional Commits with this repo's
  scopes, wired into `npm run verify`, a CI job, and `.githooks/commit-msg`.
  A convention written down and never run is the defect this repo is about,
  one level up. The six commits that predate it are named in
  `PRE_CONVENTION` rather than skipped silently: rewriting a published
  history so the repo looked tidier than it was is the wrong trade here.
- **`enforce/*.mjs` were mode 644** while `package.json` declares a `bin`, so
  an installed `frontend-check` would not have been executable.
- **`package.json`** had no `author`, `homepage` or `bugs` url, and the
  repository's homepage field on GitHub pointed at `design-contract`.
- **The README promised an npm package** without saying it is unpublished.
- Added `SECURITY.md` — which names the two real surfaces, a baseline's paths
  and the ref interpolated into `git diff` for `--since`, and notes that the
  checker loads no config file, so unlike a linter it never executes your
  code — plus `CODE_OF_CONDUCT.md`, this changelog, `CODEOWNERS`, a
  Dependabot config for the pinned actions, a PR template that asks for the
  four references, and issue templates, one of them for a receipt of mine
  being wrong.
- Private vulnerability reporting is now enabled on the repository, which
  `SECURITY.md` had been telling people to use.

## 0.1.0 — 2026-10-16

First release. Twelve rules, the evidence for each read at source, and a
zero-dependency checker that holds all twelve.

- **`standard/STANDARD.md`** — the twelve rules, each with its receipt, its
  enforcement level (🔒 build, 🧪 test, 👁 review) and what it is deliberately
  not saying. Where the references genuinely split — state library, import
  aliases, file naming, forms — the standard stays quiet.
- **`enforce/`** — the checker, no dependencies and no configuration, Node 18
  or newer; a fixture carrying one violation per rule with the deliberate-OK
  beside it; a test pinning all of it.
- **`refs/`** — eight production frontends (Outline, Mattermost, element-web,
  AFFiNE, Grafana, PostHog, immich, lemmy-ui) read locally at a pinned SHA and
  written to one template so they are comparable.
- **`standard/NEXT.md`** — the five type-aware rules with public receipts,
  waiting on a checker that can hold them.

Two receipts of mine were false and are corrected in place, with the
correction visible rather than quietly deleted:

- **FC-004** cited PostHog as restricting `urlToAction` to the scene logic.
  That is written nowhere — it is 122 of 130 files by convention. Supabase is
  now the only repo in the set that writes a URL-state rule down.
- **FC-007** said Mattermost wraps "per post and per plugin". It is two
  separate mechanisms and the HOC has exactly one non-test consumer. The
  verification improved the rule: Mattermost has no app-root boundary at all,
  only interior ones, which is better evidence for FC-007 than what I wrote.

The other seven corrections live in the ref they belong to. The pattern they
share is the best argument in the repo: a rule everyone believes is enforced,
that isn't — outline's `ARCHITECTURE.md:3` says the formatter is CI-enforced
and no workflow runs it; element-web's `code_style.md:22` claims the lint
rules and the guide are kept in perfect sync while five sections have no rule
behind them.

Shipped with the release, after the same failure turned up here:

- **CI.** `enforce/test.mjs` existed and nothing ran it, which made this the
  fifth project to document a gate nobody runs. `.github/workflows/verify.yml`
  runs on push and pull request across Node 18–24, with the test before the
  checker in the same job per FC-012, and asserts the fixture's exit status
  with no pipe. GitHub currently declines to start it: Actions is locked on
  this account over billing, so the jobs are queued and unexecuted and there
  is no badge claiming otherwise.
- **FC-010, in the checker itself.** Baselining the repo against its own
  standard found an empty `catch` in `frontend-check.mjs` swallowing an
  unreadable lint config. Fixed rather than baselined.
- **The plugin.** The README advertised `/plugin marketplace add` with no
  manifests behind it, so the command failed for anyone who tried it.
  `.claude-plugin/` is here, and `enforce/derive-skill.mjs` derives the
  plugin's skill copy from the root `SKILL.md` with a staleness check.
