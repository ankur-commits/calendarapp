import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, resetMocks, mockPush, mockLocalStorage } from '../test-utils';
import LoginPage from '@/app/login/page';

describe('LoginPage', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({});
    });

    it('renders the login form', () => {
        render(<LoginPage />);
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByText('Sign in to your family calendar')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });

    it('renders email and password inputs', () => {
        render(<LoginPage />);
        expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders sign in button', () => {
        render(<LoginPage />);
        expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('renders sign up and forgot password links', () => {
        render(<LoginPage />);
        expect(screen.getByText('Sign up')).toHaveAttribute('href', '/signup');
        expect(screen.getByText('Forgot Password?')).toHaveAttribute('href', '/forgot-password');
    });

    it('submits credentials and redirects on success', async () => {
        mockAxios.post.mockResolvedValue({ data: { access_token: 'test-jwt' } });
        const store = mockLocalStorage({});

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByText('Sign In'));

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/token'),
                expect.any(URLSearchParams)
            );
        });

        await waitFor(() => {
            expect(store['token']).toBe('test-jwt');
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('shows loading text during submission', async () => {
        mockAxios.post.mockReturnValue(new Promise(() => {}));
        mockLocalStorage({});

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass' },
        });
        fireEvent.click(screen.getByText('Sign In'));

        await waitFor(() => {
            expect(screen.getByText('Signing in...')).toBeInTheDocument();
        });
    });

    it('shows alert on login failure', async () => {
        mockAxios.post.mockRejectedValue(new Error('Invalid credentials'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        mockLocalStorage({});

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'bad@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'wrong' },
        });
        fireEvent.click(screen.getByText('Sign In'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Login failed. Check your credentials.');
        });

        alertSpy.mockRestore();
    });
});
