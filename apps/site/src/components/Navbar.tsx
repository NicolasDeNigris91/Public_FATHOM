'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
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
  { label: 'Progress', href: '/progress' },
  { label: 'Index', href: '/index' },
  { label: 'About', href: '/about' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-caption tracking-luxury uppercase text-chrome
                         hover:text-pearl transition-colors duration-300"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="/modules/n01"
          className="font-sans text-caption tracking-luxury uppercase border border-mist text-chrome
                     px-5 py-2 hover:border-platinum hover:text-platinum transition-colors duration-300
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
        >
          Begin
        </Link>
      </div>
    </motion.nav>
  );
}
