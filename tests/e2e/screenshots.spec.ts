import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const outputDir = 'docs/screenshots';

test.skip(
  process.env.MINDMESH_SCREENSHOTS !== '1',
  'Demo screenshots are captured on demand with npm run screenshots.',
);

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

async function pauseForScene(page: Page) {
  await page.waitForTimeout(1400);
}

async function capture(page: Page, name: string) {
  await pauseForScene(page);
  await page.screenshot({ path: `${outputDir}/${name}.png`, animations: 'disabled' });
}

test.beforeAll(() => {
  mkdirSync(outputDir, { recursive: true });
});

test('captures the bilingual demo screens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load sample project' }).first().click();
  await expect(page).toHaveURL(/\/universe$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Universe' })).toBeVisible();
  await capture(page, 'universe');

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Dashboard' })
    .click();
  await expect(page.getByText('Knowledge pulse')).toBeVisible();
  await capture(page, 'dashboard');

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Documents' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();
  await capture(page, 'documents');

  await page.getByRole('link', { name: /mindmesh-sample\.md/ }).first().click();
  await expect(page.getByRole('button', { name: 'Concept from this section' })).toBeVisible();
  await capture(page, 'document-viewer');

  await page.goto('/search?q=provenance');
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
  await capture(page, 'search');

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Learning' })
    .click();
  await expect(page.getByText('Mastery orbit')).toBeVisible();
  await capture(page, 'learning');

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'AI settings' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await capture(page, 'settings');

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Data & backups' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Data & backup' })).toBeVisible();
  await capture(page, 'data');

  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();
  await expect(page.getByText('Dasbor', { exact: true }).first()).toBeVisible();
  await page.goto('/universe');
  await expect(page.getByRole('heading', { level: 1, name: 'Semesta' })).toBeVisible();
  await capture(page, 'universe-id');

  await page.goto('/');
  await expect(page.getByText('Denyut pengetahuan')).toBeVisible();
  await capture(page, 'dashboard-id');

  await page.getByRole('button', { name: 'Bahasa' }).click();
  await page.getByRole('option', { name: 'Inggris' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Knowledge pulse')).toBeVisible();
  await capture(page, 'dashboard-mobile');
});
