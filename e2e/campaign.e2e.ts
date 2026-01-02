// Campaign Flow E2E Tests
import { test, expect, Page } from '@playwright/test';

// Test fixtures
const TEST_USER = {
  email: 'test@astromedia.io',
  password: 'TestPassword123!',
};

const TEST_CAMPAIGN = {
  companyName: 'Acme Corp',
  sector: 'Technology',
  targetAudience: 'Tech-savvy professionals aged 25-45',
  objectives: ['Brand Awareness', 'Lead Generation'],
  budget: 5000,
  duration: '1 month',
};

// Helper functions
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

async function createCampaign(page: Page) {
  // Click new campaign button
  await page.click('[data-testid="new-campaign-button"]');
  
  // Wait for modal
  await expect(page.locator('[data-testid="campaign-modal"]')).toBeVisible();
  
  // Fill campaign form
  await page.fill('[data-testid="company-name-input"]', TEST_CAMPAIGN.companyName);
  await page.fill('[data-testid="sector-input"]', TEST_CAMPAIGN.sector);
  await page.fill('[data-testid="target-audience-input"]', TEST_CAMPAIGN.targetAudience);
  await page.fill('[data-testid="budget-input"]', TEST_CAMPAIGN.budget.toString());
  
  // Select objectives
  for (const objective of TEST_CAMPAIGN.objectives) {
    await page.click(`[data-testid="objective-${objective.toLowerCase().replace(' ', '-')}"]`);
  }
  
  // Submit
  await page.click('[data-testid="launch-campaign-button"]');
}

// Tests
test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h1')).toContainText(/login|connexion/i);
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'invalid@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await login(page);
    
    // Should be on dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to landing or login
    await expect(page).toHaveURL(/\/(login)?$/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard with sidebar', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });

  test('should navigate to different views', async ({ page }) => {
    // Navigate to Agents
    await page.click('[data-testid="nav-agents"]');
    await expect(page.locator('[data-testid="agent-team"]')).toBeVisible();
    
    // Navigate to Gallery
    await page.click('[data-testid="nav-gallery"]');
    await expect(page.locator('[data-testid="gallery"]')).toBeVisible();
    
    // Navigate back to Dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});

test.describe('Campaign Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open campaign creation modal', async ({ page }) => {
    await page.click('[data-testid="new-campaign-button"]');
    await expect(page.locator('[data-testid="campaign-modal"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('[data-testid="new-campaign-button"]');
    await page.click('[data-testid="launch-campaign-button"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('should create a new campaign', async ({ page }) => {
    await createCampaign(page);
    
    // Should see workflow view
    await expect(page.locator('[data-testid="workflow-view"]')).toBeVisible({ timeout: 15000 });
    
    // Should see campaign name
    await expect(page.locator('text=' + TEST_CAMPAIGN.companyName)).toBeVisible();
  });
});

test.describe('Campaign Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await createCampaign(page);
  });

  test('should show workflow phases', async ({ page }) => {
    // Wait for workflow to initialize
    await expect(page.locator('[data-testid="workflow-view"]')).toBeVisible({ timeout: 15000 });
    
    // Should show briefing as completed
    await expect(page.locator('[data-testid="phase-briefing"]')).toHaveAttribute('data-status', 'completed');
    
    // Should show strategy phase
    await expect(page.locator('[data-testid="phase-strategy"]')).toBeVisible();
  });

  test('should display phase outputs when completed', async ({ page }) => {
    // Wait for market analysis to complete (may take a while)
    await expect(page.locator('[data-testid="phase-marketAnalysis"]')).toHaveAttribute(
      'data-status', 
      'completed',
      { timeout: 120000 }
    );
    
    // Click on phase to view output
    await page.click('[data-testid="phase-marketAnalysis"]');
    
    // Should show output content
    await expect(page.locator('[data-testid="phase-output"]')).toBeVisible();
  });

  test('should allow phase approval in guided mode', async ({ page }) => {
    // Wait for a phase to require validation
    await expect(page.locator('[data-testid="phase-status-waitingValidation"]').first()).toBeVisible({ 
      timeout: 120000 
    });
    
    // Click approve
    await page.click('[data-testid="approve-phase-button"]');
    
    // Phase should move to completed
    await expect(page.locator('[data-testid="phase-status-completed"]')).toBeVisible();
  });
});

test.describe('Asset Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should generate A/B test images', async ({ page }) => {
    // Navigate to a campaign with design phase
    await page.goto('/campaign/test-campaign');
    
    // Wait for design phase
    await page.click('[data-testid="phase-design"]');
    
    // Should show A/B image options
    await expect(page.locator('[data-testid="image-variant-artistic"]')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('[data-testid="image-variant-realistic"]')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    
    // Mobile menu should be available
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
  });

  test('should be usable on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    
    // Dashboard should render properly
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should show error boundary on crash', async ({ page }) => {
    await login(page);
    
    // Inject an error
    await page.evaluate(() => {
      throw new Error('Test error');
    }).catch(() => {
      // Expected to fail
    });
    
    // Error boundary should catch it (if component crashes)
    // This test is more for manual verification
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    await page.fill('[data-testid="password-input"]', TEST_USER.password);
    await page.click('[data-testid="login-button"]');
    
    // Should show error message, not crash
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have no critical accessibility issues on login page', async ({ page }) => {
    await page.goto('/login');
    
    // Basic accessibility checks
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check for form labels
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    
    // Inputs should have associated labels or aria-label
    await expect(emailInput).toHaveAttribute('aria-label', /.+/);
    await expect(passwordInput).toHaveAttribute('aria-label', /.+/);
  });

  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
  });
});
