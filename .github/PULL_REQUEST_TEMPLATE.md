## What and why

<!-- The diff shows the what. Use this space for the why. -->

## If this adds or changes a rule

- [ ] Four or more independently maintained production frontends already do it, named by repository, file and line
- [ ] The failure it prevents is described concretely
- [ ] It is not something mature products split on — where the references disagree, the standard stays quiet
- [ ] A violation is added to `enforce/fixture/`, with an assertion in `enforce/test.mjs`
- [ ] The **deliberate-OK** is added beside it — something that looks like a violation and must not fire
- [ ] The report's `why` reads as a sentence you would say to a colleague who just hit it

## Checks

- [ ] `npm run verify` passes
- [ ] Commits follow [CONTRIBUTING.md § Commits](../CONTRIBUTING.md#commits) — `type(scope): subject`, a body that says why, no `Co-Authored-By`

<!-- CI runs the same suite, but GitHub Actions is currently locked on this
     account over billing and declines to start the jobs, so your local run is
     the one that counts. Say in the PR that it passed. -->
