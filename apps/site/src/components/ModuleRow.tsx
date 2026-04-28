'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, Lock } from 'lucide-react';
import { EASE_STANDARD } from '@/lib/motion';
import type { ModuleSummary } from '@/lib/content';

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_STANDARD },
  },
};

export function ModuleRow({ module: mod }: { module: ModuleSummary }) {
  const isCapstone = mod.rawId.startsWith('CAPSTONE');
  const isLocked = mod.frontmatter?.status === 'locked';

  return (
    <motion.div
      variants={rowVariants}
      className="group grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_180px_60px] items-center
                 gap-4 md:gap-8 py-5 border-b border-mist/40
                 hover:bg-carbon/50 transition-colors duration-200 px-4 -mx-4"
    >
      <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
        {isCapstone ? 'Capstone' : mod.rawId}
      </span>

      <Link
        href={`/modules/${mod.id}`}
        className="font-sans text-body text-pearl group-hover:text-gold-leaf transition-colors duration-300 truncate"
      >
        {mod.title}
      </Link>

      <span className="hidden md:block font-mono text-caption text-chrome tracking-wide text-right truncate">
        {mod.prereqs.length > 0 ? mod.prereqs.join(', ') : '—'}
      </span>

      <span className="flex items-center justify-end text-mist group-hover:text-gold-leaf transition-colors duration-300">
        {isLocked ? <Lock size={14} strokeWidth={1} /> : <ArrowUpRight size={16} strokeWidth={1} />}
      </span>
    </motion.div>
  );
}

export function ModuleRowHeader() {
  return (
    <div className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_180px_60px] items-center
                    gap-4 md:gap-8 py-3 border-b border-mist
                    px-4 -mx-4">
      <span className="font-mono text-caption text-chrome tracking-luxury uppercase">ID</span>
      <span className="font-mono text-caption text-chrome tracking-luxury uppercase">Módulo</span>
      <span className="hidden md:block font-mono text-caption text-chrome tracking-luxury uppercase text-right">
        Prereqs
      </span>
      <span />
    </div>
  );
}
