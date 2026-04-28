'use client';

import { motion } from 'framer-motion';
import { EASE_STANDARD, fadeSlideUp, lineReveal, staggerContainer } from '@/lib/motion';

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

export function EyebrowHeading({ eyebrow, title, subtitle, align = 'left' }: Props) {
  return (
    <motion.div
      variants={staggerContainer(0.08, 0)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      className={align === 'center' ? 'text-center' : ''}
    >
      <motion.p
        variants={fadeSlideUp}
        className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-3"
      >
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeSlideUp}
        className="font-display text-display-lg text-pearl tracking-tight"
      >
        {title}
      </motion.h2>
      <motion.div
        variants={lineReveal}
        className={`h-px bg-gold-leaf w-24 mt-4 ${align === 'center' ? 'mx-auto' : ''}`}
      />
      {subtitle && (
        <motion.p
          variants={fadeSlideUp}
          transition={{ duration: 0.8, ease: EASE_STANDARD, delay: 0.2 }}
          className="font-sans text-body-lg text-chrome leading-relaxed mt-6 max-w-2xl"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
