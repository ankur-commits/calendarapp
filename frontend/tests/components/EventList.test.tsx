import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EventList from '@/components/EventList';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('EventList', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('shows loading state initially', () => {
        mockFetch.mockReturnValue(new Promise(() => {}));
        render(<EventList />);
        expect(screen.getByText('Loading events...')).toBeInTheDocument();
    });

    it('shows error message on fetch failure', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<EventList />);

        await waitFor(() => {
            expect(screen.getByText('Failed to fetch events')).toBeInTheDocument();
        });
    });

    it('shows empty state when no events', async () => {
        mockFetch.mockResolvedValue({
            json: () => Promise.resolve([]),
        });

        render(<EventList />);

        await waitFor(() => {
            expect(screen.getByText('No events found.')).toBeInTheDocument();
        });
    });

    it('renders events with title and category', async () => {
        mockFetch.mockResolvedValue({
            json: () =>
                Promise.resolve([
                    {
                        id: 1,
                        title: 'Team Standup',
                        description: 'Daily standup meeting',
                        location: 'Zoom',
                        start_time: '2025-03-01T09:00:00Z',
                        end_time: '2025-03-01T09:30:00Z',
                        category: 'Work',
                    },
                ]),
        });

        render(<EventList />);

        await waitFor(() => {
            expect(screen.getByText('Team Standup')).toBeInTheDocument();
            expect(screen.getByText('Work')).toBeInTheDocument();
            expect(screen.getByText('Zoom')).toBeInTheDocument();
        });
    });

    it('renders heading "Upcoming Events"', async () => {
        mockFetch.mockResolvedValue({
            json: () => Promise.resolve([]),
        });

        render(<EventList />);

        await waitFor(() => {
            expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
        });
    });

    it('renders description when present', async () => {
        mockFetch.mockResolvedValue({
            json: () =>
                Promise.resolve([
                    {
                        id: 1,
                        title: 'Lunch',
                        description: 'With the team',
                        start_time: '2025-03-01T12:00:00Z',
                        end_time: '2025-03-01T13:00:00Z',
                        category: 'General',
                        location: '',
                    },
                ]),
        });

        render(<EventList />);

        await waitFor(() => {
            expect(screen.getByText('With the team')).toBeInTheDocument();
        });
    });
});
