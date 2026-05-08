import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';

const FRAMEWORK = path.resolve(__dirname, '..', '..', '..', '..', 'framework');
const STAGE_DIRS = ['01-fundamentos', '02-plataforma', '03-producao', '04-sistemas', '05-amplitude'];

interface ModuleQuizQuestion {
  q: unknown;
  options: unknown;
  correct: unknown;
  explanation?: unknown;
}

function listModuleFiles(): { stage: string; file: string; absPath: string }[] {
  const out: { stage: string; file: string; absPath: string }[] = [];
  for (const stage of STAGE_DIRS) {
    const dir = path.join(FRAMEWORK, stage);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md') || f === 'README.md') continue;
      out.push({ stage, file: f, absPath: path.join(dir, f) });
    }
  }
  return out;
}

const MODULE_FILES = listModuleFiles();

describe('quiz frontmatter schema', () => {
  it('finds at least one module file', () => {
    expect(MODULE_FILES.length).toBeGreaterThan(0);
  });

  it('finds at least one module with a quiz (so the schema is exercised)', () => {
    const withQuiz = MODULE_FILES.filter((f) => {
      const raw = fs.readFileSync(f.absPath, 'utf8');
      const fm = matter(raw).data as { quiz?: unknown };
      return Array.isArray(fm.quiz) && fm.quiz.length > 0;
    });
    expect(withQuiz.length).toBeGreaterThan(0);
  });

  for (const { stage, file, absPath } of MODULE_FILES) {
    const raw = fs.readFileSync(absPath, 'utf8');
    const fm = matter(raw).data as { quiz?: unknown };
    if (!fm.quiz) continue;

    describe(`${stage}/${file}`, () => {
      it('has a quiz that is an array', () => {
        expect(Array.isArray(fm.quiz)).toBe(true);
      });

      it('has between 3 and 8 questions', () => {
        const quiz = fm.quiz as unknown[];
        expect(quiz.length).toBeGreaterThanOrEqual(3);
        expect(quiz.length).toBeLessThanOrEqual(8);
      });

      it('every question is well-formed', () => {
        const quiz = fm.quiz as ModuleQuizQuestion[];
        for (let i = 0; i < quiz.length; i += 1) {
          const q = quiz[i];
          const ctx = `Q${i + 1}`;

          expect(typeof q.q, `${ctx}: q must be a string`).toBe('string');
          expect((q.q as string).length, `${ctx}: q must be non-empty`).toBeGreaterThan(10);

          expect(Array.isArray(q.options), `${ctx}: options must be an array`).toBe(true);
          const opts = q.options as unknown[];
          expect(opts.length, `${ctx}: must have 2-6 options`).toBeGreaterThanOrEqual(2);
          expect(opts.length, `${ctx}: must have 2-6 options`).toBeLessThanOrEqual(6);
          for (let j = 0; j < opts.length; j += 1) {
            expect(typeof opts[j], `${ctx} opt ${j}: must be a string`).toBe('string');
            expect((opts[j] as string).length, `${ctx} opt ${j}: must be non-empty`).toBeGreaterThan(0);
          }
          const unique = new Set(opts as string[]);
          expect(unique.size, `${ctx}: options must be unique`).toBe(opts.length);

          expect(Number.isInteger(q.correct), `${ctx}: correct must be integer`).toBe(true);
          const correct = q.correct as number;
          expect(correct, `${ctx}: correct must be >= 0`).toBeGreaterThanOrEqual(0);
          expect(correct, `${ctx}: correct must be < options.length`).toBeLessThan(opts.length);

          if (q.explanation !== undefined) {
            expect(typeof q.explanation, `${ctx}: explanation must be string`).toBe('string');
            expect((q.explanation as string).length, `${ctx}: explanation must be non-empty`).toBeGreaterThan(0);
          }
        }
      });
    });
  }
});
