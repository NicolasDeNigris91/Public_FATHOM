#!/usr/bin/env node
// Validates framework content before site builds.
// Runs as `prebuild` hook in apps/site/package.json.
//
// Checks:
//   1. Frontmatter required fields on each module .md
//      (module/title/stage/status; CAPSTONE files: title/stage/status)
//   2. prereqs declared exist as real module files (skips soft prereqs
//      in parens or free-text labels like "qualquer", "senior-complete")
//   3. Internal Markdown links [text](path.md) point to existing files
//   4. Line count within sane bounds (warning, not failure)
//
// Flags:
//   --strict   promotes warnings to errors (CI-style enforcement)
//   --quiet    suppresses success summary
//   --json     outputs machine-readable JSON
//
// Exit codes:
//   0 = ok or warnings only (without --strict)
//   1 = at least one error (build should fail)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const FRAMEWORK = path.join(REPO_ROOT, 'framework');

const argv = new Set(process.argv.slice(2));
const STRICT = argv.has('--strict');
const QUIET = argv.has('--quiet');
const JSON_OUT = argv.has('--json');

const STAGES = [
  { dir: '01-fundamentos' },
  { dir: '02-plataforma' },
  { dir: '03-producao' },
  { dir: '04-sistemas' },
  { dir: '05-amplitude' },
];

// Issue tracking — collected per source so we can group by file in output.
/** @type {Array<{kind: 'error'|'warn', file: string, msg: string}>} */
const issues = [];

function recordError(file, msg) {
  issues.push({ kind: 'error', file, msg });
}
function recordWarn(file, msg) {
  issues.push({ kind: STRICT ? 'error' : 'warn', file, msg });
}

const ANSI = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};
const COLOR = process.stdout.isTTY && !JSON_OUT;
function paint(fn, s) {
  return COLOR ? fn(s) : s;
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
      const id = f.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/)?.[1];
      if (id) ids.add(id);
    }
  }
  return ids;
}

const MODULE_ID_RE = /^\d{2}-\d{2}$/;

async function checkModule(filePath, fileName, knownIds) {
  const raw = await fs.readFile(filePath, 'utf8');
  const { fm } = parseFrontmatter(raw);
  const idMatch = fileName.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/);
  const id = idMatch ? idMatch[1] : fileName;
  const isCapstone = id.startsWith('CAPSTONE');
  const rel = path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');

  const required = isCapstone
    ? ['title', 'stage', 'status']
    : ['module', 'title', 'stage', 'status'];
  for (const field of required) {
    if (!fm[field]) recordError(rel, `missing frontmatter field: ${field}`);
  }

  const prereqs = fm.prereqs ?? [];
  for (const p of prereqs) {
    const cleaned = p.trim();
    if (!cleaned) continue;
    if (!MODULE_ID_RE.test(cleaned)) continue;
    if (!knownIds.has(cleaned)) {
      recordError(rel, `prereq references unknown module: ${cleaned}`);
    }
  }

  const lineCount = raw.split(/\r?\n/).length;
  if (lineCount < 100 && !fileName.startsWith('README')) {
    recordWarn(rel, `very short module (${lineCount} lines)`);
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
    const rel = path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');
    if (
      rel.startsWith('node_modules/') ||
      rel.startsWith('.next/') ||
      rel.startsWith('apps/site/')
    ) {
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
        recordWarn(rel, `broken link → ${target}`);
      }
    }
  }
}

function summarize() {
  const errors = issues.filter((i) => i.kind === 'error');
  const warnings = issues.filter((i) => i.kind === 'warn');
  return { errors, warnings, byFile: groupBy(issues, (i) => i.file) };
}

function groupBy(arr, key) {
  const map = new Map();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

function report() {
  const { errors, warnings, byFile } = summarize();

  if (JSON_OUT) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: errors.length === 0,
          strict: STRICT,
          totals: { errors: errors.length, warnings: warnings.length },
          issues,
        },
        null,
        2,
      ) + '\n',
    );
    return errors.length === 0;
  }

  if (errors.length === 0 && warnings.length === 0) {
    if (!QUIET) {
      console.log(paint(ANSI.green, '[validate] ok — 0 issues\n'));
    }
    return true;
  }

  console.log('');
  console.log(
    paint(
      ANSI.bold,
      `[validate] ${errors.length} error${errors.length === 1 ? '' : 's'}, ` +
        `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`,
    ),
  );
  console.log('');

  // Sort files: ones with errors first, then by file name.
  const fileEntries = [...byFile.entries()].sort((a, b) => {
    const aErr = a[1].some((i) => i.kind === 'error');
    const bErr = b[1].some((i) => i.kind === 'error');
    if (aErr !== bErr) return aErr ? -1 : 1;
    return a[0].localeCompare(b[0]);
  });

  for (const [file, items] of fileEntries) {
    console.log(paint(ANSI.cyan, file));
    for (const item of items) {
      const tag =
        item.kind === 'error'
          ? paint(ANSI.red, '  error')
          : paint(ANSI.yellow, '  warn ');
      console.log(`${tag}  ${item.msg}`);
    }
    console.log('');
  }

  console.log(
    paint(
      ANSI.dim,
      `summary: ${errors.length} error(s), ${warnings.length} warning(s)` +
        (STRICT ? ' [strict]' : ''),
    ),
  );

  return errors.length === 0;
}

async function main() {
  const knownIds = await listModuleIds();

  for (const stage of STAGES) {
    const dir = path.join(FRAMEWORK, stage.dir);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      recordError(`framework/${stage.dir}`, 'stage directory missing');
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.md')) continue;
      if (f === 'README.md') continue;
      await checkModule(path.join(dir, f), f, knownIds);
    }
  }

  await checkInternalLinks();

  const ok = report();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('[validate] fatal:', e);
  process.exit(1);
});
