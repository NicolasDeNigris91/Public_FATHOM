import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { STAGES, type StageId, type StageMeta } from './stages';

// Resolves to the framework root: apps/site/../../framework
const FRAMEWORK_ROOT = path.resolve(process.cwd(), '..', '..', 'framework');
const REPO_ROOT = path.resolve(process.cwd(), '..', '..');

export interface ModuleFrontmatter {
  module?: string;
  title?: string;
  stage?: string;
  prereqs?: string[];
  status?: string;
  gates?: {
    conceitual?: GateState;
    pratico?: GateState;
    conexoes?: GateState;
  };
}

export interface GateState {
  status?: 'pending' | 'passed' | 'failed';
  date?: string | null;
  attempts?: number;
  notes?: string | null;
}

export interface ModuleSummary {
  id: string;          // lowercase: n01, a09, st02
  rawId: string;       // original case: N01, A09, ST02
  slug: string;        // route slug: n01-computation-model
  stageId: StageId;
  fileName: string;
  frontmatter: ModuleFrontmatter;
  title: string;
  prereqs: string[];
}

export interface ModuleFull extends ModuleSummary {
  content: string;     // raw markdown body (no frontmatter)
}

async function safeRead(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function listMd(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export async function getStageModules(stage: StageMeta): Promise<ModuleSummary[]> {
  const dir = path.join(FRAMEWORK_ROOT, stage.dir);
  const files = await listMd(dir);
  const summaries: ModuleSummary[] = [];

  for (const fileName of files) {
    if (fileName === 'README.md') continue;
    const filePath = path.join(dir, fileName);
    const raw = await safeRead(filePath);
    if (!raw) continue;
    const parsed = matter(raw);
    const fm = (parsed.data ?? {}) as ModuleFrontmatter;

    // Extract id from filename: N01-computation-model.md => N01
    const idMatch = fileName.match(/^([A-Z]+\d+|CAPSTONE-[a-z]+)/);
    const rawId = idMatch ? idMatch[1] : fileName.replace(/\.md$/, '');
    const id = rawId.toLowerCase();
    const slug = fileName.replace(/\.md$/, '').toLowerCase();

    const title =
      fm.title ??
      extractFirstHeading(parsed.content) ??
      fileName.replace(/\.md$/, '');

    summaries.push({
      id,
      rawId,
      slug,
      stageId: stage.id,
      fileName,
      frontmatter: fm,
      title,
      prereqs: fm.prereqs ?? [],
    });
  }

  return summaries.sort((a, b) => moduleOrder(a.rawId) - moduleOrder(b.rawId));
}

function moduleOrder(rawId: string): number {
  if (rawId.startsWith('CAPSTONE')) return 999;
  const m = rawId.match(/^([A-Z]+)(\d+)$/);
  if (!m) return 1000;
  return parseInt(m[2], 10);
}

// Per-process memoization. Build runs are short-lived so a permanent
// cache is fine — server stays warm between requests in production
// (Railway standalone Node), so subsequent /modules and /stages reads
// reuse the parsed list.
let _allModulesCache: Promise<ModuleSummary[]> | null = null;

export async function getAllModules(): Promise<ModuleSummary[]> {
  if (_allModulesCache) return _allModulesCache;
  _allModulesCache = (async () => {
    const all: ModuleSummary[] = [];
    for (const stage of STAGES) {
      const mods = await getStageModules(stage);
      all.push(...mods);
    }
    return all;
  })();
  return _allModulesCache;
}

export async function getModuleByRawId(rawId: string): Promise<ModuleFull | null> {
  for (const stage of STAGES) {
    const dir = path.join(FRAMEWORK_ROOT, stage.dir);
    const files = await listMd(dir);
    for (const fileName of files) {
      const idMatch = fileName.match(/^([A-Z]+\d+|CAPSTONE-[a-z]+)/);
      const fileRawId = idMatch ? idMatch[1] : fileName.replace(/\.md$/, '');
      if (fileRawId.toLowerCase() === rawId.toLowerCase()) {
        const filePath = path.join(dir, fileName);
        const raw = await safeRead(filePath);
        if (!raw) return null;
        const parsed = matter(raw);
        const fm = (parsed.data ?? {}) as ModuleFrontmatter;
        const slug = fileName.replace(/\.md$/, '').toLowerCase();
        const title =
          fm.title ?? extractFirstHeading(parsed.content) ?? fileName.replace(/\.md$/, '');
        return {
          id: fileRawId.toLowerCase(),
          rawId: fileRawId,
          slug,
          stageId: stage.id,
          fileName,
          frontmatter: fm,
          title,
          prereqs: fm.prereqs ?? [],
          content: parsed.content,
        };
      }
    }
  }
  return null;
}

export async function getStageReadme(stage: StageMeta): Promise<string | null> {
  const filePath = path.join(FRAMEWORK_ROOT, stage.dir, 'README.md');
  return await safeRead(filePath);
}

export async function getRootDoc(name: 'README' | 'MENTOR' | 'STUDY-PROTOCOL' | 'PROGRESS'): Promise<string | null> {
  return await safeRead(path.join(REPO_ROOT, `${name}.md`));
}

export async function getMetaDoc(file: string): Promise<string | null> {
  return await safeRead(path.join(FRAMEWORK_ROOT, '00-meta', file));
}

function extractFirstHeading(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

export function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '').trimStart();
}

export interface NeighborModules {
  prev: ModuleSummary | null;
  next: ModuleSummary | null;
}

/**
 * Modules that declare `rawId` in their prereqs frontmatter.
 * Useful pra UI "este módulo destrava: A, B, C".
 */
export async function getDependents(rawId: string): Promise<ModuleSummary[]> {
  const all = await getAllModules();
  return all.filter((m) =>
    m.prereqs.some((p) => p.toLowerCase() === rawId.toLowerCase()),
  );
}

export type { ReadingMetadata } from './reading-metadata';

/**
 * Quick reading metadata for a Markdown body. WPM=220 is a reasonable
 * average for technical reading; rounded up to a whole minute.
 * Code blocks are counted but not subtracted — they slow reading;
 * we intentionally don't compensate, since "denser per minute" is fine.
 */
export interface GlossaryTerm {
  term: string;
  expansion: string | null;
  definition: string;
  section: string;
}

/**
 * Parses framework/00-meta/GLOSSARY.md into structured terms.
 * Format expected per term:
 *   - **TERM** (optional expansion) — definition text.
 * Sections delimited by `## Section heading`.
 */
export async function loadGlossary(): Promise<{ sections: string[]; terms: GlossaryTerm[] }> {
  const raw = await getMetaDoc('GLOSSARY.md');
  if (!raw) return { sections: [], terms: [] };

  const lines = raw.split(/\r?\n/);
  const terms: GlossaryTerm[] = [];
  const sections: string[] = [];
  let currentSection = '';

  const TERM_RE = /^-\s+\*\*([^*]+?)\*\*(?:\s*\(([^)]+)\))?\s*[—-]\s+(.+)$/;

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+?)\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!sections.includes(currentSection)) sections.push(currentSection);
      continue;
    }
    const termMatch = line.match(TERM_RE);
    if (termMatch && currentSection) {
      terms.push({
        term: termMatch[1].trim(),
        expansion: termMatch[2]?.trim() ?? null,
        definition: termMatch[3].trim(),
        section: currentSection,
      });
    }
  }

  return { sections, terms };
}

// readingMetadata implementation lives in ./reading-metadata.ts (pure, testable).
export { readingMetadata } from './reading-metadata';

/**
 * Returns the prev/next modules around `rawId` in the global ordering
 * (stage order from STAGES, then numeric order within stage).
 */
export async function getNeighborModules(rawId: string): Promise<NeighborModules> {
  const all = await getAllModules();
  const idx = all.findIndex((m) => m.rawId.toLowerCase() === rawId.toLowerCase());
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}
