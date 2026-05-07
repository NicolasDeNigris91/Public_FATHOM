import { describe, expect, it } from 'vitest';
import {
  EASE_STANDARD,
  fadeOnly,
  fadeSlideUp,
  lineReveal,
  staggerContainer,
} from './motion';

describe('motion variants', () => {
  it('uses a four-point cubic-bezier ease', () => {
    expect(EASE_STANDARD).toHaveLength(4);
    for (const c of EASE_STANDARD) expect(typeof c).toBe('number');
  });

  it('fadeSlideUp has hidden + visible states with a transition', () => {
    expect(fadeSlideUp.hidden).toMatchObject({ opacity: 0 });
    expect(fadeSlideUp.visible).toMatchObject({ opacity: 1, y: 0 });
    expect((fadeSlideUp.visible as { transition: unknown }).transition).toBeDefined();
  });

  it('lineReveal animates scaleX from 0 to 1', () => {
    expect(lineReveal.hidden).toMatchObject({ scaleX: 0, originX: 0 });
    expect(lineReveal.visible).toMatchObject({ scaleX: 1 });
  });

  it('fadeOnly toggles opacity only', () => {
    expect(fadeOnly.hidden).toMatchObject({ opacity: 0 });
    expect(fadeOnly.visible).toMatchObject({ opacity: 1 });
  });
});

describe('staggerContainer', () => {
  it('produces a transition with the requested stagger and delay', () => {
    const variants = staggerContainer(0.2, 0.5);
    const transition = (variants.visible as { transition: { staggerChildren: number; delayChildren: number } }).transition;
    expect(transition.staggerChildren).toBe(0.2);
    expect(transition.delayChildren).toBe(0.5);
  });

  it('defaults to stagger=0.08 and delay=0', () => {
    const variants = staggerContainer();
    const transition = (variants.visible as { transition: { staggerChildren: number; delayChildren: number } }).transition;
    expect(transition.staggerChildren).toBe(0.08);
    expect(transition.delayChildren).toBe(0);
  });
});
