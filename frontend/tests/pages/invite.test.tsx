import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, resetMocks, setMockSearchParams, mockPush, mockLocalStorage } from '../test-utils';
import InvitePage from '@/app/invite/page';

describe('InvitePage', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('shows error when no token in URL', () => {
        setMockSearchParams(new URLSearchParams());
        render(<InvitePage />);
        expect(screen.getByText('Invalid invite link.')).toBeInTheDocument();
    });

    it('renders invite form when token is present', () => {
        setMockSearchParams(new URLSearchParams('token=invite-token'));
        render(<InvitePage />);
        expect(screen.getByText("You're Invited!")).toBeInTheDocument();
        expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders Join Family button', () => {
        setMockSearchParams(new URLSearchParams('token=invite-token'));
        render(<InvitePage />);
        // Find the button that contains "Join Family"
        const buttons = screen.getAllByRole('button');
        const joinBtn = buttons.find(b => b.textContent?.includes('Join Family'));
        expect(joinBtn).toBeInTheDocument();
    });

    it('submits invite form and redirects to dashboard', async () => {
        setMockSearchParams(new URLSearchParams('token=invite-token'));
        mockAxios.post.mockResolvedValue({ data: { access_token: 'new-jwt' } });
        const store = mockLocalStorage({});

        render(<InvitePage />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), {
            target: { value: 'Test User' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'password123' },
        });

        const buttons = screen.getAllByRole('button');
        const joinBtn = buttons.find(b => b.textContent?.includes('Join Family'));
        fireEvent.click(joinBtn!);

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/setup-invite?token=invite-token'),
                expect.objectContaining({ name: 'Test User', password: 'password123' })
            );
        });

        await waitFor(() => {
            expect(store['token']).toBe('new-jwt');
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('shows alert on failure', async () => {
        setMockSearchParams(new URLSearchParams('token=bad-token'));
        mockAxios.post.mockRejectedValue(new Error('Invalid token'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<InvitePage />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), {
            target: { value: 'Test' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass' },
        });

        const buttons = screen.getAllByRole('button');
        const joinBtn = buttons.find(b => b.textContent?.includes('Join Family'));
        fireEvent.click(joinBtn!);

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(
                'Failed to accept invite. Token might be invalid or expired.'
            );
        });

        alertSpy.mockRestore();
    });

    it('redirects to login when no access_token in response', async () => {
        setMockSearchParams(new URLSearchParams('token=invite-token'));
        mockAxios.post.mockResolvedValue({ data: {} }); // no access_token
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<InvitePage />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), {
            target: { value: 'Test' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'pass' },
        });

        const buttons = screen.getAllByRole('button');
        const joinBtn = buttons.find(b => b.textContent?.includes('Join Family'));
        fireEvent.click(joinBtn!);

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Setup successful. Please login.');
            expect(mockPush).toHaveBeenCalledWith('/login');
        });

        alertSpy.mockRestore();
    });
});
