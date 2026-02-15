import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resetMocks, setMockSearchParams, mockPush } from '../test-utils';
import ResetPasswordPage from '@/app/reset-password/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ResetPasswordPage', () => {
    beforeEach(() => {
        resetMocks();
        mockFetch.mockReset();
    });

    it('renders the heading', () => {
        setMockSearchParams(new URLSearchParams('token=abc123'));
        render(<ResetPasswordPage />);
        expect(screen.getByText('Set New Password')).toBeInTheDocument();
    });

    it('shows error when no token in query params', () => {
        setMockSearchParams(new URLSearchParams());
        render(<ResetPasswordPage />);
        expect(screen.getByText('Invalid or missing reset token.')).toBeInTheDocument();
    });

    it('renders password form when token is present', () => {
        setMockSearchParams(new URLSearchParams('token=abc123'));
        render(<ResetPasswordPage />);
        expect(screen.getByText('New Password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByText('Reset Password')).toBeInTheDocument();
    });

    it('submits new password and redirects to login', async () => {
        setMockSearchParams(new URLSearchParams('token=abc123'));
        mockFetch.mockResolvedValue({ ok: true });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<ResetPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'newpassword123' },
        });
        fireEvent.click(screen.getByText('Reset Password'));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/reset-password'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ token: 'abc123', new_password: 'newpassword123' }),
                })
            );
        });

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Password updated! Please login.');
            expect(mockPush).toHaveBeenCalledWith('/login');
        });

        alertSpy.mockRestore();
    });

    it('shows alert on failure', async () => {
        setMockSearchParams(new URLSearchParams('token=expired'));
        mockFetch.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ message: 'Token expired' }),
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<ResetPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'newpass' },
        });
        fireEvent.click(screen.getByText('Reset Password'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(
                'Failed to reset password. Token may be invalid or expired.'
            );
        });

        alertSpy.mockRestore();
    });

    it('shows loading state during submission', async () => {
        setMockSearchParams(new URLSearchParams('token=abc123'));
        mockFetch.mockReturnValue(new Promise(() => {}));

        render(<ResetPasswordPage />);

        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'newpass' },
        });
        fireEvent.click(screen.getByText('Reset Password'));

        await waitFor(() => {
            expect(screen.getByText('Updating...')).toBeInTheDocument();
        });
    });
});
