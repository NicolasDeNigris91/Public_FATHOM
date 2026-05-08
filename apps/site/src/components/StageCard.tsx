'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { EASE_STANDARD } from '@/lib/motion';
import type { StageMeta } from '@/lib/stages';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_STANDARD },
  },
};

const cardVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

interface StageCardProps {
  stage: StageMeta;
  progress?: { done: number; total: number };
}

export function StageCard({ stage, progress }: StageCardProps) {
  const reduced = useReducedMotion();
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : null;
  const number = String(stage.number).padStart(2, '0');
  return (
    <motion.div variants={reduced ? cardVariantsReduced : cardVariants}>
      <Link
        href={`/stages/${stage.id}`}
        className="group relative block bg-graphite border border-mist/50
                   p-8 md:p-10 transition-all duration-500
                   hover:border-gold-leaf hover:shadow-card-hover focus-visible:outline-none
                   focus-visible:border-gold-leaf"
      >
        <div className="flex items-start justify-between mb-6">
          <span className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
            Estágio {number}
          </span>
          <ArrowUpRight
            size={18}
            strokeWidth={1}
            className="text-mist group-hover:text-gold-leaf transition-colors duration-300"
          />
        </div>

        <h3 className="font-display text-display-md text-pearl mb-1 tracking-tight group-hover:text-gold-leaf transition-colors duration-300">
          {stage.title}
        </h3>
        <p className="font-sans text-caption text-chrome tracking-wide uppercase mb-6">
          {stage.subtitle}
        </p>

        <div className="h-px bg-gold-leaf w-12 mb-6 transition-all duration-500 group-hover:w-24" />

        <p className="font-sans text-body text-chrome leading-relaxed mb-6">
          {stage.tagline}
        </p>

        <p className="font-mono text-caption text-fog tracking-wide">
          {stage.moduleCount} módulos · 1 capstone
        </p>

        {progress && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-caption text-chrome tracking-wide">
                {progress.done} / {progress.total}
              </span>
              <span className="font-mono text-caption text-racing-green-lit tracking-wide">
                {percent}%
              </span>
            </div>
            <div className="h-px bg-mist/40 relative">
              <div
                className="absolute top-0 left-0 h-px bg-gold-leaf transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="absolute -bottom-px -left-px w-12 h-px bg-gold-leaf opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
        <div className="absolute -bottom-px -left-px w-px h-12 bg-gold-leaf opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
