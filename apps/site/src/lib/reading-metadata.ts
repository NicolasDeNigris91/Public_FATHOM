export interface ReadingMetadata {
  words: number;
  minutes: number;
  codeBlocks: number;
}

const WPM = 220;

export function readingMetadata(markdown: string): ReadingMetadata {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_\-`|]/g, ' ');
  const words = stripped.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WPM));
  const codeBlocks = (markdown.match(/^```/gm)?.length ?? 0) >> 1;
  return { words, minutes, codeBlocks };
}
