import { test, expect, type Page } from '@playwright/test';

const STORAGE_KEY = 'fathom:visitor-progress:v1';
const VISITED_KEY = 'fathom:visited';

async function seedFresh(page: Page) {
  await page.addInitScript(
    ({ progressKey, visitedKey }: { progressKey: string; visitedKey: string }) => {
      try {
        window.localStorage.removeItem(progressKey);
        window.localStorage.removeItem(visitedKey);
      } catch {
        // private mode, etc.
      }
    },
    { progressKey: STORAGE_KEY, visitedKey: VISITED_KEY },
  );
}

async function seedCompleted(page: Page, modules: string[]) {
  const data = {
    version: 1,
    modules: Object.fromEntries(
      modules.map((id) => [id.toLowerCase(), { state: 'completed', quizPassedAt: 1700000000000 }]),
    ),
  };
  await page.addInitScript(
    ({ progressKey, json }: { progressKey: string; json: string }) => {
      try {
        window.localStorage.setItem(progressKey, json);
      } catch {
        // private mode, etc.
      }
    },
    { progressKey: STORAGE_KEY, json: JSON.stringify(data) },
  );
}

test.describe('visitor progress flow', () => {
  test('a fresh visitor sees the quiz, the meter, and a disabled submit on 01-01', async ({
    page,
  }) => {
    await seedFresh(page);
    await page.goto('/modules/01-01');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Modelo de Computação, CPU/i, level: 1 }),
    ).toBeVisible();

    const banner = page.getByRole('progressbar', { name: /módulos concluídos/i });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('aria-valuenow', '0');

    await expect(page.getByRole('heading', { name: /quiz de conclusão/i })).toBeVisible();
    const radiogroups = page.getByRole('radiogroup', { name: /opções da pergunta/i });
    await expect(radiogroups).toHaveCount(5);

    const submit = page.getByRole('button', { name: /enviar respostas/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('completing 01-01 unlocks 01-02 and reveals the chip + concluído badge', async ({
    page,
  }) => {
    await seedCompleted(page, ['01-01']);
    await page.goto('/modules/01-01');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/^Concluído$/i).first()).toBeVisible();
    await expect(page.getByLabel(/Progresso: 1 de \d+ módulos/i)).toBeVisible();

    await page.goto('/modules/01-02');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/bloqueado pela trilha/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /marcar como concluído/i })).toBeVisible();
  });

  test('the progress page shows zero completed for a fresh visitor', async ({ page }) => {
    await seedFresh(page);
    await page.goto('/progress');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: /resetar progresso/i })).toHaveCount(0);
    const banner = page.getByRole('progressbar', { name: /módulos concluídos/i });
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('aria-valuenow', '0');
  });

  test('reset button wipes progress', async ({ page }) => {
    await seedCompleted(page, ['01-01']);
    await page.goto('/progress');
    await page.waitForLoadState('domcontentloaded');

    const resetBtn = page.getByRole('button', { name: /resetar progresso/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    const dialog = page.getByRole('dialog', { name: /resetar progresso/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /sim, resetar tudo/i }).click();

    await expect(resetBtn).toHaveCount(0);
    const banner = page.getByRole('progressbar', { name: /módulos concluídos/i });
    await expect(banner).toHaveAttribute('aria-valuenow', '0');
  });

  test('the locked notice appears for a module whose prereqs are not yet completed', async ({
    page,
  }) => {
    await seedFresh(page);
    await page.goto('/modules/01-02');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/bloqueado pela trilha/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /01-01/i }).first()).toBeVisible();
  });
});
