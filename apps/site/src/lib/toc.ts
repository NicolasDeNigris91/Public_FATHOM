export interface TocItem {
  level: 2 | 3;
  text: string;
  slug: string;
}

/**
 * Mirror of rehype-slug's logic for h2/h3 headings: lowercase, strip
 * non-word, collapse spaces to hyphens. Good enough for our framework
 * markdown (no exotic Unicode in headings).
 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extracts h2 and h3 headings from markdown body. Skips fenced code
 * blocks (which may contain # for shell prompts, comments, etc).
 * Returns a flat list — caller can render as nested or flat.
 */
export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = (m[1].length === 2 ? 2 : 3) as 2 | 3;
    const text = m[2].replace(/`/g, '').replace(/\*\*/g, '');
    items.push({ level, text, slug: slugify(text) });
  }

  return items;
}
