'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { EASE_STANDARD, fadeOnly, fadeSlideUp, lineReveal, staggerContainer } from '@/lib/motion';

const subtleFadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1.4, ease: EASE_STANDARD, delay: 1.0 },
  },
};

interface HeroProps {
  totalModules: number;
}

export function Hero({ totalModules }: HeroProps) {
  const reduced = useReducedMotion();
  const slideVariant = reduced ? fadeOnly : fadeSlideUp;
  const lineVariant = reduced ? fadeOnly : lineReveal;
  return (
    <section className="relative min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-32">
      <div className="absolute inset-y-0 left-8 md:left-16 lg:left-24 w-px bg-mist opacity-40" aria-hidden="true" />

      <motion.div
        className="max-w-7xl w-full mx-auto"
        variants={staggerContainer(reduced ? 0 : 0.15, reduced ? 0 : 0.3)}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={slideVariant}
          className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-8"
        >
          Framework de Maestria · {new Date().getFullYear()}
        </motion.p>

        <motion.h1
          variants={slideVariant}
          className="font-display text-display-xl text-pearl tracking-tight leading-none mb-4 max-w-4xl"
        >
          Fathom
        </motion.h1>

        <motion.div
          variants={lineVariant}
          className="h-px bg-gold-leaf w-32 mb-10"
          aria-hidden="true"
        />

        <motion.p
          variants={slideVariant}
          className="font-sans text-body-lg text-chrome leading-relaxed mb-6 max-w-3xl"
        >
          Trilha estruturada de iniciante real até Staff/Principal Software Engineer. Mastery-based, sem prazos, conduzida pelo mentor (você, peer, ou suplemento opcional) sob protocolo rígido.
        </motion.p>

        <motion.p
          variants={slideVariant}
          className="font-sans text-body text-chrome/80 leading-relaxed mb-12 max-w-3xl italic"
        >
          Não é curso. Não é bootcamp. Não é leitura passiva. É disciplina de longo prazo com módulos densos, portões de avaliação, e um produto encadeado (Logística) que evolui ao longo dos 5 estágios.
        </motion.p>

        <motion.div variants={fadeSlideUp} className="flex flex-wrap items-center gap-8 mb-16">
          <Link
            href="/modules/n01"
            className="font-sans text-caption tracking-luxury uppercase border border-platinum text-platinum
                       px-8 py-3 hover:bg-platinum hover:text-obsidian transition-colors duration-300
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platinum"
          >
            Begin → N01
          </Link>
          <Link
            href="/stages"
            className="font-sans text-caption tracking-luxury uppercase text-chrome hover:text-pearl
                       transition-colors duration-300"
          >
            Browse Stages
          </Link>
        </motion.div>

        <motion.div variants={fadeSlideUp} className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl">
          <Stat number="5" label="Estágios" />
          <Stat number={`${totalModules}`} label="Módulos" />
          <Stat number="5" label="Capstones" />
          <Stat number="∞" label="Prazo" />
        </motion.div>
      </motion.div>

      <motion.div
        variants={subtleFadeIn}
        initial="hidden"
        animate="visible"
        aria-hidden="true"
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-mono text-caption text-mist tracking-luxury uppercase">Scroll</span>
        <motion.div
          animate={reduced ? undefined : { y: [0, 8, 0] }}
          transition={reduced ? undefined : { duration: 2, repeat: Infinity, ease: EASE_STANDARD }}
        >
          <ArrowDown size={16} strokeWidth={1} className="text-mist" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="font-display text-display-md text-pearl mb-1">{number}</p>
      <p className="font-mono text-caption text-chrome tracking-luxury uppercase">{label}</p>
    </div>
  );
}
