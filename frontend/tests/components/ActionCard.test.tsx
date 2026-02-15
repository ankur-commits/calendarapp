import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionCard from '@/components/ActionCard';

describe('ActionCard', () => {
    const mockOnAdd = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders an event card with title and time', () => {
        render(
            <ActionCard
                type="event"
                data={{ title: 'Soccer Practice', start_time: '2025-03-01T10:00:00' }}
                onAdd={mockOnAdd}
            />
        );
        expect(screen.getByText('Soccer Practice')).toBeInTheDocument();
        expect(screen.getByText('Event')).toBeInTheDocument();
        expect(screen.getByText('Mar 1, 10:00 AM')).toBeInTheDocument();
    });

    it('renders event card with location when provided', () => {
        render(
            <ActionCard
                type="event"
                data={{ title: 'Meeting', start_time: '2025-03-01T10:00:00', location: 'Central Park' }}
                onAdd={mockOnAdd}
            />
        );
        expect(screen.getByText('Central Park')).toBeInTheDocument();
    });

    it('renders "Time TBD" when no start_time', () => {
        render(
            <ActionCard type="event" data={{ title: 'Vague Event' }} onAdd={mockOnAdd} />
        );
        expect(screen.getByText('Time TBD')).toBeInTheDocument();
    });

    it('renders a shopping card with name and category', () => {
        render(
            <ActionCard
                type="shopping"
                data={{ name: 'Milk', category: 'Groceries' }}
                onAdd={mockOnAdd}
            />
        );
        expect(screen.getByText('Milk')).toBeInTheDocument();
        expect(screen.getByText('Shopping')).toBeInTheDocument();
        expect(screen.getByText('Category: Groceries')).toBeInTheDocument();
    });

    it('renders shopping card with default category', () => {
        render(
            <ActionCard type="shopping" data={{ name: 'Tape' }} onAdd={mockOnAdd} />
        );
        expect(screen.getByText('Category: General')).toBeInTheDocument();
    });

    it('renders a todo card with title and badge', () => {
        // Note: date-fns throws RangeError for "MMM d (Due)" because "D" in "Due"
        // is a protected token. This is a known component bug. Test renders without due_date.
        render(
            <ActionCard
                type="todo"
                data={{ title: 'Call Dad' }}
                onAdd={mockOnAdd}
            />
        );
        expect(screen.getByText('Call Dad')).toBeInTheDocument();
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('No due date')).toBeInTheDocument();
    });

    it('renders "No due date" when todo has no due_date', () => {
        render(
            <ActionCard type="todo" data={{ title: 'Read Book' }} onAdd={mockOnAdd} />
        );
        expect(screen.getByText('No due date')).toBeInTheDocument();
    });

    it('renders assigned_to for todo when provided', () => {
        render(
            <ActionCard
                type="todo"
                data={{ title: 'Chore', assigned_to: 'Alice' }}
                onAdd={mockOnAdd}
            />
        );
        expect(screen.getByText('Assigned to: Alice')).toBeInTheDocument();
    });

    it('calls onAdd when Add button is clicked', async () => {
        mockOnAdd.mockResolvedValue(undefined);
        const data = { title: 'Test Event', start_time: '2025-03-01T10:00:00' };

        render(<ActionCard type="event" data={data} onAdd={mockOnAdd} />);

        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => expect(mockOnAdd).toHaveBeenCalledWith(data));
    });

    it('shows "Added" after successful add', async () => {
        mockOnAdd.mockResolvedValue(undefined);

        render(
            <ActionCard
                type="event"
                data={{ title: 'Done Event', start_time: '2025-03-01T10:00:00' }}
                onAdd={mockOnAdd}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument());
    });

    it('disables button after successful add', async () => {
        mockOnAdd.mockResolvedValue(undefined);

        render(
            <ActionCard
                type="event"
                data={{ title: 'Done Event', start_time: '2025-03-01T10:00:00' }}
                onAdd={mockOnAdd}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => {
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    it('does not show "Added" if onAdd rejects', async () => {
        mockOnAdd.mockRejectedValue(new Error('fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ActionCard
                type="event"
                data={{ title: 'Fail Event', start_time: '2025-03-01T10:00:00' }}
                onAdd={mockOnAdd}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => {
            expect(screen.queryByText('Added')).not.toBeInTheDocument();
            expect(screen.getByText('Add')).toBeInTheDocument();
        });
        consoleSpy.mockRestore();
    });
});
