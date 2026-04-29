/**
 * Pure utility — no fs, no server-only deps. Lives in its own module
 * so it can be unit-tested in a node environment without hauling in the
 * server-only content reader.
 */

export interface ReadingMetadata {
  words: number;
  minutes: number;
  codeBlocks: number;
}

/**
 * Quick reading metadata for a Markdown body. WPM=220 is a reasonable
 * average for technical reading; rounded up to a whole minute.
 * Code blocks are counted but not subtracted — they slow reading;
 * we intentionally don't compensate, since "denser per minute" is fine.
 */
export function readingMetadata(markdown: string): ReadingMetadata {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_\-`|]/g, ' ');
  const words = stripped.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  const codeBlocks = (markdown.match(/^```/gm)?.length ?? 0) >> 1;
  return { words, minutes, codeBlocks };
}
