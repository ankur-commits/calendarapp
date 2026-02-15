import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import ToDosPage from '@/app/todos/page';

describe('ToDosPage', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockImplementation((url: string) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({ data: { id: 1, family_id: 1 } });
            }
            if (url.includes('/api/todos')) {
                return Promise.resolve({
                    data: [
                        { id: 1, title: 'Buy groceries', status: 'pending', due_date: '2025-03-15T00:00:00Z', assigned_to_user_id: 1 },
                        { id: 2, title: 'Call dentist', status: 'completed', assigned_to_user_id: 2 },
                    ],
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    data: [
                        { id: 1, name: 'Alice' },
                        { id: 2, name: 'Bob' },
                    ],
                });
            }
            return Promise.resolve({ data: [] });
        });
    });

    it('renders the heading', async () => {
        render(<ToDosPage />);
        await waitFor(() => {
            expect(screen.getByText('To Do & Reminders')).toBeInTheDocument();
        });
    });

    it('renders todo items', async () => {
        render(<ToDosPage />);
        await waitFor(() => {
            expect(screen.getByText('Buy groceries')).toBeInTheDocument();
            expect(screen.getByText('Call dentist')).toBeInTheDocument();
        });
    });

    it('renders filter buttons', async () => {
        render(<ToDosPage />);
        await waitFor(() => {
            expect(screen.getByText('All Tasks')).toBeInTheDocument();
            expect(screen.getByText('My Tasks')).toBeInTheDocument();
        });
    });

    it('renders add task form', async () => {
        render(<ToDosPage />);
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
        });
    });

    it('adds a new task', async () => {
        mockAxios.post.mockResolvedValue({
            data: { id: 3, title: 'New task', status: 'pending' },
        });

        render(<ToDosPage />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), {
            target: { value: 'New task' },
        });

        const addBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Add Task'));
        fireEvent.click(addBtn!);

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/todos'),
                expect.objectContaining({ title: 'New task' })
            );
        });
    });

    it('shows assigned user names', async () => {
        render(<ToDosPage />);
        await waitFor(() => {
            // Names appear both in the assign dropdown and in the todo list badges.
            // Check that at least 2 elements contain each name (option + badge).
            const aliceEls = screen.getAllByText('Alice');
            const bobEls = screen.getAllByText('Bob');
            expect(aliceEls.length).toBeGreaterThanOrEqual(2);
            expect(bobEls.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('shows empty state when no tasks', async () => {
        mockAxios.get.mockImplementation((url: string) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({ data: { id: 1, family_id: 1 } });
            }
            if (url.includes('/api/todos')) {
                return Promise.resolve({ data: [] });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({ data: [{ id: 1, name: 'Alice' }] });
            }
            return Promise.resolve({ data: [] });
        });

        render(<ToDosPage />);

        await waitFor(() => {
            expect(screen.getByText('No tasks found.')).toBeInTheDocument();
        });
    });

    it('optimistically toggles todo status', async () => {
        mockAxios.put.mockResolvedValue({ data: {} });

        render(<ToDosPage />);

        await waitFor(() => {
            expect(screen.getByText('Buy groceries')).toBeInTheDocument();
        });

        // The todo item outer div is: <div class="flex items-start p-4 ...">
        // Inside it, the first <button> is the toggle checkbox.
        // Walk up from the title text to find the outer todo item container.
        const titleEl = screen.getByText('Buy groceries');
        const todoItem = titleEl.closest('div[class*="items-start"]');
        const toggleBtn = todoItem?.querySelector('button');
        expect(toggleBtn).toBeTruthy();
        fireEvent.click(toggleBtn!);

        await waitFor(() => {
            expect(mockAxios.put).toHaveBeenCalledWith(
                expect.stringContaining('/api/todos/1'),
                { status: 'completed' }
            );
        });
    });
});
