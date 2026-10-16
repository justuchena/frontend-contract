#!/usr/bin/env node
// frontend-contract: the checker. No dependencies, no configuration.
// Rule IDs and their reasoning live in standard/STANDARD.md.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, relative, sep, extname, basename, dirname } from "node:path";
import { execSync } from "node:child_process";

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", ".git", ".next", ".svelte-kit", "coverage",
  "vendor", "generated", "__generated__", "out", ".turbo", ".nx",
]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte", ".vue"]);

// A view file renders. A data file talks to the server. The rules differ.
const VIEW_PATH = /(^|\/)(components?|pages?|routes?|views?|screens?|features?)(\/|$)/;
const DATA_PATH = /(^|\/)(api|apis|services?|data|queries|client|clients|transport|net|sdk|repositories)(\/|$)|\.(api|service|client|query|repo)\.[tj]sx?$/;
const GENERATED_PATH = /(^|\/)(generated|__generated__|codegen)(\/|$)|\.gen\.[tj]s$|schema\.d\.ts$/;

const REPORTERS = /\b(console\.(error|warn|log|debug|info)|report\w*|captureException|captureMessage|logError|logger|log\.|Sentry|trackError|notify|toast|showError|setError|rethrow|throw)\b/;

// Mask comments and string bodies so a pattern inside copy or a URL is not a finding.
// The lesson is design-contract's: accept="image/*" once swallowed half a file.
function mask(src) {
  const out = Array.from(src);
  const lineHasComment = new Set();
  let line = 0, i = 0;
  const n = src.length;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== "\n") out[k] = " "; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "\n") { line++; i++; continue; }
    if (c === "/" && d === "/") {
      lineHasComment.add(line);
      let j = i; while (j < n && src[j] !== "\n") j++;
      blank(i, j); i = j; continue;
    }
    if (c === "/" && d === "*") {
      let j = i + 2; while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++;
      for (let k = i; k < Math.min(j + 2, n); k++) { if (src[k] === "\n") { lineHasComment.add(line); line++; } }
      lineHasComment.add(line);
      blank(i, Math.min(j + 2, n)); i = j + 2; continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) break;
        if (src[j] === "\n") line++;
        j++;
      }
      blank(i + 1, j); i = j + 1; continue;
    }
    i++;
  }
  return { masked: out.join(""), lineHasComment };
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

function matchBrace(masked, open) {
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === "{") depth++;
    else if (masked[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return masked.length - 1;
}

// ---------------------------------------------------------------- file rules

const fileRules = [
  {
    id: "FC-001",
    name: "data-layer",
    appliesTo: (p) => !DATA_PATH.test(p) && !GENERATED_PATH.test(p),
    run({ masked, path, push }) {
      const re = /\b(?:fetch|XMLHttpRequest)\s*\(|\baxios\s*[.(]/g;
      let m;
      while ((m = re.exec(masked))) {
        const call = m[0].replace(/[\s(.]+$/, "");
        push(lineOf(masked, m.index), `${call} outside the data layer — route it through one server client`);
      }
    },
  },
  {
    id: "FC-002",
    name: "transport-config",
    appliesTo: (p) => !DATA_PATH.test(p) && !GENERATED_PATH.test(p),
    run({ masked, raw, push }) {
      const checks = [
        [/\bAuthorization\b\s*[:=]/g, "an auth header built outside the one server client"],
        [/\bBearer\b/g, "a bearer token assembled outside the one server client"],
        [/\b(?:process\.env|import\.meta\.env)\.[A-Z_]*(?:API|BASE_URL|BACKEND|ENDPOINT)[A-Z_]*/g, "a base URL read outside the one server client"],
        [/\bbaseURL\s*[:=]/g, "a baseURL set outside the one server client"],
      ];
      for (const [re, msg] of checks) {
        let m;
        while ((m = re.exec(masked))) push(lineOf(masked, m.index), msg);
      }
    },
  },
  {
    id: "FC-003",
    name: "server-state",
    appliesTo: (p) => /\.(tsx|jsx)$/.test(p),
    run({ masked, push }) {
      if (!/\buseState\s*\(/.test(masked)) return;
      const re = /\buseEffect\s*\(/g;
      let m;
      while ((m = re.exec(masked))) {
        const open = masked.indexOf("{", m.index);
        if (open === -1) continue;
        const body = masked.slice(open, matchBrace(masked, open) + 1);
        const fetches = /\bfetch\s*\(|\baxios\s*[.(]/.test(body);
        const sets = /\bset[A-Z]\w*\b/.test(body);
        if (fetches && sets) {
          push(lineOf(masked, m.index), "server data fetched into component state — it belongs in a cache that knows it is server data");
        }
      }
    },
  },
  {
    id: "FC-006",
    name: "deep-import",
    appliesTo: () => true,
    run({ path, push }) {
      const raw = this._raw;
      const re = /\b(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']/g;
      const ZONE = /^(features|modules|packages|domains|slices)$/;
      const zoneOf = (segs) => {
        const i = segs.findIndex((seg) => ZONE.test(seg));
        return i !== -1 && segs[i + 1] ? { zone: segs[i], name: segs[i + 1], rest: segs.slice(i + 2) } : null;
      };
      const mine = zoneOf(path.split("/"));
      if (!mine) return;
      let m;
      while ((m = re.exec(raw))) {
        const spec = m[1] || m[2];
        if (!spec) continue;
        const resolved = spec.startsWith(".")
          ? join(dirname(path), spec).split(sep).join("/")
          : spec.replace(/^[@~$]\//, "");
        const target = zoneOf(resolved.split("/"));
        if (!target || target.zone !== mine.zone) continue;
        if (target.name === mine.name) continue;
        const rest = target.rest.filter(Boolean);
        if (rest.length === 0) continue;
        if (rest.length === 1 && /^index(\.[tj]sx?)?$/.test(rest[0])) continue;
        push(lineOf(raw, m.index), `${spec} reaches into ${target.name}'s internals — import ${target.zone}/${target.name} instead`);
      }
    },
  },
  {
    id: "FC-010",
    name: "silent-catch",
    appliesTo: () => true,
    run({ masked, lineHasComment, push }) {
      const re = /\bcatch\s*(?:\([^)]*\))?\s*\{/g;
      let m;
      while ((m = re.exec(masked))) {
        const open = masked.indexOf("{", m.index);
        const close = matchBrace(masked, open);
        const body = masked.slice(open + 1, close);
        // Any statement at all counts as handling: a call to the project's own
        // error handler is correct, and the checker has no way to know its name.
        if (/[A-Za-z0-9_$)\]]/.test(body)) continue;
        const startLine = lineOf(masked, open);
        const endLine = lineOf(masked, close);
        let commented = false;
        for (let l = startLine - 1; l <= endLine - 1; l++) if (lineHasComment.has(l)) commented = true;
        if (commented) continue;
        push(startLine, "an empty catch with no comment — report the error, or say in a comment what is given up");
      }
    },
  },
];

// ---------------------------------------------------------------- repo rules

function readJSON(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }

function ciText(root) {
  const dir = join(root, ".github", "workflows");
  let text = "";
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (/\.ya?ml$/.test(f)) text += readFileSync(join(dir, f), "utf8") + "\n";
    }
  }
  for (const f of ["lefthook.yml", ".gitlab-ci.yml", "Makefile", ".husky/pre-commit"]) {
    const p = join(root, f);
    if (existsSync(p) && statSync(p).isFile()) text += readFileSync(p, "utf8") + "\n";
  }
  return text;
}

function repoRules(root, files) {
  const out = [];
  // A workspace keeps its scripts in the workspace package, not at the root.
  const manifests = ["package.json", "web/package.json", "frontend/package.json", "app/package.json", "client/package.json"]
    .map((m) => readJSON(join(root, m)))
    .filter(Boolean);
  const pkg = manifests[0] || {};
  const scripts = Object.assign({}, ...manifests.map((m) => m.scripts || {}));
  const ci = ciText(root);
  const hasCI = ci.trim().length > 0;
  const add = (id, name, file, message) => out.push({ id, name, file, line: 0, message });

  // FC-005 — typecheck is its own gate
  const TC_CMD = /\btsc\b|svelte-check|vue-tsc|--noEmit|\btype-?check\b/;
  const tcScripts = Object.entries(scripts).filter(([k, v]) => TC_CMD.test(k) || TC_CMD.test(v));
  if (tcScripts.length === 0) {
    add("FC-005", "typecheck-gate", "package.json", "no typecheck script — add one that runs the compiler with no emit");
  } else if (hasCI) {
    // CI runs it if it names the command, the script, or a runner that wraps it.
    const named = tcScripts.some(([k]) => new RegExp(`(?:run |run-script |pnpm |yarn |turbo run |nx run-many[^\\n]*)${k.replace(/[:]/g, "[:]")}\\b`).test(ci));
    const family = tcScripts.some(([k]) => new RegExp(`\\b(?:npm|pnpm|yarn)\\b[^\\n]*\\b${k.split(":")[0]}\\b`).test(ci));
    if (!TC_CMD.test(ci) && !named && !family) {
      add("FC-005", "typecheck-gate", "package.json", `"${tcScripts[0][0]}" exists but nothing in CI runs it — a gate nobody runs is not a gate`);
    }
  }

  // FC-009 — generated artifacts need a drift gate
  const generators = Object.entries(scripts).filter(([k, v]) => /gen(erate)?[:-]|codegen|openapi|i18n-extract/.test(k + " " + v));
  const hasGenerated = files.some((f) => GENERATED_PATH.test(f));
  if ((generators.length || hasGenerated) && hasCI && !/git diff --exit-code|git status --porcelain|assert-diff|verify-changed-files/.test(ci)) {
    add("FC-009", "codegen-gate", ".github/workflows", "generated output but no drift gate — regenerate in CI and fail on a diff");
  }

  // FC-011 — a check that reports must exit non-zero
  const scriptDir = join(root, "scripts");
  if (existsSync(scriptDir)) {
    for (const f of readdirSync(scriptDir)) {
      if (!/\.(mjs|cjs|js|ts)$/.test(f)) continue;
      const p = join(scriptDir, f);
      if (!statSync(p).isFile()) continue;
      const src = readFileSync(p, "utf8");
      const reports = /finding|violation|✗|offend|unenforced|FAIL|error\(/i.test(src);
      const fails = /process\.exitCode\s*=\s*[1-9]|process\.exit\(\s*[1-9]|throw new/.test(src);
      if (reports && !fails) {
        add("FC-011", "silent-check", `scripts/${f}`, "reports findings but can never exit non-zero — a check that cannot fail is documentation");
      }
    }
  }

  // FC-012 — a gating script is itself tested
  if (hasCI && existsSync(scriptDir)) {
    for (const f of readdirSync(scriptDir)) {
      if (!/\.(mjs|cjs|js|ts)$/.test(f)) continue;
      if (/\.(test|spec)\./.test(f)) continue;
      if (!ci.includes(f)) continue;
      const stem = f.replace(/\.(mjs|cjs|js|ts)$/, "");
      const tested = readdirSync(scriptDir).some((g) => new RegExp(`^${stem}\\.(test|spec)\\.`).test(g))
        || files.some((g) => new RegExp(`${stem}\\.(test|spec)\\.`).test(g));
      if (!tested) {
        add("FC-012", "untested-gate", `scripts/${f}`, "runs in CI and can block a merge, but has no test beside it");
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- walking

function walk(dir, root, acc) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, root, acc);
    else if (CODE_EXT.has(extname(entry))) acc.push(relative(root, p).split(sep).join("/"));
  }
  return acc;
}

function changedFiles(root, ref) {
  try {
    const out = execSync(`git diff --name-only --diff-filter=ACMR ${ref}...HEAD`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- main

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const value = (f) => { const i = argv.indexOf(f); return i === -1 ? null : argv[i + 1]; };

if (flag("--help") || flag("-h")) {
  console.log(`frontend-check — the frontend-contract standard, enforced.

  frontend-check [dir]            check everything
  --since <ref>                   only files changed since <ref> (the default gate in CI)
  --baseline <file>               ignore counts recorded in <file>
  --write-baseline <file>         record current findings and exit 0
  --json                          machine-readable output
  --rule <id>                     only this rule, repeatable

Rules and their reasoning: standard/STANDARD.md`);
  process.exit(0);
}

const root = argv.find((a) => !a.startsWith("-") && !argv[argv.indexOf(a) - 1]?.startsWith("--")) || ".";
const srcRoot = ["src", "app", "web/src", "frontend/src", "public/app"].map((d) => join(root, d)).find(existsSync) || root;
const only = argv.reduce((acc, a, i) => (a === "--rule" ? [...acc, argv[i + 1]] : acc), []);

const all = walk(srcRoot, root, []);
const since = value("--since");
const changed = since ? changedFiles(root, since) : null;
const files = changed ? all.filter((f) => changed.has(f)) : all;

const findings = [];
for (const rel of files) {
  const raw = readFileSync(join(root, rel), "utf8");
  const { masked, lineHasComment } = mask(raw);
  for (const rule of fileRules) {
    if (only.length && !only.includes(rule.id)) continue;
    if (!rule.appliesTo(rel)) continue;
    rule._raw = raw;
    rule.run({
      masked, raw, lineHasComment, path: rel,
      push: (line, message) => findings.push({ id: rule.id, name: rule.name, file: rel, line, message }),
    });
  }
}
for (const f of repoRules(root, all)) {
  if (only.length && !only.includes(f.id)) continue;
  findings.push(f);
}

// Baseline is file -> rule -> count. No line numbers, so a refactor does not churn it.
const baselinePath = value("--baseline");
const writePath = value("--write-baseline");
const tally = (list) => list.reduce((acc, f) => {
  acc[f.file] ??= {};
  acc[f.file][f.id] = (acc[f.file][f.id] || 0) + 1;
  return acc;
}, {});

if (writePath) {
  writeFileSync(writePath, JSON.stringify(tally(findings), null, 2) + "\n");
  console.log(`baseline written: ${findings.length} finding(s) across ${Object.keys(tally(findings)).length} file(s)`);
  process.exit(0);
}

let reported = findings;
let suppressed = 0;
if (baselinePath && existsSync(baselinePath)) {
  const base = readJSON(baselinePath) || {};
  const budget = {};
  for (const [file, rules] of Object.entries(base)) for (const [id, n] of Object.entries(rules)) budget[`${file}\u0000${id}`] = n;
  reported = [];
  for (const f of findings) {
    const key = `${f.file}\u0000${f.id}`;
    if (budget[key] > 0) { budget[key]--; suppressed++; continue; }
    reported.push(f);
  }
}

if (flag("--json")) {
  console.log(JSON.stringify({ findings: reported, suppressed }, null, 2));
} else if (reported.length === 0) {
  console.log(`✓ frontend-check: no findings${suppressed ? ` (${suppressed} baselined)` : ""}`);
} else {
  const byRule = reported.reduce((acc, f) => { (acc[f.id] ??= []).push(f); return acc; }, {});
  for (const id of Object.keys(byRule).sort()) {
    const list = byRule[id];
    console.log(`\n${id} ${list[0].name} (${list.length})`);
    for (const f of list) console.log(`  ${f.file}${f.line ? `:${f.line}` : ""}  ${f.message}`);
  }
  const where = new Set(reported.map((f) => f.file)).size;
  console.log(`\n✗ frontend-check: ${reported.length} finding(s) in ${where} file(s)${suppressed ? `, ${suppressed} baselined` : ""}`);
  console.log(`  standard/STANDARD.md has the reasoning. --write-baseline records these to gate new code only.`);
}

// FC-011 applies to this checker too.
process.exitCode = reported.length ? 1 : 0;
