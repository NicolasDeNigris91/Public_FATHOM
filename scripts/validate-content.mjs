#!/usr/bin/env node
// Validates framework content before site builds.
// Runs as `prebuild` hook in apps/site/package.json.
//
// Checks:
//   1. Frontmatter required fields on each module .md (module/title/stage/status)
//   2. prereqs declared exist as real module files
//   3. Internal Markdown links [text](path.md) point to existing files
//   4. Line count within sane bounds (warning, not failure)
//
// Exit codes:
//   0 = ok or warnings only
//   1 = at least one error (build should fail)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const FRAMEWORK = path.join(REPO_ROOT, 'framework');

const STAGES = [
  { dir: '01-novice', prefix: 'N' },
  { dir: '02-apprentice', prefix: 'A' },
  { dir: '03-professional', prefix: 'P' },
  { dir: '04-senior', prefix: 'S' },
  { dir: '05-staff', prefix: 'ST' },
];

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  const lines = m[1].split('\n');
  let lastKey = null;
  for (const line of lines) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      lastKey = kv[1];
      const val = kv[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        fm[lastKey] = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (val !== '') {
        fm[lastKey] = val;
      } else {
        fm[lastKey] = {};
      }
    }
  }
  const body = raw.slice(m[0].length).trimStart();
  return { fm, body };
}

async function listModuleIds() {
  const ids = new Set();
  for (const stage of STAGES) {
    const dir = path.join(FRAMEWORK, stage.dir);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.md')) continue;
      if (f === 'README.md') continue;
      const id = f.match(/^([A-Z]+\d+|CAPSTONE-[a-z]+)/)?.[1];
      if (id) ids.add(id);
    }
  }
  return ids;
}

// Matches real module IDs (N01, A09, ST10) — not free-text soft prereqs
// like "(Senior completo)", "qualquer", "senior-complete".
const MODULE_ID_RE = /^[A-Z]+\d+$/;

async function checkModule(filePath, fileName, knownIds) {
  const raw = await fs.readFile(filePath, 'utf8');
  const { fm } = parseFrontmatter(raw);

  const idMatch = fileName.match(/^([A-Z]+\d+|CAPSTONE-[a-z]+)/);
  const id = idMatch ? idMatch[1] : fileName;
  const isCapstone = id.startsWith('CAPSTONE');

  // Required fields. Capstone files use slightly different shape
  // (some omit the redundant `module` field since filename is the id).
  const required = isCapstone ? ['title', 'stage', 'status'] : ['module', 'title', 'stage', 'status'];
  for (const field of required) {
    if (!fm[field]) {
      err(`[${id}] missing frontmatter field: ${field}`);
    }
  }

  // Prereqs: only validate strict ID-shaped entries against known modules.
  // Soft prereqs in parens (e.g. "(Senior completo)") are intentional
  // free-text gates and not validated here.
  const prereqs = fm.prereqs ?? [];
  for (const p of prereqs) {
    const cleaned = p.trim();
    if (!cleaned) continue;
    if (!MODULE_ID_RE.test(cleaned)) continue;
    if (!knownIds.has(cleaned)) {
      err(`[${id}] prereq references unknown module: ${cleaned}`);
    }
  }

  // Line count
  const lineCount = raw.split(/\r?\n/).length;
  if (lineCount < 100 && !fileName.startsWith('README')) {
    warn(`[${id}] very short module (${lineCount} lines)`);
  }
}

async function* walkMd(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkMd(full);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      yield full;
    }
  }
}

async function checkInternalLinks() {
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  for await (const filePath of walkMd(REPO_ROOT)) {
    if (filePath.includes('node_modules') || filePath.includes('.next') || filePath.includes('apps/site')) {
      continue;
    }
    const raw = await fs.readFile(filePath, 'utf8');
    let m;
    while ((m = linkRe.exec(raw)) !== null) {
      const target = m[2].split('#')[0];
      if (!target) continue;
      if (/^(https?:|mailto:|tel:|\/)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(filePath), target);
      try {
        await fs.access(resolved);
      } catch {
        const rel = path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');
        warn(`broken link in ${rel}: -> ${target}`);
      }
    }
  }
}

async function main() {
  const knownIds = await listModuleIds();

  for (const stage of STAGES) {
    const dir = path.join(FRAMEWORK, stage.dir);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      err(`stage dir missing: ${stage.dir}`);
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.md')) continue;
      if (f === 'README.md') continue;
      await checkModule(path.join(dir, f), f, knownIds);
    }
  }

  await checkInternalLinks();

  console.log('');
  console.log(`[validate] modules scanned: ${knownIds.size}`);
  console.log(`[validate] errors:   ${errors.length}`);
  console.log(`[validate] warnings: ${warnings.length}`);

  if (warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const w of warnings.slice(0, 30)) console.log(`  - ${w}`);
    if (warnings.length > 30) console.log(`  ... +${warnings.length - 30} more`);
  }

  if (errors.length > 0) {
    console.error('');
    console.error('Errors:');
    for (const e of errors) console.error(`  ! ${e}`);
    process.exit(1);
  }

  console.log('[validate] ok\n');
}

main().catch((e) => {
  console.error('[validate] fatal:', e);
  process.exit(1);
});
