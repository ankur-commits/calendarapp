import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks, mockPush, setMockPathname } from '../test-utils';
import AuthGuard from '@/components/AuthGuard';

describe('AuthGuard', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('redirects to /login when no token in localStorage', async () => {
        mockLocalStorage({});

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/login');
        });
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading spinner while checking auth', () => {
        mockLocalStorage({ token: fakeToken() });
        // Don't resolve the axios call yet
        mockAxios.get.mockReturnValue(new Promise(() => {}));

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        // Should show spinner, not content
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to /onboarding when user has no family_id', async () => {
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockResolvedValue({
            data: { id: 1, email: 'test@example.com', family_id: null }
        });

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/onboarding');
        });
    });

    it('renders children when user is authorized with family', async () => {
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockResolvedValue({
            data: { id: 1, email: 'test@example.com', family_id: 1 }
        });

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        await waitFor(() => {
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    it('redirects to /login on API error', async () => {
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockRejectedValue(new Error('401'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <AuthGuard>
                <div>Protected Content</div>
            </AuthGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/login');
        });
    });

    it('renders children immediately on /onboarding path with token', async () => {
        mockLocalStorage({ token: fakeToken() });
        setMockPathname('/onboarding');

        render(
            <AuthGuard>
                <div>Onboarding Content</div>
            </AuthGuard>
        );

        await waitFor(() => {
            expect(screen.getByText('Onboarding Content')).toBeInTheDocument();
        });
        expect(mockAxios.get).not.toHaveBeenCalled();
    });
});
