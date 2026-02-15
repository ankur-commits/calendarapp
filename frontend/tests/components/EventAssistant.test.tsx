import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, resetMocks } from '../test-utils';
import EventAssistant from '@/components/EventAssistant';

describe('EventAssistant', () => {
    const mockOnAddEvent = vi.fn();

    beforeEach(() => {
        resetMocks();
    });

    it('renders the AI Assistant header', () => {
        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });

    it('renders the textarea input', () => {
        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument();
    });

    it('shows initial guidance text when no search has been made', () => {
        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        expect(screen.getByText(/Suggest events/)).toBeInTheDocument();
    });

    it('submit button is disabled when input is empty', () => {
        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons.find(b => !b.textContent?.includes('Start Over'));
        expect(submitBtn).toBeDisabled();
    });

    it('submits query to API and renders event ActionCards', async () => {
        mockAxios.post.mockResolvedValue({
            data: {
                events: [{ title: 'Soccer Practice', start_time: '2025-03-01T10:00:00' }],
                shopping_list: [],
                todos: [],
            }
        });

        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        const textarea = screen.getByPlaceholderText('Type something...');
        fireEvent.change(textarea, { target: { value: 'Soccer practice Tuesday' } });

        // Click submit
        const buttons = screen.getAllByRole('button');
        const submitBtn = buttons[buttons.length - 1];
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/assistant/interact'),
                expect.objectContaining({ query: 'Soccer practice Tuesday' })
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Soccer Practice')).toBeInTheDocument();
            expect(screen.getByText('Event')).toBeInTheDocument();
        });
    });

    it('shows shopping and todo cards from mixed response', async () => {
        mockAxios.post.mockResolvedValue({
            data: {
                events: [],
                shopping_list: [{ name: 'Milk', category: 'Groceries' }],
                todos: [{ title: 'Call Dad' }],
            }
        });

        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        fireEvent.change(screen.getByPlaceholderText('Type something...'), {
            target: { value: 'Buy milk and remind me to call Dad' }
        });
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[buttons.length - 1]);

        await waitFor(() => {
            expect(screen.getByText('Milk')).toBeInTheDocument();
            expect(screen.getByText('Shopping')).toBeInTheDocument();
            expect(screen.getByText('Call Dad')).toBeInTheDocument();
            expect(screen.getByText('To Do')).toBeInTheDocument();
        });
    });

    it('shows "No suggestions found" for empty response', async () => {
        mockAxios.post.mockResolvedValue({
            data: { events: [], shopping_list: [], todos: [] }
        });

        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        fireEvent.change(screen.getByPlaceholderText('Type something...'), {
            target: { value: 'asdfghjkl' }
        });
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[buttons.length - 1]);

        await waitFor(() => {
            expect(screen.getByText('No suggestions found. Try a different query.')).toBeInTheDocument();
        });
    });

    it('shows loading state during search', async () => {
        mockAxios.post.mockReturnValue(new Promise(() => {})); // never resolves

        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        fireEvent.change(screen.getByPlaceholderText('Type something...'), {
            target: { value: 'test query' }
        });
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[buttons.length - 1]);

        await waitFor(() => {
            expect(screen.getByText('Thinking...')).toBeInTheDocument();
        });
    });

    it('shows reset button after search and resets on click', async () => {
        mockAxios.post.mockResolvedValue({
            data: { events: [{ title: 'Event A', start_time: '2025-03-01T10:00:00' }] }
        });

        render(<EventAssistant onAddEvent={mockOnAddEvent} />);
        fireEvent.change(screen.getByPlaceholderText('Type something...'), {
            target: { value: 'event' }
        });
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[buttons.length - 1]);

        await waitFor(() => {
            expect(screen.getByText('Event A')).toBeInTheDocument();
        });

        // Click reset button (title: "Start Over")
        const resetBtn = screen.getByTitle('Start Over');
        fireEvent.click(resetBtn);

        // Should go back to initial state
        expect(screen.queryByText('Event A')).not.toBeInTheDocument();
        expect(screen.getByText(/Suggest events/)).toBeInTheDocument();
    });
});
