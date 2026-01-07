# Call-an-Expert Test Suite

## Phase 06: Integration Tests & Deployment

### Structure

```
tests/
├── playwright.config.ts    # Playwright configuration
├── package.json            # Test scripts
├── README.md              # This file
├── utils/
│   └── test-helpers.ts    # Shared test utilities
├── e2e/
│   ├── extension.spec.ts  # Chrome extension E2E tests
│   ├── web.spec.ts        # Web dashboard E2E tests
│   └── payments.spec.ts   # Payment flow E2E tests
└── integration/
    └── api.spec.ts        # API integration tests
```

### Running Tests

#### Install dependencies
```bash
cd tests
npm install
npx playwright install --with-deps
```

#### Run all tests
```bash
npm test
```

#### Run E2E tests only
```bash
npm run test:e2e
```

#### Run integration tests only
```bash
npm run test:integration
```

#### View test report
```bash
npm run test:report
```

### CI/CD

GitHub Actions workflows are in `.github/workflows/`:

- `ci.yml` - Runs on every PR and push to main
  - Linting and type checking
  - Unit tests (extension + web)
  - E2E tests
  - Integration tests
  - Build verification

- `deploy.yml` - Runs on release publish
  - Deploys web to Vercel
  - Creates extension release ZIP
  - Deploys Supabase database and functions

### Environment Variables

For local testing, create a `.env` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Daily.co
DAILY_API_KEY=xxx
DAILY_SIGNING_KEY=xxx
```

### Test Coverage

- **Extension tests**: Popup UI, content script, background worker
- **Web tests**: User dashboard, expert dashboard, payment flow
- **API tests**: All endpoints, database operations, edge functions
- **Integration tests**: Full user workflow, payment split calculation

### Assertions

All tests verify:
- Correct status codes
- Expected data structure
- Business logic (10% commission, 1-hour minimum, etc.)
- UI state changes
- Error handling
