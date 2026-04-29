import { describe, expect, it } from 'vitest';
import { extractToc } from './toc';

describe('extractToc', () => {
  it('returns empty list for empty input', () => {
    expect(extractToc('')).toEqual([]);
  });

  it('captures h2 and h3 headings only (ignores h1, h4+)', () => {
    const md = `# Top
## Two
### Three
#### Four
##### Five
## Another two`;
    const toc = extractToc(md);
    expect(toc).toHaveLength(3);
    expect(toc[0]).toMatchObject({ level: 2, text: 'Two' });
    expect(toc[1]).toMatchObject({ level: 3, text: 'Three' });
    expect(toc[2]).toMatchObject({ level: 2, text: 'Another two' });
  });

  it('skips headings inside fenced code blocks', () => {
    const md = `## Real heading
\`\`\`bash
# this is a comment, not a heading
## also not a heading
\`\`\`
## Another real heading`;
    const toc = extractToc(md);
    expect(toc).toHaveLength(2);
    expect(toc.map((t) => t.text)).toEqual(['Real heading', 'Another real heading']);
  });

  it('strips inline markdown markers from heading text', () => {
    const md = `## Header with \`code\` and **bold**`;
    const toc = extractToc(md);
    expect(toc[0].text).toBe('Header with code and bold');
  });

  it('produces a slug compatible with rehype-slug', () => {
    const md = `## TLS Handshake — clientHello!`;
    const toc = extractToc(md);
    expect(toc[0].slug).toBe('tls-handshake-clienthello');
  });
});
