---
title: "Phase 06: Integration Tests & Deployment"
description: "E2E tests, CI/CD pipeline, deployment to production"
effort: 20h
phase: 06
parallel-group: C
dependencies: ["04", "05"]  # Depends on realtime + payments
status: pending
---

# Phase 06: Integration Tests & Deployment

## Exclusive File Ownership

```
/tests/
  /e2e/
    extension.spec.ts    # Extension E2E tests
    web.spec.ts          # Web dashboard E2E tests
    payments.spec.ts     # Payment flow tests
  /integration/
    api.spec.ts          # API integration tests
    db.spec.ts           # Database tests
  playwright.config.ts   # Playwright configuration
/.github/
  /workflows/
    ci.yml               # CI pipeline
    deploy.yml           # Deployment pipeline
```

## Implementation Steps

### 6.1 Playwright Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 6.2 Extension E2E Tests (e2e/extension.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Chrome Extension', () => {
  test('popup loads and shows login when not authenticated', async ({ page }) => {
    // Load extension popup
    // Verify login screen appears
  });

  test('can capture code context from AI IDE', async ({ page }) => {
    // Navigate to Cursor/Replit
    // Trigger extension capture
    // Verify captured data structure
  });

  test('displays expert list from API', async ({ page }) => {
    // Mock API response
    // Open extension popup
    // Verify experts displayed
  });

  test('can request session with expert', async ({ page }) => {
    // Select expert
    // Submit request
    // Verify session created
  });
});

test.describe('Extension Background Service Worker', () => {
  test('handles authentication messages', async () => {
    // Test token storage
    // Test auth header attachment
  });

  test('forwards API requests correctly', async () => {
    // Mock API endpoint
    // Send request via message passing
    // Verify response handled
  });
});
```

### 6.3 Web Dashboard E2E Tests (e2e/web.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');
    await page.goto('/dashboard/user');
  });

  test('displays active sessions', async ({ page }) => {
    // Verify session cards render
    // Check session status badges
  });

  test('shows available experts', async ({ page }) => {
    // Navigate to find expert section
    // Verify expert cards display
    // Check filtering works
  });

  test('can start video session', async ({ page }) => {
    // Join existing session
    // Verify video room loads
    // Test screen share toggle
  });
});

test.describe('Expert Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'expert@example.com');
    await page.fill('[name=password]', 'password');
    await page.goto('/dashboard/expert');
  });

  test('displays earnings stats', async ({ page }) => {
    // Verify stat cards render
    // Check currency formatting
  });

  test('availability toggle works', async ({ page }) => {
    // Change status to online
    // Verify UI updates
    // Check Supabase realtime sync
  });

  test('incoming requests display', async ({ page }) => {
    // Mock incoming request
    // Verify notification appears
  });
});

test.describe('Payment Flow', () => {
  test('payment modal opens correctly', async ({ page }) => {
    // Go to checkout
    // Verify payment amount
    // Check form fields
  });

  test('Stripe checkout redirects', async ({ page }) => {
    // Mock Stripe
    // Click pay button
    // Verify redirect to Stripe
  });

  test('payment success shows confirmation', async ({ page }) => {
    // Complete payment
    // Verify success message
    // Check session status updated
  });
});
```

### 6.4 API Integration Tests (integration/api.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('POST /api/experts returns filtered experts', async ({ request }) => {
    const response = await request.post('/api/experts', {
      data: { skills: ['react', 'typescript'] }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.experts).toBeDefined();
  });

  test('POST /api/sessions creates session', async ({ request }) => {
    const response = await request.post('/api/sessions', {
      data: {
        expertId: 'uuid',
        contextHtml: '<html>...</html>'
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.sessionId).toBeDefined();
  });

  test('GET /api/sessions/:id returns session details', async ({ request }) => {
    const response = await request.get('/api/sessions/session-uuid');
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Database Operations', () => {
  test('profiles table creates on auth.user insert', async ({ request }) => {
    // Create user via Supabase Auth
    // Verify profile created in public.profiles
  });

  test('sessions update status correctly', async ({ request }) => {
    // Create session
    // Update status to 'in_progress'
    // Verify database updated
  });

  test('expert matching returns ranked results', async ({ request }) => {
    // Call matching function
    // Verify results ordered by score
  });
});
```

### 6.5 GitHub Actions CI Pipeline (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20.x'

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run typecheck
        run: npm run typecheck

      - name: Run format check
        run: npm run format:check

  test-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install extension dependencies
        run: cd extensions && npm ci

      - name: Run extension tests
        run: cd extensions && npm run test

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install web dependencies
        run: cd web && npm ci

      - name: Run web tests
        run: cd web && npm run test

      - name: Run E2E tests
        run: cd web && npm run test:e2e

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: postgres://test:test@localhost:5432/test
          SUPABASE_KEY: test-key

  build-and-deploy:
    needs: [lint-and-typecheck, test-extension, test-web, test-integration]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Build web
        run: cd web && npm run build

      - name: Build extension
        run: cd extensions && npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./web
```

### 6.6 Deployment Pipeline (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  release:
    types: [published]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install and build
        run: |
          cd web
          npm ci
          npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./web

  deploy-extension:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Build extension
        run: |
          cd extensions
          npm ci
          npm run build

      - name: Create release ZIP
        run: |
          cd extensions
          zip -r release.zip . -x "node_modules/*" ".git/*"

      - name: Create GitHub release
        uses: softprops/action-gh-release@v1
        with:
          files: extensions/release.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-supabase:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy database changes
        run: |
          cd supabase
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db push

      - name: Deploy Edge Functions
        run: |
          cd supabase
          supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

### 6.7 Integration Test Suite

```typescript
// tests/integration/full-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Full User Workflow', () => {
  test('complete session flow: login -> find expert -> pay -> join session', async ({
    page
  }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');

    // 2. Find expert
    await page.goto('/dashboard');
    await page.click('text=Find an Expert');
    await page.click('text=Request Session on first expert');

    // 3. Payment
    await page.click('text=Pay Now');
    // Handle Stripe redirect/mock

    // 4. Join session
    await page.waitForURL(/\/session\//);
    await page.waitForSelector('[data-testid=video-room]');

    // 5. End session
    await page.click('text=End Session');
    await page.waitForSelector('text=Session Completed');
  });
});

test.describe('Expert Workflow', () => {
  test('complete expert flow: login -> go online -> accept request -> complete session', async ({
    page
  }) => {
    // 1. Login as expert
    await page.goto('/login');
    await page.fill('[name=email]', 'expert@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');

    // 2. Set availability
    await page.goto('/dashboard/expert');
    await page.selectOption('select[value=offline]', 'online');

    // 3. Accept request (mock incoming)
    await page.click('text=Accept Request');

    // 4. Join session
    await page.waitForURL(/\/session\//);
    await page.waitForSelector('[data-testid=video-room]');

    // 5. Complete session
    await page.click('text=Complete Session');
    await page.waitForSelector('text=Payment processing');
  });
});

test.describe('Payment Integration', () => {
  test('Stripe Connect onboarding flow', async ({ page }) => {
    // Navigate to expert settings
    await page.goto('/dashboard/expert/settings');
    await page.click('text=Set up payments');

    // Verify redirect to Stripe
    await page.waitForURL(/stripe\.com/);
  });

  test('payment splits correctly (90% expert, 10% platform)', async ({}) => {
    // This would test the backend calculation
    // Create payment for $50
    // Verify platform_fee = $5, expert_amount = $45
  });
});
```

### 6.8 Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Environment Variables
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_PUBLISHABLE_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] DAILY_API_KEY
- [ ] DAILY_SIGNING_KEY
- [ ] NEXT_PUBLIC_APP_URL

### Supabase
- [ ] Enable Row Level Security
- [ ] Configure auth providers (GitHub, Google)
- [ ] Set up email confirmation
- [ ] Deploy Edge Functions
- [ ] Configure webhooks for Stripe

### Stripe
- [ ] Create Connect account
- [ ] Configure webhook endpoints
- [ ] Set up products and pricing

### Daily.co
- [ ] Configure API key
- [ ] Set up recording (optional)
- [ ] Configure webhook events

### Chrome Extension
- [ ] Update manifest version
- [ ] Test in Chrome
- [ ] Create store listing assets

### Production
- [ ] Run full E2E test suite
- [ ] Verify all integrations
- [ ] Set up monitoring/alerting
- [ ] Document runbooks
```

## Success Criteria

- [ ] All E2E tests pass in CI
- [ ] Integration tests verify API contracts
- [ ] CI pipeline runs on every PR
- [ ] Automated deployment to production
- [ ] Extension builds successfully
- [ ] No file overlap with other phases

## Conflict Prevention

- Test files under `/tests/` exclusive
- GitHub workflows in `/.github/` don't conflict
- All other files in previous phases
