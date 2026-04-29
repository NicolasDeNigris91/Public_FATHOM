import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fathom — Notas de engenharia de software',
    short_name: 'Fathom',
    description:
      'Minhas notas de estudo de engenharia de software, organizadas por estágio.',
    start_url: '/',
    display: 'minimal-ui',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['education', 'productivity', 'reference'],
    lang: 'pt-BR',
  };
}
