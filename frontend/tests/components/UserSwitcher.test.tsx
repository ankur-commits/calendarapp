import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import UserSwitcher from '@/components/UserSwitcher';

describe('UserSwitcher', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken('alice@test.com') });
        mockAxios.get.mockResolvedValue({
            data: [
                { id: 1, name: 'Alice', email: 'alice@test.com' },
                { id: 2, name: 'Bob', email: 'bob@test.com' },
            ],
        });
    });

    it('renders the switcher button', async () => {
        render(<UserSwitcher />);
        // Button should show username extracted from token (email prefix)
        await waitFor(() => {
            expect(screen.getByTitle('Dev Tool: Switch User')).toBeInTheDocument();
        });
    });

    it('shows current user email prefix from token', () => {
        render(<UserSwitcher />);
        expect(screen.getByText('alice')).toBeInTheDocument();
    });

    it('shows "Switch User" when no token', () => {
        mockLocalStorage({});
        render(<UserSwitcher />);
        expect(screen.getByText('Switch User')).toBeInTheDocument();
    });

    it('toggles dropdown when button is clicked', async () => {
        render(<UserSwitcher />);

        // Initially no dropdown
        expect(screen.queryByText('Switch Profile (Dev)')).not.toBeInTheDocument();

        // Click to open
        fireEvent.click(screen.getByTitle('Dev Tool: Switch User'));
        expect(screen.getByText('Switch Profile (Dev)')).toBeInTheDocument();
    });

    it('fetches and displays users in dropdown', async () => {
        render(<UserSwitcher />);
        fireEvent.click(screen.getByTitle('Dev Tool: Switch User'));

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });
    });

    it('switches user on click (calls dev-login)', async () => {
        mockAxios.post.mockResolvedValue({ data: { access_token: 'new-token' } });
        // Mock window.location.reload
        const reloadMock = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { ...window.location, reload: reloadMock },
            writable: true,
        });

        render(<UserSwitcher />);
        fireEvent.click(screen.getByTitle('Dev Tool: Switch User'));

        await waitFor(() => {
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Bob'));

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/dev-login'),
                { email: 'bob@test.com' }
            );
        });
    });

    it('shows logout button in dropdown', () => {
        render(<UserSwitcher />);
        fireEvent.click(screen.getByTitle('Dev Tool: Switch User'));
        expect(screen.getByText('Log Out')).toBeInTheDocument();
    });

    it('highlights current user in dropdown', async () => {
        render(<UserSwitcher />);
        fireEvent.click(screen.getByTitle('Dev Tool: Switch User'));

        await waitFor(() => {
            const aliceBtn = screen.getByText('Alice').closest('button');
            expect(aliceBtn?.className).toContain('bg-blue-50');
        });
    });
});
