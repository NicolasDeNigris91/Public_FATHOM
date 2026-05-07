import { describe, expect, it } from 'vitest';
import { LIBRARY, STAGE_BOOK_COUNT } from './library';
import { STAGES } from './stages';

describe('LIBRARY catalog', () => {
  it('lists at least one book', () => {
    expect(LIBRARY.length).toBeGreaterThan(0);
  });

  it('every book has title, author, and a non-empty rationale', () => {
    for (const book of LIBRARY) {
      expect(book.title.length).toBeGreaterThan(0);
      expect(book.author.length).toBeGreaterThan(0);
      expect(book.why.length).toBeGreaterThan(0);
    }
  });

  it('every book stage is a known stage id or "meta"', () => {
    const validStages = new Set<string>([...STAGES.map((s) => s.id), 'meta']);
    for (const book of LIBRARY) {
      expect(validStages.has(book.stage)).toBe(true);
    }
  });

  it('books marked free must include a url', () => {
    for (const book of LIBRARY) {
      if (book.free) {
        expect(book.url).toBeTruthy();
        expect(book.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('every url, when present, is http(s)', () => {
    for (const book of LIBRARY) {
      if (book.url !== undefined) {
        expect(book.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it('module references follow the NN-NN or CAPSTONE-* convention', () => {
    const moduleRe = /^(\d{2}-\d{2}|CAPSTONE-[a-z]+)$/;
    for (const book of LIBRARY) {
      for (const m of book.modules ?? []) {
        expect(m).toMatch(moduleRe);
      }
    }
  });
});

describe('STAGE_BOOK_COUNT', () => {
  it('matches the actual filtered count for each stage', () => {
    for (const stage of STAGES) {
      const expected = LIBRARY.filter((b) => b.stage === stage.id).length;
      expect(STAGE_BOOK_COUNT[stage.id]).toBe(expected);
    }
  });
});
