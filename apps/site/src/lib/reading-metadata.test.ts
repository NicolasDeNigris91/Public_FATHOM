import { describe, expect, it } from 'vitest';
import { readingMetadata } from './reading-metadata';

describe('readingMetadata', () => {
  it('returns minutes >= 1 even pra empty input', () => {
    const r = readingMetadata('');
    expect(r.minutes).toBeGreaterThanOrEqual(1);
    expect(r.words).toBe(0);
  });

  it('counts words ignoring markdown headers and emphasis', () => {
    const md = '# Big heading\n\nA simple **bold** sentence with `code`.';
    const r = readingMetadata(md);
    // "Big heading A simple bold sentence with" — 7 actual prose words
    // (header chars stripped, emphasis chars stripped, inline code stripped)
    expect(r.words).toBeGreaterThanOrEqual(6);
    expect(r.words).toBeLessThanOrEqual(8);
  });

  it('strips fenced code blocks from word count', () => {
    const prose = 'Word '.repeat(50);
    const codeBody = 'console.log("a"); '.repeat(50);
    const block = '```js\n' + codeBody + '\n```';
    const a = readingMetadata(prose).words;
    const b = readingMetadata(prose + '\n\n' + block).words;
    expect(b).toBe(a);
  });

  it('counts code blocks via paired ``` markers', () => {
    const md = '```\nblock 1\n```\n\n```ts\nblock 2\n```';
    const r = readingMetadata(md);
    expect(r.codeBlocks).toBe(2);
  });

  it('ceil minutes at WPM=220', () => {
    const md = 'palavra '.repeat(440); // 440 words → 2 minutes
    expect(readingMetadata(md).minutes).toBe(2);

    const md2 = 'palavra '.repeat(221); // 221 words → ceil(1.005) = 2
    expect(readingMetadata(md2).minutes).toBe(2);
  });
});
