'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { EASE_STANDARD, fadeOnly, fadeSlideUp, lineReveal, staggerContainer } from '@/lib/motion';

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

export function EyebrowHeading({ eyebrow, title, subtitle, align = 'left' }: Props) {
  const reduced = useReducedMotion();
  const slide = reduced ? fadeOnly : fadeSlideUp;
  const line = reduced ? fadeOnly : lineReveal;
  return (
    <motion.div
      variants={staggerContainer(reduced ? 0 : 0.08, 0)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      className={align === 'center' ? 'text-center' : ''}
    >
      <motion.p
        variants={slide}
        className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3"
      >
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={slide}
        className="font-display text-display-lg text-pearl tracking-tight"
      >
        {title}
      </motion.h2>
      <motion.div
        variants={line}
        className={`h-px bg-gold-leaf w-24 mt-4 ${align === 'center' ? 'mx-auto' : ''}`}
        aria-hidden="true"
      />
      {subtitle && (
        <motion.p
          variants={slide}
          transition={reduced ? { duration: 0.01 } : { duration: 0.8, ease: EASE_STANDARD, delay: 0.2 }}
          className="font-sans text-body-lg text-chrome leading-relaxed mt-6 max-w-2xl"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
