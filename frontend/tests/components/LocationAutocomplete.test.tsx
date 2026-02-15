import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockAxios, resetMocks } from '../test-utils';
import LocationAutocomplete from '@/components/LocationAutocomplete';

describe('LocationAutocomplete', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        resetMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders input with placeholder', () => {
        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        expect(screen.getByTestId('location-input')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search location...')).toBeInTheDocument();
    });

    it('renders custom placeholder', () => {
        render(<LocationAutocomplete value="" onChange={mockOnChange} placeholder="Enter address" />);
        expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument();
    });

    it('calls onChange when user types', () => {
        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Sea' } });
        expect(mockOnChange).toHaveBeenCalledWith('Sea');
    });

    it('does not fetch suggestions for short queries (< 3 chars)', async () => {
        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Se' } });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('fetches suggestions after typing 3+ chars with debounce', async () => {
        mockAxios.get.mockResolvedValue({
            data: [
                { display_name: 'Seattle, WA, USA', place_id: 1 },
                { display_name: 'Seaside, OR, USA', place_id: 2 },
            ]
        });

        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Sea' } });

        // Before debounce fires
        expect(mockAxios.get).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        await waitFor(() => {
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://nominatim.openstreetmap.org/search',
                expect.objectContaining({
                    params: expect.objectContaining({ q: 'Sea' })
                })
            );
        });
    });

    it('displays suggestions list after fetch', async () => {
        mockAxios.get.mockResolvedValue({
            data: [
                { display_name: 'Seattle, WA, USA' },
                { display_name: 'Seaside, OR, USA' },
            ]
        });

        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Sea' } });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        await waitFor(() => {
            expect(screen.getByText('Seattle, WA, USA')).toBeInTheDocument();
            expect(screen.getByText('Seaside, OR, USA')).toBeInTheDocument();
        });
    });

    it('selects a suggestion and calls onChange', async () => {
        mockAxios.get.mockResolvedValue({
            data: [{ display_name: 'Seattle, WA, USA' }]
        });

        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Sea' } });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        await waitFor(() => {
            expect(screen.getByText('Seattle, WA, USA')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Seattle, WA, USA'));
        expect(mockOnChange).toHaveBeenCalledWith('Seattle, WA, USA');
    });

    it('shows Google Maps link when query has value', () => {
        render(<LocationAutocomplete value="Seattle" onChange={mockOnChange} />);
        const link = screen.getByTitle('Open in Google Maps');
        expect(link).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
        expect(link).toHaveAttribute('target', '_blank');
    });

    it('shows attribution text in suggestions list', async () => {
        mockAxios.get.mockResolvedValue({
            data: [{ display_name: 'Place' }]
        });

        render(<LocationAutocomplete value="" onChange={mockOnChange} />);
        fireEvent.change(screen.getByTestId('location-input'), { target: { value: 'Place' } });

        await act(async () => {
            vi.advanceTimersByTime(600);
        });

        await waitFor(() => {
            expect(screen.getByText('Search via OpenStreetMap')).toBeInTheDocument();
        });
    });
});
