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

export async function getAllModules(): Promise<ModuleSummary[]> {
  const all: ModuleSummary[] = [];
  for (const stage of STAGES) {
    const mods = await getStageModules(stage);
    all.push(...mods);
  }
  return all;
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
