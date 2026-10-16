#!/usr/bin/env node
/**
 * The commit convention, held.
 *
 *     node enforce/commit-check.mjs                  # HEAD
 *     node enforce/commit-check.mjs --range origin/main..HEAD
 *     node enforce/commit-check.mjs --file .git/COMMIT_EDITMSG
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * FC-011 and FC-012 say a check that cannot fail is documentation, and the
 * refs say four independent projects document a convention nothing runs.
 * Writing the convention into CONTRIBUTING.md and then not checking it would
 * be that same defect, in the repo that names it.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 * It does not cap the subject length. A subject that carries the number
 * ("— 104 files over the 800-line warning") is worth more than one that fits
 * a terminal, so it warns above 150 and never fails on length.
 *
 * It also cannot tell whether the body explains *why*. That needs a reader.
 *
 * Install as a hook, so it runs before the message is written rather than
 * after CI rejects it:
 *
 *     git config core.hooksPath .githooks
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};

const TYPES = ["feat", "fix", "refactor", "docs", "test", "chore", "style", "build", "ci", "perf", "revert"];

/* Scopes are the parts of this repo somebody can change. A scope outside
   this list usually means the change is wider than it looks, so the check
   names it rather than guessing. Add one when a real area appears. */
const SCOPES = [
  "repo", "standard", "next", "refs", "enforce", "fixture",
  "skill", "plugin", "licence", "deps", "ci",
];

/* The six commits up to and including this one predate the convention, which
   was written down on 2026-10-16 together with this checker. They are already
   published, and rewriting them would mean force-pushing a public history so
   that a repo about honest receipts looked tidier than it was. So they are
   named here rather than quietly skipped: `--range all` reports how many were
   exempt, and everything after them is checked. `main` is now protected
   against a force-push, so this is permanent rather than pending — which is
   the right way round: a protection that bends for the maintainer is not one,
   and the alternative was a tidier history that lied about how it was
   written. */
const PRE_CONVENTION = "c99cd12";

const SUBJECT = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9,\-/]+)\))?(?<breaking>!)?: (?<subject>.+)$/;

const messages = [];
const file = arg("file");
const range = arg("range");

if (file) {
  messages.push({ sha: "(pending)", text: readFileSync(file, "utf8") });
} else {
  const spec = range ?? "HEAD (last commit)";
  /* `--all` reads every commit, which is what you want on a young repo where
     HEAD~N runs off the end of history. */
  const args = range
    ? ["log", "--format=%H%x00%B%x1e", "--no-merges", ...(range === "all" ? ["--all"] : [range])]
    : ["log", "--format=%H%x00%B%x1e", "-1"];
  let raw;
  try {
    raw = execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    /* A bad range is a typo, not a crash. A stack trace tells the reader
       nothing they can act on. */
    console.error(`commit-check: cannot read "${spec}"`);
    console.error((e.stderr ?? "").trim().split("\n")[0] || "git failed");
    console.error("\nTry --range all, or --range origin/main..HEAD");
    process.exit(2);
  }
  /* Resolved to full shas once, so the exemption cannot be claimed by a
     later commit that happens to share a prefix. */
  let exempt = new Set();
  try {
    exempt = new Set(
      execFileSync("git", ["rev-list", PRE_CONVENTION], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split("\n")
        .filter(Boolean),
    );
  } catch {
    // The boundary commit is gone, which is what a rewritten history looks
    // like. Then nothing is exempt, which is the stricter direction.
  }
  let exempted = 0;
  for (const entry of raw.split("\x1e")) {
    if (!entry.trim()) continue;
    const [sha, text] = entry.replace(/^\n/, "").split("\x00");
    if (exempt.has(sha)) {
      exempted++;
      continue;
    }
    messages.push({ sha: sha.slice(0, 8), text });
  }
  if (exempted) {
    console.log(`commit-check: ${exempted} commit(s) predate the convention — see PRE_CONVENTION`);
  }
  if (!messages.length) console.log(`commit-check: no commits in ${spec}`);
}

const problems = [];
const warnings = [];

for (const { sha, text } of messages) {
  /* A comment line in COMMIT_EDITMSG is not part of the message. */
  const lines = text.split("\n").filter((l) => !l.startsWith("#"));
  const subject = (lines[0] ?? "").trim();
  const body = lines.slice(1).join("\n").trim();
  const fail = (detail) => problems.push({ sha, subject, detail });
  const warn = (detail) => warnings.push({ sha, subject, detail });

  if (!subject) {
    fail("empty subject");
    continue;
  }

  const m = SUBJECT.exec(subject);
  if (!m) {
    fail('does not match "type(scope): subject" — e.g. fix(enforce): FC-010 fired on a catch that reports');
    continue;
  }

  const { type, scope, subject: text_ } = m.groups;

  if (!TYPES.includes(type)) {
    fail(`unknown type "${type}" — one of ${TYPES.join(", ")}`);
  }

  /* Several scopes are allowed for a change that genuinely crosses areas:
     docs(standard,refs): ... */
  if (scope) {
    for (const one of scope.split(",")) {
      if (!SCOPES.includes(one)) {
        fail(`unknown scope "${one}" — one of ${SCOPES.join(", ")}`);
      }
    }
  }

  /* Sentence case is a warning, not a failure, for the reason the standard
     applies to its own rules: the exception is legitimate — a rule id, a
     proper noun, a filename — and no regex separates "FC-011's receipt was
     false" from "Update the readme". A check that cannot hold its own
     exception should not fail a build, because the first false positive is
     what teaches people to bypass it. */
  if (/^[A-Z]/.test(text_) && !/^(FC-\d+|[A-Z][\w-]*\.[a-z])/.test(text_)) {
    warn("subject starts with a capital — lowercase unless it is a rule id, a proper noun or a filename");
  }
  if (/\.$/.test(text_)) {
    fail("subject ends with a full stop");
  }
  if (/^(update|updates|updated|change|changes|changed|fix stuff|wip|misc)\b/i.test(text_)) {
    fail(`"${text_.split(" ")[0]}" says nothing — name what changed and why it matters`);
  }

  /* The trailer rule, stated in this project's conventions. */
  if (/^co-authored-by:/im.test(body)) {
    fail("remove the Co-Authored-By trailer");
  }

  if (lines[1]?.trim()) {
    fail("no blank line between the subject and the body");
  }

  /* Warnings only. A typo fix does not owe a paragraph. */
  if (!body && !["chore", "style", "ci", "build"].includes(type)) {
    warn("no body — the diff shows the what, so the body should carry the why");
  }
  if (subject.length > 150) {
    warn(`subject is ${subject.length} characters`);
  }
}

for (const w of warnings) {
  console.log(`⚠  ${w.sha}  ${w.detail}`);
  console.log(`   ${w.subject}`);
}

if (problems.length) {
  console.error(`\n✗ commit-check: ${problems.length} problem(s)\n`);
  for (const p of problems) {
    console.error(`  ${p.sha}  ${p.detail}`);
    console.error(`     ${p.subject}\n`);
  }
  console.error("The convention is in CONTRIBUTING.md § Commits.\n");
  process.exit(1);
}

const n = messages.length;
console.log(`✓ commit-check: ${n} ${n === 1 ? "message follows" : "messages follow"} the convention`);
