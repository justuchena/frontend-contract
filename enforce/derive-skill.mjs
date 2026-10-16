#!/usr/bin/env node
// The plugin loader scans a plugin's skills/ directory and ignores a SKILL.md
// at the root, so the root copy is canonical and this derives the plugin's.
// Paths inside it are repo-root-relative, so they are repointed two levels up.
// --check fails instead of writing, which is what CI runs.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(repo, "SKILL.md");
const out = join(repo, "skills", "frontend-contract", "SKILL.md");
const dirs = ["enforce", "standard", "refs"];

const derive = (text) => {
  const [, front, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  if (!front) throw new Error("SKILL.md has no frontmatter");
  const repointed = body
    // A shell command runs in the user's project, not here, so it needs the
    // plugin's absolute root; a path being read as documentation needs the
    // path relative to this file.
    .replace(new RegExp(`node (${dirs.join("|")})/`, "g"), 'node "$CLAUDE_PLUGIN_ROOT/$1/')
    .replace(/node "\$CLAUDE_PLUGIN_ROOT\/([^"\n]+?\.mjs) /g, 'node "$CLAUDE_PLUGIN_ROOT/$1" ')
    .replace(new RegExp(`\`(${dirs.join("|")})/`, "g"), "`../../$1/");
  return `---\n${front}\n---\n` +
    `<!-- Derived from the repo root's SKILL.md by enforce/derive-skill.mjs. Edit that one. -->\n` +
    repointed;
};

const want = derive(readFileSync(src, "utf8"));

if (process.argv.includes("--check")) {
  let have = "";
  try {
    have = readFileSync(out, "utf8");
  } catch {
    // Missing counts as stale, which is the message below.
  }
  if (have !== want) {
    console.error("✗ skills/frontend-contract/SKILL.md is stale — run: npm run skill");
    process.exit(1);
  }
  console.log("✓ the plugin's skill copy matches SKILL.md");
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, want);
  console.log("skills/frontend-contract/SKILL.md written from SKILL.md");
}
