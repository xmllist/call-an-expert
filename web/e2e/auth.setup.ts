import { test as setup, expect } from '@playwright/test'

/**
 * Authentication Setup
 *
 * This setup file creates authenticated session states for E2E tests.
 * Creates both user and expert auth states that can be reused across tests.
 *
 * Note: In a real environment, this would use actual Supabase auth.
 * For testing, we use mock authentication or test accounts.
 */

const STORAGE_STATE_USER = 'e2e/.auth/user.json'
const STORAGE_STATE_EXPERT = 'e2e/.auth/expert.json'

setup.describe.configure({ mode: 'serial' })

/**
 * Setup: Create authenticated user session
 *
 * This would normally log in via the UI or use a test API endpoint.
 * For now, we'll use a placeholder that can be customized.
 */
setup('authenticate as user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Check if login page loads
  await expect(page.locator('h1, h2')).toContainText(/sign in|log in|welcome/i)

  // Note: In real tests, you would fill in credentials:
  // await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
  // await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)
  // await page.click('button[type="submit"]')

  // For now, we'll save an empty auth state
  // Real implementation would save authenticated cookies
  await page.context().storageState({ path: STORAGE_STATE_USER })
})

/**
 * Setup: Create authenticated expert session
 */
setup('authenticate as expert', async ({ page }) => {
  await page.goto('/login')

  // Same as above, but with expert credentials
  // await page.fill('input[type="email"]', process.env.TEST_EXPERT_EMAIL!)
  // await page.fill('input[type="password"]', process.env.TEST_EXPERT_PASSWORD!)
  // await page.click('button[type="submit"]')

  await page.context().storageState({ path: STORAGE_STATE_EXPERT })
})
