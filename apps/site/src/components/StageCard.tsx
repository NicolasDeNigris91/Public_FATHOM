'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
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

export function StageCard({ stage }: { stage: StageMeta }) {
  const number = String(stage.number).padStart(2, '0');
  return (
    <motion.div variants={cardVariants}>
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

        <p className="font-mono text-caption text-chrome/70 tracking-wide">
          {stage.moduleCount} módulos · 1 capstone
        </p>

        <div className="absolute -bottom-px -left-px w-12 h-px bg-gold-leaf opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute -bottom-px -left-px w-px h-12 bg-gold-leaf opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Link>
    </motion.div>
  );
}
