import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { STAGES, type StageId, type StageMeta } from './stages';

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
  id: string;
  rawId: string;
  slug: string;
  stageId: StageId;
  fileName: string;
  frontmatter: ModuleFrontmatter;
  title: string;
  prereqs: string[];
}

export interface ModuleFull extends ModuleSummary {
  content: string;
}

export interface NeighborModules {
  prev: ModuleSummary | null;
  next: ModuleSummary | null;
}

export interface GlossaryTerm {
  term: string;
  expansion: string | null;
  definition: string;
  section: string;
}

export type { ReadingMetadata } from './reading-metadata';
export { readingMetadata } from './reading-metadata';

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

function extractFirstHeading(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function moduleOrder(rawId: string): number {
  if (rawId.startsWith('CAPSTONE')) return 999;
  const m = rawId.match(/^\d{2}-(\d{2})$/);
  if (!m) return 1000;
  return parseInt(m[1], 10);
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

    const idMatch = fileName.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/);
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
      const idMatch = fileName.match(/^(\d{2}-\d{2}|CAPSTONE-[a-z]+)/);
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

export async function getRootDoc(
  name: 'README' | 'MENTOR' | 'STUDY-PROTOCOL' | 'PROGRESS',
): Promise<string | null> {
  return await safeRead(path.join(REPO_ROOT, `${name}.md`));
}

export async function getMetaDoc(file: string): Promise<string | null> {
  return await safeRead(path.join(FRAMEWORK_ROOT, '00-meta', file));
}

export function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, '').trimStart();
}

export async function getNeighborModules(rawId: string): Promise<NeighborModules> {
  const all = await getAllModules();
  const idx = all.findIndex((m) => m.rawId.toLowerCase() === rawId.toLowerCase());
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}

export async function getDependents(rawId: string): Promise<ModuleSummary[]> {
  const all = await getAllModules();
  return all.filter((m) =>
    m.prereqs.some((p) => p.toLowerCase() === rawId.toLowerCase()),
  );
}

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
