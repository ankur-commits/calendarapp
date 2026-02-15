import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';

// Mock react-big-calendar
vi.mock('react-big-calendar', () => {
    const Views = { MONTH: 'month', WEEK: 'week', DAY: 'day' };
    return {
        Calendar: ({ events }: any) => (
            <div data-testid="mock-calendar">{events?.length ?? 0} events</div>
        ),
        dateFnsLocalizer: () => ({}),
        Views,
    };
});

// Mock LocationAutocomplete
vi.mock('@/components/LocationAutocomplete', () => ({
    default: ({ value, onChange }: any) => (
        <input
            data-testid="location-input"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
        />
    ),
}));

import Home from '@/app/page';

describe('Dashboard (Home) Page', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockImplementation((url: string) => {
            if (url.includes('/api/auth/me')) {
                return Promise.resolve({ data: { id: 1, family_id: 1 } });
            }
            if (url.includes('/api/events')) {
                return Promise.resolve({
                    data: [
                        {
                            id: 1,
                            title: 'Team Meeting',
                            start_time: '2025-03-01T10:00:00Z',
                            end_time: '2025-03-01T11:00:00Z',
                            category: 'Work',
                        },
                    ],
                });
            }
            if (url.includes('/api/users')) {
                return Promise.resolve({
                    data: [
                        { id: 1, name: 'Alice', email: 'alice@test.com' },
                    ],
                });
            }
            return Promise.resolve({ data: [] });
        });

        // Mock navigator.mediaDevices for VoiceInput
        Object.defineProperty(global.navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
            writable: true,
        });
        (global as any).MediaRecorder = class {
            ondataavailable: any;
            onstop: any;
            stream = { getTracks: () => [{ stop: vi.fn() }] };
            start = vi.fn();
            stop = vi.fn();
        };
    });

    it('renders the page heading', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(screen.getByText('My Calendar')).toBeInTheDocument();
        });
    });

    it('renders view mode toggle buttons', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(screen.getByTitle('Grid View')).toBeInTheDocument();
            expect(screen.getByTitle('Family View')).toBeInTheDocument();
            expect(screen.getByTitle('Timeline View')).toBeInTheDocument();
        });
    });

    it('renders the Add Event button', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(screen.getByTestId('add-event-btn')).toBeInTheDocument();
        });
    });

    it('renders the AI Assistant button on mobile', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(screen.getByTitle('AI Assistant')).toBeInTheDocument();
        });
    });

    it('fetches events on mount', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/events/'));
        });
    });

    it('fetches users on mount', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/users/'));
        });
    });

    it('opens Add Event modal when button is clicked', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByTestId('add-event-btn')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('add-event-btn'));

        await waitFor(() => {
            expect(screen.getByText('Add New Event')).toBeInTheDocument();
        });
    });

    it('switches to timeline view', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByTitle('Timeline View')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTitle('Timeline View'));

        await waitFor(() => {
            expect(screen.getByText('Timeline (Logistics View)')).toBeInTheDocument();
        });
    });

    it('renders voice input component', async () => {
        render(<Home />);
        await waitFor(() => {
            expect(screen.getByTitle('Voice Command')).toBeInTheDocument();
        });
    });
});
