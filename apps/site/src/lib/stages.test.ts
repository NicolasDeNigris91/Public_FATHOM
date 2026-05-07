import { describe, expect, it } from 'vitest';
import { getStage, STAGES, type StageId } from './stages';

describe('STAGES catalog', () => {
  it('exposes exactly five stages', () => {
    expect(STAGES).toHaveLength(5);
  });

  it('numbers stages 1..5 in order', () => {
    expect(STAGES.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses unique stage ids', () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(STAGES.length);
  });

  it('uses unique directory names matching the convention NN-id', () => {
    for (const stage of STAGES) {
      const padded = String(stage.number).padStart(2, '0');
      expect(stage.dir).toBe(`${padded}-${stage.id}`);
    }
  });

  it('declares a positive moduleCount per stage', () => {
    for (const stage of STAGES) {
      expect(stage.moduleCount).toBeGreaterThan(0);
    }
  });

  it.each(STAGES.map((s) => [s.id]))(
    'has non-empty title/subtitle/tagline for stage %s',
    (id) => {
      const stage = STAGES.find((s) => s.id === id)!;
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.subtitle.length).toBeGreaterThan(0);
      expect(stage.tagline.length).toBeGreaterThan(0);
    },
  );
});

describe('getStage', () => {
  it.each(STAGES.map((s) => [s.id]))('returns the meta for %s', (id) => {
    const meta = getStage(id);
    expect(meta).toBeDefined();
    expect(meta!.id).toBe(id);
  });

  it('returns undefined for an unknown id', () => {
    expect(getStage('does-not-exist')).toBeUndefined();
  });

  it('does not match a partial prefix', () => {
    // StageId is union-typed; the function takes string for runtime safety.
    const partial = STAGES[0].id.slice(0, 2) as StageId;
    expect(getStage(partial)).toBeUndefined();
  });
});
