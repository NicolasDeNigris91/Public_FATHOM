import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CommandPaletteMount } from '@/components/CommandPaletteMount';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { BackToTop } from '@/components/BackToTop';
import { Analytics } from '@/components/Analytics';
import { getAllModules } from '@/lib/content';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fathom.nicolaspilegidenigris.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Fathom | Notas de engenharia de software',
    template: '%s | Fathom',
  },
  description:
    'Minhas notas de estudo de engenharia de software, organizadas por estágio.',
  applicationName: 'Fathom',
  authors: [{ name: 'Nicolas De Nigris', url: 'https://github.com/NicolasDeNigris91' }],
  creator: 'Nicolas De Nigris',
  keywords: [
    'Fathom',
    'Notas de estudo',
    'Software Engineering',
    'Computer Science',
  ],
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Fathom',
    title: 'Fathom | Notas de engenharia de software',
    description:
      'Minhas notas de estudo de engenharia de software, organizadas por estágio.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fathom | Notas de engenharia de software',
    description: 'Minhas notas de estudo de engenharia de software, organizadas por estágio.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const allModules = await getAllModules();
  const moduleRefs = allModules.map((m) => ({ rawId: m.rawId, prereqs: m.prereqs }));

  return (
    <html
      lang="pt-BR"
      className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="bg-obsidian text-platinum font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
                     focus:px-6 focus:py-3 focus:bg-racing-green focus:text-pearl
                     focus:font-sans focus:text-caption focus:tracking-luxury focus:uppercase"
        >
          Skip to content
        </a>
        <Navbar modules={moduleRefs} />
        <main id="main-content">{children}</main>
        <Footer />
        <CommandPaletteMount />
        <KeyboardShortcuts />
        <BackToTop />
        <Analytics />
      </body>
    </html>
  );
}
