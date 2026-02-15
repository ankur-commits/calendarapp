import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock react-big-calendar to avoid complex DOM rendering
vi.mock('react-big-calendar', () => {
    const Views = { MONTH: 'month', WEEK: 'week', DAY: 'day' };
    return {
        Calendar: ({ events, view, resources, onSelectSlot, onSelectEvent, eventPropGetter }: any) => (
            <div data-testid="mock-calendar">
                <div data-testid="calendar-view">{view}</div>
                <div data-testid="calendar-events">{events?.length ?? 0} events</div>
                {resources && <div data-testid="calendar-resources">{resources.length} resources</div>}
                {events?.map((evt: any, i: number) => (
                    <div
                        key={i}
                        data-testid={`event-${i}`}
                        onClick={() => onSelectEvent?.(evt)}
                    >
                        {evt.title}
                    </div>
                ))}
                <button
                    data-testid="select-slot"
                    onClick={() => onSelectSlot?.({ start: new Date(), end: new Date() })}
                >
                    Select Slot
                </button>
            </div>
        ),
        dateFnsLocalizer: () => ({}),
        Views,
    };
});

import CalendarView from '@/components/CalendarView';

describe('CalendarView', () => {
    const mockOnSelectSlot = vi.fn();
    const mockOnSelectEvent = vi.fn();

    const baseEvents = [
        {
            id: '1',
            title: 'Test Event',
            start_time: '2025-03-01T10:00:00Z',
            end_time: '2025-03-01T11:00:00Z',
            category: 'Work',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.innerWidth for desktop
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    });

    it('renders the calendar component', () => {
        render(
            <CalendarView
                events={baseEvents}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
    });

    it('passes events to calendar', () => {
        render(
            <CalendarView
                events={baseEvents}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.getByTestId('calendar-events')).toHaveTextContent('1 events');
    });

    it('defaults to month view on desktop', () => {
        render(
            <CalendarView
                events={baseEvents}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.getByTestId('calendar-view')).toHaveTextContent('month');
    });

    it('switches to day view in family mode', () => {
        render(
            <CalendarView
                events={baseEvents}
                users={[{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]}
                isFamilyView={true}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.getByTestId('calendar-view')).toHaveTextContent('day');
    });

    it('provides resources in family view', () => {
        render(
            <CalendarView
                events={baseEvents}
                users={[{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]}
                isFamilyView={true}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.getByTestId('calendar-resources')).toHaveTextContent('2 resources');
    });

    it('does not provide resources in non-family view', () => {
        render(
            <CalendarView
                events={baseEvents}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.queryByTestId('calendar-resources')).not.toBeInTheDocument();
    });

    it('handles multiple events', () => {
        const events = [
            { id: '1', title: 'Event 1', start_time: '2025-03-01T10:00:00Z', end_time: '2025-03-01T11:00:00Z' },
            { id: '2', title: 'Event 2', start_time: '2025-03-01T14:00:00Z', end_time: '2025-03-01T15:00:00Z' },
        ];
        render(
            <CalendarView
                events={events}
                onSelectSlot={mockOnSelectSlot}
                onSelectEvent={mockOnSelectEvent}
            />
        );
        expect(screen.getByTestId('calendar-events')).toHaveTextContent('2 events');
    });
});
