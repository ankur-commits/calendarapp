import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineView from '@/components/TimelineView';

const mockEvents = [
    {
        id: 1,
        title: 'Morning Meeting',
        start_time: '2025-03-01T09:00:00Z',
        end_time: '2025-03-01T10:00:00Z',
        location: 'Office',
        category: 'Work',
    },
    {
        id: 2,
        title: 'Lunch',
        start_time: '2025-03-01T12:00:00Z',
        end_time: '2025-03-01T13:00:00Z',
        location: 'Cafe',
        commute_time_minutes: 15,
    },
    {
        id: 3,
        title: 'Early Standup',
        start_time: '2025-03-01T08:00:00Z',
        end_time: '2025-03-01T08:30:00Z',
    },
];

describe('TimelineView', () => {
    const mockOnSelectEvent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the heading', () => {
        render(<TimelineView events={[]} onSelectEvent={mockOnSelectEvent} />);
        expect(screen.getByText('Timeline (Logistics View)')).toBeInTheDocument();
    });

    it('shows empty state when no events', () => {
        render(<TimelineView events={[]} onSelectEvent={mockOnSelectEvent} />);
        expect(screen.getByText('No events for today.')).toBeInTheDocument();
    });

    it('renders events sorted by start time', () => {
        render(<TimelineView events={mockEvents} onSelectEvent={mockOnSelectEvent} />);

        const titles = screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent);
        expect(titles).toEqual(['Early Standup', 'Morning Meeting', 'Lunch']);
    });

    it('displays event title and location', () => {
        render(<TimelineView events={mockEvents} onSelectEvent={mockOnSelectEvent} />);
        expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
        expect(screen.getByText('Office')).toBeInTheDocument();
    });

    it('displays commute time when present', () => {
        render(<TimelineView events={mockEvents} onSelectEvent={mockOnSelectEvent} />);
        expect(screen.getByText(/15 min drive/)).toBeInTheDocument();
    });

    it('displays category badge when present', () => {
        render(<TimelineView events={mockEvents} onSelectEvent={mockOnSelectEvent} />);
        expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('calls onSelectEvent when clicking an event', () => {
        render(<TimelineView events={mockEvents} onSelectEvent={mockOnSelectEvent} />);
        fireEvent.click(screen.getByText('Morning Meeting'));
        expect(mockOnSelectEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 1, title: 'Morning Meeting' }));
    });

    it('displays driver info when present', () => {
        const eventsWithDriver = [
            {
                id: 4,
                title: 'School Drop Off',
                start_time: '2025-03-01T07:00:00Z',
                end_time: '2025-03-01T07:30:00Z',
                driver: { id: 1, name: 'Mom' },
                attendees: [{ id: 2, name: 'Kid' }],
            },
        ];
        render(<TimelineView events={eventsWithDriver} onSelectEvent={mockOnSelectEvent} />);
        expect(screen.getByText(/Driver: Mom/)).toBeInTheDocument();
        expect(screen.getByText('K')).toBeInTheDocument(); // attendee initial
    });
});
