import type { TocItem } from '@/lib/toc';

interface Props {
  items: TocItem[];
}

export function TableOfContents({ items }: Props) {
  if (items.length < 4) return null;

  return (
    <aside
      aria-label="Sumário"
      className="hidden xl:block xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)]
                 xl:overflow-y-auto xl:pl-8 xl:pr-2 xl:py-2 xl:w-64
                 border-l border-mist/30"
    >
      <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-4">
        Sumário
      </p>
      <ol className="space-y-2 list-none">
        {items.map((item, idx) => (
          <li
            key={`${idx}-${item.slug}`}
            className={item.level === 3 ? 'pl-3' : ''}
          >
            <a
              href={`#${item.slug}`}
              className={`block text-caption tracking-wide transition-colors duration-200 leading-snug
                          ${item.level === 2
                            ? 'font-mono text-chrome hover:text-pearl'
                            : 'font-mono text-chrome/70 hover:text-chrome'}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
