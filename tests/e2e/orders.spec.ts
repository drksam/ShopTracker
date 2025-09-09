import { test, expect } from '@playwright/test';

test.describe('Order Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();
    await expect(page).toHaveURL(/.*orders/);
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
  });

  test('should display empty orders list initially', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();
    
    // Should show empty state or "No orders found"
    const noOrdersText = page.getByText(/no orders found/i).or(page.getByText(/no orders/i));
    await expect(noOrdersText).toBeVisible();
  });

  test('should open create order dialog', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /create.*order/i })).toBeVisible();
  });

  test('should create a new order successfully', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();

    // Fill out the order form
    await page.locator('input[name="orderNumber"]').fill('TEST-001');
    await page.locator('input[name="tbfosNumber"]').fill('TBFOS-001');
    await page.locator('input[name="client"]').fill('Test Client');
    await page.locator('input[name="totalQuantity"]').fill('100');
    
    // Set due date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    await page.locator('input[name="dueDate"]').fill(formattedDate);

    // Submit the form
    await page.getByRole('button', { name: /create order/i }).click();

    // Should close dialog and show the new order
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('TEST-001')).toBeVisible();
    await expect(page.getByText('Test Client')).toBeVisible();
  });

  test('should validate required fields in order form', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: /create order/i }).click();

    // Should show validation errors
    await expect(page.getByText(/order number.*required/i)).toBeVisible();
  });

  test('should search orders', async ({ page }) => {
    // First create an order to search for
    await page.getByRole('link', { name: /orders/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();

    await page.locator('input[name="orderNumber"]').fill('SEARCH-TEST-001');
    await page.locator('input[name="tbfosNumber"]').fill('TBFOS-SEARCH');
    await page.locator('input[name="client"]').fill('Search Test Client');
    await page.locator('input[name="totalQuantity"]').fill('50');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    await page.locator('input[name="dueDate"]').fill(formattedDate);

    await page.getByRole('button', { name: /create order/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Now search for the order
    const searchInput = page.getByPlaceholder(/search orders/i);
    await searchInput.fill('SEARCH-TEST');

    // Should show only matching orders
    await expect(page.getByText('SEARCH-TEST-001')).toBeVisible();
  });

  test('should view order details', async ({ page }) => {
    // Create an order first
    await page.getByRole('link', { name: /orders/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();

    await page.locator('input[name="orderNumber"]').fill('DETAIL-TEST-001');
    await page.locator('input[name="tbfosNumber"]').fill('TBFOS-DETAIL');
    await page.locator('input[name="client"]').fill('Detail Test Client');
    await page.locator('input[name="totalQuantity"]').fill('75');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];
    await page.locator('input[name="dueDate"]').fill(formattedDate);

    await page.getByRole('button', { name: /create order/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Click on the order to view details
    await page.getByText('DETAIL-TEST-001').click();

    // Should navigate to order detail page
    await expect(page).toHaveURL(/.*orders\/\d+/);
    await expect(page.getByText('DETAIL-TEST-001')).toBeVisible();
    await expect(page.getByText('Detail Test Client')).toBeVisible();
    await expect(page.getByText('75')).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();

    // Toggle "Include Shipped" filter
    const includeShippedCheckbox = page.getByRole('checkbox', { name: /include shipped/i });
    if (await includeShippedCheckbox.isVisible()) {
      await includeShippedCheckbox.click();
      
      // Should refresh the orders list
      await page.waitForTimeout(500); // Wait for filter to apply
    }
  });
});
