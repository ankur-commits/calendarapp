import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { resetMocks, mockPush } from '../test-utils';
import SignupPage from '@/app/signup/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SignupPage', () => {
    beforeEach(() => {
        resetMocks();
        mockFetch.mockReset();
    });

    it('renders the registration form', () => {
        render(<SignupPage />);
        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByText('Join your family calendar')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
        render(<SignupPage />);
        expect(screen.getByPlaceholderText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('+1 (555) 000-0000')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders sign up button', () => {
        render(<SignupPage />);
        expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('renders login link', () => {
        render(<SignupPage />);
        expect(screen.getByText('Log in')).toHaveAttribute('href', '/login');
    });

    it('submits form and redirects to login on success', async () => {
        mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<SignupPage />);

        fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
            target: { value: 'Test User' },
        });
        fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
            target: { value: 'test@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' },
        });

        fireEvent.click(screen.getByText('Sign Up'));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/register'),
                expect.objectContaining({ method: 'POST' })
            );
        });

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Registration successful! Please sign in.');
            expect(mockPush).toHaveBeenCalledWith('/login');
        });

        alertSpy.mockRestore();
    });

    it('shows loading state during submission', async () => {
        mockFetch.mockReturnValue(new Promise(() => {}));

        render(<SignupPage />);

        fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
            target: { value: 'Test' },
        });
        fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
            target: { value: 'test@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass' },
        });

        fireEvent.click(screen.getByText('Sign Up'));

        await waitFor(() => {
            expect(screen.getByText('Creating Account...')).toBeInTheDocument();
        });
    });

    it('shows alert on registration failure', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ detail: 'Email already registered' }),
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<SignupPage />);

        fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
            target: { value: 'Test' },
        });
        fireEvent.change(screen.getByPlaceholderText('jane@example.com'), {
            target: { value: 'taken@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass' },
        });

        fireEvent.click(screen.getByText('Sign Up'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalled();
        });

        alertSpy.mockRestore();
    });
});
