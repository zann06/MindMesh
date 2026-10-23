import { expect, test, type Page } from '@playwright/test';

async function loadSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load sample project' }).first().click();
  await expect(page).toHaveURL(/\/universe$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Universe' })).toBeVisible();
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('loads the sample and supports the core local workflow', async ({ page }) => {
  const errors = collectPageErrors(page);
  await loadSample(page);

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Dashboard' })
    .click();
  await expect(page.getByText('Knowledge pulse')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('link', { name: /Knowledge graph/ }).first().click();
  await expect(page.getByText('Spatial neighborhood')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Documents' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();
  await expect(page.getByTestId('feature-orb').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /mindmesh-sample\.md/ }).first()).toBeVisible();

  await page.getByRole('link', { name: /mindmesh-sample\.md/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'mindmesh-sample.md' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Concept from this section' })).toBeVisible();
  await expect(page.getByText(/Extracted text is shown exactly as indexed/)).toBeVisible();

  const search = page.getByRole('search').getByRole('textbox', {
    name: 'Search concepts and sources',
  });
  await search.fill('provenance');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=provenance$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
  await expect(page.getByTestId('feature-orb').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Evidence-first knowledge/ }).first()).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Learning' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Learning' })).toBeVisible();
  await expect(page.getByText('Mastery orbit')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.getByText('MindMesh sample check').first()).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'AI settings' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByTestId('feature-orb').first()).toBeVisible();
  await expect(page.getByText('AI is optional and off until you configure')).toBeVisible();
  await expect(page.getByText(/^AI connected$/)).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Data & backups' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Data & backup' })).toBeVisible();
  await expect(page.locator('main').getByText('MindMesh sample', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('1 local project', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'A knowledge space you can inspect' })).toBeVisible();
  await page.getByRole('link', { name: 'Privacy model' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Where your data goes' })).toBeVisible();

  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'Indonesian' }).click();
  await expect(page.getByText('Dasbor', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Bahasa' }).click();
  await page.getByRole('option', { name: 'Inggris' }).click();
  await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('language dropdown works with the keyboard', async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Language' });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'English' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Indonesian' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test('focuses the global search with the keyboard shortcut', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('search').getByRole('textbox', {
    name: 'Search concepts and sources',
  });
  await expect(search).toBeVisible();
  await page.keyboard.press('Control+K');
  await expect(search).toBeFocused();
});

test('generates a local quiz, records an attempt, and shows results', async ({ page }) => {
  const errors = collectPageErrors(page);
  await loadSample(page);

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Learning' })
    .click();
  await page.getByRole('link', { name: /Build quiz/i }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Build a quiz' })).toBeVisible();
  await expect(page.getByText('no AI', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Generate and start' }).click();
  await expect(page).toHaveURL(/\/learning\/quiz\/quiz_/);
  await expect(page.getByText(/Question 1 of \d+/)).toBeVisible();

  for (let index = 0; index < 25; index += 1) {
    if (page.url().includes('/results/')) break;
    const radio = page.locator('input[type="radio"]').first();
    if (await radio.count()) {
      await radio.check();
    } else {
      await page.getByLabel('Your answer').fill('A local explanation for this concept.');
    }
    await page.getByRole('button', { name: 'Check answer' }).click();
    const finish = page.getByRole('button', { name: 'Finish quiz' });
    if (await finish.isVisible()) {
      await finish.click();
      break;
    }
    await page.getByRole('button', { name: 'Next question' }).click();
  }

  await expect(page).toHaveURL(/\/results\/attempt_/);
  await expect(page.getByRole('main').getByText('Quiz complete')).toBeVisible();
  await expect(page.getByRole('link', { name: /Retake quiz/ })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Learning' })
    .click();
  await expect(page.getByText(/attempt/i).first()).toBeVisible();

  expect(errors).toEqual([]);
});
