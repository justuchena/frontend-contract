// Every rule must have a pair in the fixture: the violation, and the deliberate
// pattern beside it that must stay silent. A rule with no fixture is a rule
// that silently stops working, which is worse than no rule.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { rmSync, existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixture");
const check = join(here, "frontend-check.mjs");

function run(args = []) {
  try {
    const out = execFileSync(process.execPath, [check, ...args], { cwd: fixture, encoding: "utf8" });
    return { out, code: 0 };
  } catch (e) {
    return { out: e.stdout ?? "", code: e.status };
  }
}

const expected = [
  ["FC-001", "src/features/billing/components/invoice-list.tsx", 12],
  ["FC-002", "src/features/billing/components/invoice-list.tsx", 12],
  ["FC-003", "src/features/billing/components/invoice-list.tsx", 11],
  ["FC-005", "package.json", 0],
  ["FC-006", "src/features/billing/components/invoice-list.tsx", 3],
  ["FC-009", ".github/workflows", 0],
  ["FC-010", "src/features/billing/components/invoice-list.tsx", 20],
  ["FC-011", "scripts/audit.mjs", 0],
  ["FC-012", "scripts/audit.mjs", 0],
];

const { out, code } = run(["--json", "."]);
const { findings } = JSON.parse(out);

assert.equal(code, 1, "findings must exit non-zero — FC-011 applies to this checker too");
assert.equal(findings.length, expected.length, `expected ${expected.length} findings, got ${findings.length}`);

for (const [id, file, line] of expected) {
  const hit = findings.find((f) => f.id === id && f.file === file && f.line === line);
  assert.ok(hit, `missing ${id} at ${file}:${line}`);
}
for (const id of new Set(expected.map((e) => e[0]))) {
  assert.equal(findings.filter((f) => f.id === id).length, 1, `${id} fired more than once — a negative case regressed`);
}

// The deliberate patterns. Each was reported by an early version of the rule beside it.
const silent = [
  "src/features/billing/api/invoices.ts",       // fetch, Authorization, Bearer, base URL — all correct in the data layer
  "src/features/inbox/components/thread.tsx",   // the same strings in copy, masked
  "src/features/inbox/index.ts",
  "src/features/billing/index.ts",
];
for (const file of silent) {
  assert.equal(findings.filter((f) => f.file === file).length, 0, `${file} must stay silent`);
}

// Two catches in the violating file pass: one comments what it loses, one reports.
assert.equal(
  findings.filter((f) => f.id === "FC-010").length, 1,
  "only the bare catch should report; the commented and the reporting one must pass",
);

// The baseline records counts, not positions, and suppresses exactly what it recorded.
const tmp = join(fixture, ".baseline.test.json");
rmSync(tmp, { force: true });
const w = run(["--write-baseline", tmp, "."]);
assert.equal(w.code, 0, "--write-baseline exits 0");
assert.ok(existsSync(tmp), "baseline file written");
const b = run(["--baseline", tmp, "."]);
assert.equal(b.code, 0, "a fully baselined tree passes");
assert.match(b.out, /9 baselined/, "the baseline reports what it suppressed");
rmSync(tmp, { force: true });

// --rule narrows to one rule.
const one = run(["--json", "--rule", "FC-010", "."]);
assert.equal(JSON.parse(one.out).findings.length, 1, "--rule FC-010 returns only that rule");

console.log(`✓ enforce/test.mjs — ${findings.length} findings asserted, ${silent.length} deliberate patterns silent, baseline round-trips`);
