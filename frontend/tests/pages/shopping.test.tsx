import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import ShoppingPage from '@/app/shopping/page';

describe('ShoppingPage', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        // AuthGuard mock — resolve user with family
        mockAxios.get.mockImplementation((url: string) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({ data: { id: 1, family_id: 1 } });
            }
            if (url.includes('/api/shopping')) {
                return Promise.resolve({
                    data: [
                        { id: 1, name: 'Milk', category: 'Groceries', is_bought: false },
                        { id: 2, name: 'Soap', category: 'Household', is_bought: true },
                    ],
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: [] });
        });
    });

    it('renders the shopping list heading', async () => {
        render(<ShoppingPage />);
        await waitFor(() => {
            // Use heading role since sidebar also contains "Shopping List" link
            expect(screen.getByRole('heading', { name: 'Shopping List' })).toBeInTheDocument();
        });
    });

    it('renders shopping items', async () => {
        render(<ShoppingPage />);
        await waitFor(() => {
            expect(screen.getByText('Milk')).toBeInTheDocument();
            expect(screen.getByText('Soap')).toBeInTheDocument();
        });
    });

    it('renders add item form', async () => {
        render(<ShoppingPage />);
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Add item...')).toBeInTheDocument();
        });
    });

    it('adds a new item', async () => {
        mockAxios.post.mockImplementation((url: string) => {
            if (url.includes('/api/shopping') && !url.includes('toggle')) {
                return Promise.resolve({ data: { id: 3, name: 'Bread', category: 'General', is_bought: false } });
            }
            return Promise.resolve({ data: {} });
        });

        render(<ShoppingPage />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Add item...')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText('Add item...'), {
            target: { value: 'Bread' },
        });

        // Click Add button
        const addBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Add'));
        fireEvent.click(addBtn!);

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/shopping'),
                expect.objectContaining({ name: 'Bread' })
            );
        });
    });

    it('shows category selector', async () => {
        render(<ShoppingPage />);
        await waitFor(() => {
            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();
            const options = select.querySelectorAll('option');
            const values = Array.from(options).map(o => o.textContent);
            expect(values).toEqual(['General', 'Groceries', 'Household', 'Pharmacy', 'Kids']);
        });
    });

    it('shows empty state when no items', async () => {
        mockAxios.get.mockImplementation((url: string) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({ data: { id: 1, family_id: 1 } });
            }
            if (url.includes('/api/shopping')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: [] });
        });

        render(<ShoppingPage />);

        await waitFor(() => {
            expect(screen.getByText('Your list is empty.')).toBeInTheDocument();
        });
    });
});
