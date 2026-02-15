import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resetMocks } from '../test-utils';
import ForgotPasswordPage from '@/app/forgot-password/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ForgotPasswordPage', () => {
    beforeEach(() => {
        resetMocks();
        mockFetch.mockReset();
    });

    it('renders the form', () => {
        render(<ForgotPasswordPage />);
        expect(screen.getByText('Reset Password')).toBeInTheDocument();
        expect(screen.getByText('Enter your email to receive a reset link.')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
        expect(screen.getByText('Send Reset Link')).toBeInTheDocument();
    });

    it('renders cancel link back to login', () => {
        render(<ForgotPasswordPage />);
        expect(screen.getByText('Cancel')).toHaveAttribute('href', '/login');
    });

    it('submits email and shows success message', async () => {
        mockFetch.mockResolvedValue({ ok: true });

        render(<ForgotPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.click(screen.getByText('Send Reset Link'));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/forgot-password'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'user@test.com' }),
                })
            );
        });

        await waitFor(() => {
            expect(screen.getByText(/Check your email/)).toBeInTheDocument();
        });
    });

    it('shows success message even on fetch error (prevents enumeration)', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<ForgotPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.click(screen.getByText('Send Reset Link'));

        await waitFor(() => {
            expect(screen.getByText(/Check your email/)).toBeInTheDocument();
        });
    });

    it('shows "Back to Login" link after success', async () => {
        mockFetch.mockResolvedValue({ ok: true });

        render(<ForgotPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.click(screen.getByText('Send Reset Link'));

        await waitFor(() => {
            expect(screen.getByText('Back to Login')).toHaveAttribute('href', '/login');
        });
    });

    it('shows loading state during submission', async () => {
        mockFetch.mockReturnValue(new Promise(() => {}));

        render(<ForgotPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.click(screen.getByText('Send Reset Link'));

        await waitFor(() => {
            expect(screen.getByText('Sending...')).toBeInTheDocument();
        });
    });
});
