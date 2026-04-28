'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { Search } from 'lucide-react';
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
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    setIsMac(/mac/i.test(navigator.platform));
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 md:px-16 lg:px-24 py-5">
        <Link
          href="/"
          className="font-display text-lg text-pearl tracking-wide hover:text-gold-leaf transition-colors duration-300"
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open command palette"
            className="hidden md:inline-flex items-center gap-2 font-mono text-caption tracking-wide
                       border border-mist/60 text-chrome px-3 py-2
                       hover:border-platinum hover:text-platinum transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            <Search size={12} strokeWidth={1} />
            <span className="opacity-80">{isMac ? '⌘' : 'Ctrl'}</span>
            <span className="opacity-80">K</span>
          </button>
          <Link
            href="/modules/n01"
            className="font-sans text-caption tracking-luxury uppercase border border-mist text-chrome
                       px-5 py-2 hover:border-platinum hover:text-platinum transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            Begin
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
