import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Derive the expected posting count from the job content collection so this
// assertion stays correct as roles are added or removed.
const jobsDir = fileURLToPath(new URL('../src/content/jobs', import.meta.url));
const expectedRoleCount = readdirSync(jobsDir).filter((f) => f.endsWith('.md')).length;

test.describe('Open roles listing', () => {
    test('shows the roles grid with all postings', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Open roles' })).toBeVisible();

        const grid = page.getByTestId('roles-grid');
        await expect(grid).toBeVisible();
        await expect(page.getByTestId('role-card')).toHaveCount(expectedRoleCount);
    });

    test('links through to a role detail page', async ({ page }) => {
        await page.goto('/');
        const firstCard = page.getByTestId('role-card').first();
        const title = await firstCard.getByTestId('role-title').textContent();
        await firstCard.click();
        await expect(page.getByTestId('role-detail-title')).toHaveText(title!.trim());
        await expect(page.getByTestId('apply-form')).toBeVisible();
    });

    for (const { title, location } of [
        { title: 'Senior Frontend Engineer', location: 'Remote (US & Canada)' },
        { title: 'Financial Analyst', location: 'Woodinville, WA, USA' },
    ]) {
        test(`shows ${title} location on the card and details`, async ({ page }) => {
            await page.goto('/');
            const card = page.getByTestId('role-card').filter({
                has: page.getByRole('heading', { name: title, exact: true }),
            });

            await expect(card).toBeVisible();
            await expect(card.getByTestId('role-location')).toHaveText(location);
            await card.click();
            await expect(page.getByText(location, { exact: true })).toBeVisible();
        });
    }

    test.describe('filters', () => {
        const department = 'Finance';
        const location = 'Woodinville, WA, USA';
        const cards = (page: Page): Locator => page.getByTestId('role-card');
        const visibleCards = (page: Page): Locator => page.locator('[data-testid="role-card"]:visible');

        test('filters by department, location, both, and resets', async ({ page }) => {
            await page.goto('/');

            await test.step('department only', async () => {
                await page.getByTestId('department-filter').selectOption(department);
                const count = await visibleCards(page).count();
                expect(count).toBeGreaterThan(0);
                expect(count).toBeLessThan(expectedRoleCount);
                for (const text of await visibleCards(page).getByTestId('role-department').allTextContents()) {
                    expect(text.trim()).toBe(department);
                }
                await expect(page).toHaveURL(/department=Finance/);
            });

            await test.step('department and location', async () => {
                await page.getByTestId('location-filter').selectOption(location);
                await expect(visibleCards(page).first()).toBeVisible();
                for (const text of await visibleCards(page).getByTestId('role-location').allTextContents()) {
                    expect(text.trim()).toBe(location);
                }
                for (const text of await visibleCards(page).getByTestId('role-department').allTextContents()) {
                    expect(text.trim()).toBe(department);
                }
            });

            await test.step('location only', async () => {
                await page.getByTestId('department-filter').selectOption('');
                for (const text of await visibleCards(page).getByTestId('role-location').allTextContents()) {
                    expect(text.trim()).toBe(location);
                }
            });

            await test.step('reset', async () => {
                await page.getByTestId('filters-reset').click();
                await expect(visibleCards(page)).toHaveCount(expectedRoleCount);
                await expect(page.getByTestId('department-filter')).toHaveValue('');
                await expect(page.getByTestId('location-filter')).toHaveValue('');
                await expect(page).not.toHaveURL(/department=|location=/);
            });
        });

        test('shows an empty state for a combination with no roles, then resets', async ({ page }) => {
            await page.goto('/');
            await page.getByTestId('department-filter').selectOption('Security');
            await page.getByTestId('location-filter').selectOption('Amsterdam, Netherlands');

            await expect(page.getByTestId('filtered-empty-state')).toBeVisible();
            await expect(page.getByText('No roles match your filters')).toBeVisible();
            await expect(visibleCards(page)).toHaveCount(0);

            await page.getByTestId('filtered-empty-reset').click();
            await expect(page.getByTestId('filtered-empty-state')).toBeHidden();
            await expect(visibleCards(page)).toHaveCount(expectedRoleCount);
        });

        test('restores filters from the URL', async ({ page }) => {
            await page.goto(`/?department=${encodeURIComponent(department)}`);
            await expect(page.getByTestId('department-filter')).toHaveValue(department);
            await expect(cards(page).filter({ hasText: 'Posted' }).first()).toBeVisible();
            for (const text of await visibleCards(page).getByTestId('role-department').allTextContents()) {
                expect(text.trim()).toBe(department);
            }
        });

        test('ignores an unknown filter value from the URL and cleans the URL', async ({ page }) => {
            await page.goto(`/?department=${encodeURIComponent(department)}&location=bogus`);
            await expect(page.getByTestId('department-filter')).toHaveValue(department);
            await expect(page.getByTestId('location-filter')).toHaveValue('');
            await expect.poll(() => new URL(page.url()).search).toBe(
                `?${new URLSearchParams({ department }).toString()}`,
            );
        });
    });

    test('has no automatically detectable accessibility violations', async ({ page }) => {
        await page.goto('/');
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
});
