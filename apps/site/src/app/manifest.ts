import type { MetadataRoute } from 'next';

/**
 * Web App Manifest (PWA-lite). Adds Android/iOS "Add to Home Screen"
 * capability with proper theme color and naming. No service worker
 * — Fathom is content-static, not an offline-first app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fathom — Framework de Maestria Full Stack',
    short_name: 'Fathom',
    description:
      'Trilha mastery-based de Novice a Staff/Principal Software Engineer.',
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
