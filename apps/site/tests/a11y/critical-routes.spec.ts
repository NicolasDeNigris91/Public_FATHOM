import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ROUTES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'stages index', path: '/stages' },
  { name: 'module 01-01', path: '/modules/01-01' },
  { name: 'glossary', path: '/glossary' },
  { name: 'library', path: '/library' },
];

for (const route of ROUTES) {
  test(`a11y: ${route.name} (${route.path}) has no WCAG 2.1 A/AA violations`, async ({
    page,
  }) => {
    await page.goto(route.path);
    await page.waitForLoadState('domcontentloaded');

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
}
