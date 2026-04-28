'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { Menu, Search, X } from 'lucide-react';
import { EASE_STANDARD } from '@/lib/motion';

const navVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_STANDARD, delay: 0.2 },
  },
};

const navLinks = [
  { label: 'Stages', href: '/stages' },
  { label: 'Library', href: '/library' },
  { label: 'Progress', href: '/progress' },
  { label: 'Now', href: '/now' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    setIsMac(/mac/i.test(navigator.platform));
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function openPalette() {
    const evt = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });
    window.dispatchEvent(evt);
  }

  return (
    <motion.nav
      variants={navVariants}
      initial="hidden"
      animate="visible"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled
          ? 'bg-obsidian/90 backdrop-blur-md border-b border-mist/30'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-8 md:px-16 lg:px-24 py-5">
        <Link
          href="/"
          className="font-display text-lg text-pearl tracking-wide hover:text-gold-leaf transition-colors duration-300
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-platinum"
        >
          Fathom
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`font-sans text-caption tracking-luxury uppercase
                           transition-colors duration-300
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-platinum
                           ${active
                             ? 'text-pearl border-b border-gold-leaf pb-1'
                             : 'text-chrome hover:text-pearl'}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Abrir command palette"
            className="inline-flex items-center gap-2 font-mono text-caption tracking-wide
                       border border-mist/60 text-chrome px-3 py-2
                       hover:border-platinum hover:text-platinum transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            <Search size={12} strokeWidth={1} />
            <span className="hidden sm:inline opacity-80">{isMac ? '⌘' : 'Ctrl'}</span>
            <span className="hidden sm:inline opacity-80">K</span>
          </button>
          <Link
            href="/modules/n01"
            className="hidden sm:inline-block font-sans text-caption tracking-luxury uppercase border border-mist text-chrome
                       px-5 py-2 hover:border-platinum hover:text-platinum transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            Begin
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 border border-mist/60 text-chrome
                       hover:border-platinum hover:text-platinum transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            {mobileOpen ? <X size={16} strokeWidth={1} /> : <Menu size={16} strokeWidth={1} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-mist/30 bg-obsidian/95 backdrop-blur-md">
          <ul className="px-6 sm:px-8 py-6 space-y-4">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block font-sans text-caption tracking-luxury uppercase py-2
                               transition-colors duration-200
                               ${active ? 'text-pearl border-l-2 border-gold-leaf pl-4' : 'text-chrome pl-0'}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2 border-t border-mist/30">
              <Link
                href="/modules/n01"
                className="block font-sans text-caption tracking-luxury uppercase
                           border border-mist text-chrome px-5 py-3 mt-3
                           text-center hover:border-platinum hover:text-platinum transition-colors duration-200"
              >
                Begin → N01
              </Link>
            </li>
          </ul>
        </div>
      )}
    </motion.nav>
  );
}
