# The next five rules, and the evidence for each

These are not in v0.1. They need type-aware analysis — the checker has to know
what a module *does*, not where its files sit — and they are the half of this
standard that nothing else enforces. Every architecture tool surveyed stops at
the import graph and the folder tree.

They are written down now because the evidence came in now, and because a rule
whose receipt arrives after the rule is a preference with a citation bolted on.

Each receipt below is a **fixed** defect, described by the project that fixed
it. Citing a merged fix praises the fix. Where an issue is still open I say so.

---

## FC-101 — A success state must be caused by a verified response

Not by a route match, a timer, a redirect, or an `await` that resolved.

**PostHog [#113787](https://github.com/PostHog/posthog/pull/113787)** (merged)
is the clearest statement of both the symptom and the mechanism:

> The success toast is false. The API rejected the save and stored nothing, so
> the setting reverts on reload.

> the settings form awaits the `updateSource` loader. The loader catches a
> rejected request and resolves, so the code after the `await` always runs.

That second sentence is the rule's whole reason for existing. A caught
rejection that resolves is indistinguishable from success to everything
downstream, and the analytics event recorded `outcome: success` too.

**Rocket.Chat [#41525](https://github.com/RocketChat/Rocket.Chat/pull/41525)**
(merged) is the same bug where it costs most — a security belief rather than a
cosmetic one:

> the UI still showed the "Device logged out" success toast ... while the
> session remained active on the server

Its cause is worth quoting because it is a refactor, not carelessness: feedback
moved into `onSettled`, *"which runs on both success and error, so the success
path executed regardless of the request outcome."*

**Outline [#13253](https://github.com/outline/outline/pull/13253)** (merged,
authored by the project lead) produced the most quotable artifact of the lot:
batch actions toasted success unconditionally, so a fully-failed bulk action
reported **"0 documents archived."**

**CDC [dibbs-query-connector#578](https://github.com/CDCgov/dibbs-query-connector/issues/578)**
(closed) is the rule written as acceptance criteria by the project itself, and
generalised past the reported case:

> When deletion of a query fails, show a red, error-state toast instead of the
> success toast. We should confirm this also for deletion of users, value sets,
> etc. everywhere else toasts are used.

**Scope note.** The payment-specific variant of this is thinner than the
general one: the only reputable payment-flow receipt is
[interledger/web-monetization-extension#292](https://github.com/interledger/web-monetization-extension/issues/292)
("payment successful" with no payment, closed by a merged fix). So the rule is
about confirmations in general, and payments are an illustration, not the proof.

## FC-102 — A failed read must not render the empty state

This is the best-defended rule in the set, and the one with an independent
dataset behind it rather than only bug reports.

**PostHog [#63151](https://github.com/PostHog/posthog/pull/63151)** (merged)
names the exact forbidden default:

> On an API error the list stays at `{count: 0, results: []}`,
> `shouldShowEmptyState` returns `true` ... the scene shows the "create your
> first cohort" product intro plus an empty table — indistinguishable from
> genuinely having no cohorts.

**PostHog [#87473](https://github.com/PostHog/posthog/pull/87473)** (merged)
states the user-facing cost in one line: *"a transient failure looked like
their data was deleted."*

**PostHog [#74717](https://github.com/PostHog/posthog/pull/74717)** (merged) is
the canonical 200-with-an-error-body case:

> Some query failures arrive as an HTTP 200 response containing an error and no
> result. The dashboard treated that response as a successful empty result ...
> This made a failed refresh look like the query had run successfully but found
> no data.

Merged fixes for the same class also exist in Strapi
([#28006](https://github.com/strapi/strapi/pull/28006)), Rocket.Chat
([#42733](https://github.com/RocketChat/Rocket.Chat/pull/42733)), Grafana
([#132095](https://github.com/grafana/grafana/pull/132095) — *"The fallback
alert was blank"*) and WooCommerce
([#67832](https://github.com/woocommerce/woocommerce/pull/67832)).

**The dataset.** *Web API Fragility* (Espinha, Zaidman, Gross, TUD-SERG-2014-009,
[arXiv:1407.4266](https://arxiv.org/abs/1407.4266)) injected four kinds of
broken API response into 48 real applications:

| Injected fault | Failed silently | Showed an error |
|---|---|---|
| Malformed response | 34 / 48 | 14 |
| Empty response | 37 / 48 | 11 |
| Field removed | 42 / 48 | 6 |
| Data type changed | 43 / 48 | 5 |

> the most common behavior ... and one that affects more than two thirds (28 out
> of 48) of the applications under study is a silent failure.

And the named instances are this rule exactly: four apps *"show a message
claiming that no results were found and that the end-user should change his or
her search criteria. This reveals that the application did not recognize the
empty response as a fault."*

This matters because it covers what the "29% of JavaScript exception handlers
are empty" figure misses. These failures never throw, so no catch block is
involved and no handler statistic sees them.

**The structural fix, not the vigilant one.** A four-state discriminated union,
`empty | loading | success | failed`, makes "failed" unrepresentable as
"empty". lemmy-ui carries that shape across 36 files and has **zero**
occurrences of `isLoading`, which I counted rather than assumed.

What the union guarantees is narrower than I first wrote, and worth stating
precisely: failure cannot be *mistaken* for emptiness, because they are
different states of the same value. It does not guarantee that failure is
rendered. lemmy-ui has only 3 `case "failed"` branches against 38
`=== "failed"` guards, so most failures are handled by a guard and a toast
rather than by an exhaustive `switch`, and exhaustiveness is not switched on.
The type closes the hole this rule is about; rendering the failed branch is
still a decision someone has to make.

## FC-103 — A non-exception failure must be handled

An API that answers `{success: false}`, or 200 with an error body, is a
failure. Branching only on the thrown case discards it.

Four distinct mechanisms, all merged, all explained by the people who fixed
them: PostHog #74717 (the 200-with-error-body above); PostHog #113787 (a loader
that catches and resolves); Grafana
[#132095](https://github.com/grafana/grafana/pull/132095), where the client
branched on `error.data.status` values the apiserver never sends — *"So none of
those branches ever matched"*; and Mattermost
[#22800](https://github.com/mattermost/mattermost/pull/22800), where an
`{error, data}` envelope was read as if `error` were always present.

The user-visible shape of this bug is "nothing happens when I click", caught
from the inside in PostHog
[#101842](https://github.com/PostHog/posthog/pull/101842): *"A failed shared
metric update shows nothing: no error toast, no redirect, the user just waits."*

## FC-104 — A submit path must guard against re-entry

**Twenty [#22737](https://github.com/twentyhq/twenty/pull/22737)** (merged) is
the strongest receipt here, because it explains why the bug stayed invisible:

> one physical click on the checkbox fired the row's handler twice

> This was invisible until now because every consumer's handler was idempotent
> ... The junction relation feature is the first non-idempotent consumer: each
> call creates a new junction record with a fresh UUID, so two calls produced
> two rows.

That is the argument for making the guard unconditional rather than adding it
where duplication is known to hurt. The guard is cheap; knowing which handler
will become non-idempotent later is not possible.

**Nextcloud [#45352](https://github.com/nextcloud/server/pull/45352)** (merged)
is the same defect in one of the most widely deployed web applications there
is: double-clicking "Log in" while the button already read "Logging in"
produced *"State token does not match."*

**PostHog [#101842](https://github.com/PostHog/posthog/pull/101842)** (merged)
fixes this and FC-103 in the same handler: *"The Save buttons also stay
clickable while a save is in flight, so rapid clicks send duplicate
requests."*

**The payment variant is acknowledged but open**, so it is presented as such:
WooCommerce [#62659](https://github.com/woocommerce/woocommerce/issues/62659)
("Customers charged multiple times for a single checkout") and
[#69865](https://github.com/woocommerce/woocommerce/issues/69865), where a
store operator reports two to three orders per purchase and real shipping cost
for the duplicates, with a maintainer agreeing it should be treated as a bug.
One detail there is more instructive than the fix would be: the operator could
not reproduce it by double-clicking. The duplicates came from an in-flight
state the UI never closed out, which is this rule and FC-101 failing together.

**The terminal-state half.** The fragility study found 8 of 48 apps (malformed
response) and 9 of 48 (empty response) never time out and *"stay indefinitely
'loading'"*. A pending state with no terminal branch is the same defect wearing
a spinner.

## FC-105 — Test, development or stub code must not be reachable in production

**Rescoped, and the reason is stated rather than hidden.** This began as "no
dead or stubbed code in a live path", and the evidence does not support that
phrasing: **no frontend receipt was found.** The one perfect candidate — a
reporter reading a shipped bundle and finding an "Upgrade now" click handler
compiled to an empty function — was retracted by the reporter himself. A second
candidate was a machine-filed report self-scored "medium confidence".

What the evidence does support is the narrower, server-and-tooling version,
settled as CVEs:

- **Appium, [CVE-2026-58191](https://github.com/advisories/GHSA-3wgp-x9p5-c7cc)** — the server *"mounts the built-in `/test/guinea-pig` ... routes unconditionally on every server"*, reflecting unescaped input into a `<script>` block, with a default bind of `0.0.0.0` and no auth.
- **Gradio, [CVE-2026-27167](https://github.com/advisories/GHSA-h3h8-3v2v-rg7m)** — *"automatically enable 'mocked' OAuth routes"* outside Hugging Face Spaces, leaking the host token via a cookie signed with a hardcoded secret. A stub behind a real login button.

So the rule ships as **"test, dev or stub code reachable in a production
path"**, cited to non-frontend precedent and labelled as such. I would rather
carry a narrower rule with honest evidence than a wider one that implies
evidence I do not have.

---

## Sourcing notes

**Two of the PostHog receipts are machine-authored**, and are labelled wherever
quoted: #63151 is authored by `posthog[bot]`, and #101842's own body declares
*"Autonomy: Human-driven (agent-assisted), Agent: Claude Code"*. Both are merged
into PostHog's main branch, so they are the project's shipped position — but
calling a bot-written PR "the maintainer's own words" would be a fair
criticism, so I do not.

**No named public postmortem exists for any of these five classes.** Not for a
double charge, not for a false confirmation, not for a silent failure. The
closest public incident is Bank of America on 2 October 2024, when customers
saw $0 and stale balances in-app during an outage — but no postmortem was
published and the mechanism was never confirmed, so it is symptom evidence and
nothing more. Stripe's idempotency documentation is mechanism documentation,
not an incident report, and is not cited as one.

**No defect was hunted.** Every receipt here came from the project itself, a
reporter, a CVE, or the press. Nothing was found by reading a third party's
source tree looking for unreported bugs, and nothing unreported is published.
