import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  items: Crumb[];
}

export function Breadcrumb({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center flex-wrap gap-x-1 gap-y-1 mb-12 font-mono text-caption tracking-luxury uppercase text-chrome"
    >
      {items.map((item, idx) => {
        const last = idx === items.length - 1;
        return (
          <span key={`${idx}-${item.label}`} className="inline-flex items-center gap-1">
            {idx > 0 && <ChevronRight size={10} strokeWidth={1} className="text-mist" aria-hidden="true" />}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="hover:text-pearl transition-colors duration-200"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? 'text-pearl' : ''} aria-current={last ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
