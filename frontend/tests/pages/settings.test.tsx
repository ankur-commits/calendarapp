import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import SettingsPage from '@/app/settings/page';

describe('SettingsPage', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockImplementation((url: string) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({ data: { id: 1, family_id: 1 } });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    data: [
                        {
                            id: 1,
                            name: 'Alice',
                            email: 'alice@test.com',
                            role: 'admin',
                            phone_number: '555-0100',
                            preferences: {
                                interests: ['Hiking'],
                                address: '123 Main St',
                            },
                        },
                        {
                            id: 2,
                            name: 'Bob',
                            email: 'bob@test.com',
                            role: 'member',
                            preferences: {},
                        },
                    ],
                });
            }
            return Promise.resolve({ data: [] });
        });
    });

    it('renders the settings heading', async () => {
        render(<SettingsPage />);
        await waitFor(() => {
            expect(screen.getByText('Settings & Preferences')).toBeInTheDocument();
        });
    });

    it('shows Family Members section', async () => {
        render(<SettingsPage />);
        await waitFor(() => {
            expect(screen.getByText('Family Members')).toBeInTheDocument();
        });
    });

    it('lists family members', async () => {
        render(<SettingsPage />);
        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });
    });

    it('shows default message when no user is selected', async () => {
        render(<SettingsPage />);
        await waitFor(() => {
            expect(screen.getByText(/Select a family member/)).toBeInTheDocument();
        });
    });

    it('opens edit form when clicking a user', async () => {
        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice'));

        await waitFor(() => {
            expect(screen.getByText('Edit Profile: Alice')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
            expect(screen.getByDisplayValue('alice@test.com')).toBeInTheDocument();
        });
    });

    it('shows invite form when + button is clicked', async () => {
        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText('Family Members')).toBeInTheDocument();
        });

        // The + button is next to "Family Members" heading, inside the same container
        const familySection = screen.getByText('Family Members').closest('div');
        const addBtn = familySection?.querySelector('button');
        if (addBtn) fireEvent.click(addBtn);

        await waitFor(() => {
            expect(screen.getByText('Invite New Member')).toBeInTheDocument();
        });
    });

    it('saves user profile on Save Profile click', async () => {
        mockAxios.put.mockResolvedValue({ data: {} });

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice'));

        await waitFor(() => {
            expect(screen.getByText('Save Profile')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Save Profile'));

        await waitFor(() => {
            expect(mockAxios.put).toHaveBeenCalledWith(
                expect.stringContaining('/api/users/1'),
                expect.objectContaining({ name: 'Alice' }),
                expect.objectContaining({ headers: expect.any(Object) })
            );
        });
    });

    it('shows cancel button that closes edit form', async () => {
        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice'));

        await waitFor(() => {
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Cancel'));

        await waitFor(() => {
            expect(screen.getByText(/Select a family member/)).toBeInTheDocument();
        });
    });
});
