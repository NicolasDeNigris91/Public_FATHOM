'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowUpRight, Lock, Check, Clock as ClockIcon, RotateCw } from 'lucide-react';
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

const rowVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

function StatusIcon({ status }: { status: string | undefined }) {
  const s = (status ?? '').toLowerCase();
  if (s.startsWith('done')) return <Check size={14} strokeWidth={1.5} className="text-racing-green-lit" />;
  if (s.includes('progress')) return <ClockIcon size={14} strokeWidth={1.5} className="text-gold-leaf" />;
  if (s.includes('refresh')) return <RotateCw size={14} strokeWidth={1.5} className="text-chrome" />;
  if (s.includes('lock')) return <Lock size={14} strokeWidth={1} className="text-mist" />;
  return null;
}

export function ModuleRow({ module: mod }: { module: ModuleSummary }) {
  const reduced = useReducedMotion();
  const isCapstone = mod.rawId.startsWith('CAPSTONE');
  const isLocked = mod.frontmatter?.status === 'locked';

  return (
    <motion.div
      variants={reduced ? rowVariantsReduced : rowVariants}
      className="group grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_180px_60px] items-center
                 gap-4 md:gap-8 py-5 border-b border-mist/40
                 hover:bg-carbon/50 transition-colors duration-200 px-4 -mx-4"
    >
      <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
        {isCapstone ? 'Capstone' : mod.rawId}
      </span>

      <Link
        href={`/modules/${mod.id}`}
        className="font-sans text-body text-pearl group-hover:text-gold-leaf transition-colors duration-300 truncate inline-flex items-center gap-3"
      >
        <span className="truncate">{mod.title}</span>
        <StatusIcon status={mod.frontmatter.status} />
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
