import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { mockAxios, resetMocks } from '../test-utils';
import Analytics from '@/components/Analytics';

// Mock fetch for the analytics endpoint
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Analytics', () => {
    beforeEach(() => {
        resetMocks();
        mockFetch.mockReset();
    });

    it('shows message when fewer than 2 users', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        mockAxios.get.mockResolvedValue({ data: [{ id: 1, name: 'Alice' }] });

        render(<Analytics />);

        await waitFor(() => {
            expect(screen.getByText('Add more family members to see insights.')).toBeInTheDocument();
        });
    });

    it('renders matrix table with 2+ users', async () => {
        const events = [
            {
                id: 1,
                title: 'Dinner',
                start_time: '2025-03-01T18:00:00Z',
                end_time: '2025-03-01T20:00:00Z',
                attendees: [
                    { id: 1, name: 'Alice' },
                    { id: 2, name: 'Bob' },
                ],
            },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(events),
        });
        mockAxios.get.mockResolvedValue({
            data: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ],
        });

        render(<Analytics />);

        await waitFor(() => {
            expect(screen.getByText('Time Together')).toBeInTheDocument();
            // Column headers
            expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
        });
    });

    it('displays total events count', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
        });
        mockAxios.get.mockResolvedValue({
            data: [{ id: 1, name: 'Alice' }],
        });

        render(<Analytics />);

        await waitFor(() => {
            expect(screen.getByText('Total Events: 3')).toBeInTheDocument();
        });
    });

    it('shows diagonal dash for same-user cells', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        mockAxios.get.mockResolvedValue({
            data: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ],
        });

        render(<Analytics />);

        await waitFor(() => {
            const dashes = screen.getAllByText('-');
            expect(dashes.length).toBe(2); // one for each user diagonal
        });
    });
});
