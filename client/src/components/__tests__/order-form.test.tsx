import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrderForm from '../orders/order-form';

// Mock fetch
global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('OrderForm Component', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('renders order form with all required fields', () => {
    render(
      <OrderForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/order number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tbfos number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total quantity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create order/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <OrderForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    const submitButton = screen.getByRole('button', { name: /create order/i });
    await user.click(submitButton);

    // Should show validation errors for required fields
    await waitFor(() => {
      expect(screen.getByText(/order number is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        orderNumber: 'TEST-001',
        tbfosNumber: 'TBFOS-001',
        client: 'Test Client',
        totalQuantity: 100,
      }),
    });

    render(
      <OrderForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Fill out the form
    await user.type(screen.getByLabelText(/order number/i), 'TEST-001');
    await user.type(screen.getByLabelText(/tbfos number/i), 'TBFOS-001');
    await user.type(screen.getByLabelText(/client/i), 'Test Client');
    await user.type(screen.getByLabelText(/total quantity/i), '100');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create order/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('TEST-001'),
      }));
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock API error
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Order number already exists' }),
    });

    render(
      <OrderForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Fill out the form
    await user.type(screen.getByLabelText(/order number/i), 'DUPLICATE-001');
    await user.type(screen.getByLabelText(/tbfos number/i), 'TBFOS-001');
    await user.type(screen.getByLabelText(/client/i), 'Test Client');
    await user.type(screen.getByLabelText(/total quantity/i), '100');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create order/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/order number already exists/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <OrderForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    
    // Mock slow API response
    (fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ id: 1, orderNumber: 'TEST-001' }),
      }), 1000))
    );

    render(
      <OrderForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: createWrapper() }
    );

    // Fill out the form
    await user.type(screen.getByLabelText(/order number/i), 'TEST-001');
    await user.type(screen.getByLabelText(/tbfos number/i), 'TBFOS-001');
    await user.type(screen.getByLabelText(/client/i), 'Test Client');
    await user.type(screen.getByLabelText(/total quantity/i), '100');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create order/i });
    await user.click(submitButton);

    // Button should be disabled while submitting
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/creating.../i)).toBeInTheDocument();
  });
});
