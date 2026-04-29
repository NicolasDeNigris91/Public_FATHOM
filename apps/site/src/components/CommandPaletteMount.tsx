import { CommandPalette, type PaletteEntry } from './CommandPalette';
import { STAGES } from '@/lib/stages';
import { getAllModules } from '@/lib/content';
import { DOCS } from '@/lib/docs';

export async function CommandPaletteMount() {
  const modules = await getAllModules();

  const entries: PaletteEntry[] = [
    { type: 'home', id: 'home', title: 'Home', subtitle: 'Overview', href: '/' },
    { type: 'progress', id: 'now', title: 'Now', subtitle: 'Em que estou estudando agora', href: '/now' },
    { type: 'progress', id: 'progress', title: 'Progress', subtitle: 'Dashboard de portões', href: '/progress' },
    { type: 'index', id: 'index', title: 'Module Index', subtitle: 'Mapa global + DAG', href: '/index' },
    { type: 'index', id: 'glossary', title: 'Glossary', subtitle: '210 termos canônicos', href: '/glossary' },
    { type: 'index', id: 'library', title: 'Library', subtitle: 'Livros canônicos curados', href: '/library' },
    { type: 'doc', id: 'docs', title: 'All Docs', subtitle: 'Protocolos, decisões, references', href: '/docs' },
    { type: 'home', id: 'about', title: 'About', subtitle: 'Sobre o framework', href: '/about' },

    ...STAGES.map((s): PaletteEntry => ({
      type: 'stage',
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      href: `/stages/${s.id}`,
    })),

    ...modules.map((m): PaletteEntry => ({
      type: 'module',
      id: m.id,
      rawId: m.rawId,
      title: m.title,
      subtitle: m.prereqs.length > 0 ? `prereqs: ${m.prereqs.join(', ')}` : undefined,
      href: `/modules/${m.id}`,
    })),

    ...DOCS.map((d): PaletteEntry => ({
      type: 'doc',
      id: d.slug,
      title: d.title,
      subtitle: d.eyebrow,
      href: `/docs/${d.slug}`,
    })),
  ];

  return <CommandPalette entries={entries} />;
}
