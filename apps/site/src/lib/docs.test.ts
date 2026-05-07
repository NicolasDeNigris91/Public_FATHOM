import { describe, expect, it } from 'vitest';
import { DOC_CATEGORIES, DOCS, getDocBySlug } from './docs';

describe('DOCS catalog', () => {
  it('lists at least one doc', () => {
    expect(DOCS.length).toBeGreaterThan(0);
  });

  it('uses unique slugs', () => {
    const slugs = DOCS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every doc category is one of the declared categories', () => {
    const valid = new Set(DOC_CATEGORIES.map((c) => c.id));
    for (const doc of DOCS) {
      expect(valid.has(doc.category)).toBe(true);
    }
  });

  it('every doc source is "root" or "meta"', () => {
    for (const doc of DOCS) {
      expect(['root', 'meta']).toContain(doc.source);
    }
  });

  it('every category in DOC_CATEGORIES has at least one doc', () => {
    for (const cat of DOC_CATEGORIES) {
      const matching = DOCS.filter((d) => d.category === cat.id);
      expect(matching.length).toBeGreaterThan(0);
    }
  });
});

describe('getDocBySlug', () => {
  it.each(DOCS.map((d) => [d.slug]))('finds %s', (slug) => {
    const doc = getDocBySlug(slug);
    expect(doc).toBeDefined();
    expect(doc!.slug).toBe(slug);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getDocBySlug('not-a-real-doc-slug')).toBeUndefined();
  });
});
