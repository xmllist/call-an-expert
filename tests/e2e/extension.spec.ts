// Extension E2E tests - Phase 06: Integration Tests
import { test, expect } from '@playwright/test';

test.describe('Chrome Extension Popup', () => {
  test('popup loads and shows login when not authenticated', async ({ page }) => {
    // Navigate to extension popup (mocked)
    await page.goto('chrome-extension://mock-extension-id/popup.html');

    // Verify login screen appears
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('displays expert list from API', async ({ page }) => {
    // Mock API response
    await page.route('**/api/experts**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          experts: [
            { id: '1', name: 'Expert 1', rating: 4.8, hourly_rate: 150 },
            { id: '2', name: 'Expert 2', rating: 4.9, hourly_rate: 200 },
          ],
        }),
      });
    });

    // Open extension popup
    await page.goto('chrome-extension://mock/popup.html');

    // Verify experts displayed
    await expect(page.locator('text=Expert 1')).toBeVisible();
    await expect(page.locator('text=Expert 2')).toBeVisible();
  });

  test('can filter experts by skill', async ({ page }) => {
    // Navigate to popup
    await page.goto('chrome-extension://mock/popup.html');

    // Click skill filter
    await page.click('text=Cursor');

    // Verify filtered results
    await expect(page.locator('text=Showing 1 expert')).toBeVisible();
  });

  test('can request session with expert', async ({ page }) => {
    // Select expert
    await page.goto('chrome-extension://mock/popup.html');
    await page.click('text=Request Session >> nth=0');

    // Verify session request modal
    await expect(page.locator('text=Confirm Session Request')).toBeVisible();

    // Submit request
    await page.click('text=Confirm');

    // Verify success
    await expect(page.locator('text=Session requested successfully')).toBeVisible();
  });
});

test.describe('Extension Content Script', () => {
  test('captures code context from AI IDE', async ({ page }) => {
    // Navigate to mock Cursor page
    await page.goto('https://cursor.sh/editor');

    // Trigger extension capture via keyboard shortcut
    await page.keyboard.press('Control+Shift+C');

    // Verify capture notification
    await expect(page.locator('text=Code captured')).toBeVisible();
  });

  test('detects IDE type correctly', async ({ page }) => {
    // Test Cursor detection
    await page.goto('https://cursor.sh/editor');
    await page.evaluate(() => {
      window.postMessage({ type: 'GET_IDE_TYPE' }, '*');
    });
    // Would verify IDE type detection in real scenario
  });
});

test.describe('Extension Background Service Worker', () => {
  test('handles authentication messages', async () => {
    // Test token storage via chrome.storage
    // This would be tested with chrome.storage API mocking
  });

  test('forwards API requests correctly', async ({ page }) => {
    // Mock API endpoint
    await page.route('**/api/sessions**', route => {
      route.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'test-123' }) });
    });

    // Send request via message passing
    const response = await page.evaluate(async () => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage(
          { type: 'API_REQUEST', payload: { url: '/api/sessions/create' } },
          resolve
        );
      });
    });

    // Verify response
    expect(response.status).toBe(200);
  });
});
