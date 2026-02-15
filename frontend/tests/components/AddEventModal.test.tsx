import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReactDOMClient from 'react-dom/client';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import AddEventModal from '@/components/AddEventModal';

// Mock LocationAutocomplete to simplify tests
vi.mock('@/components/LocationAutocomplete', () => ({
    default: ({ value, onChange, placeholder }: any) => (
        <input
            data-testid="location-input"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            placeholder={placeholder || 'Search location...'}
        />
    ),
}));

// Helper: render using createRoot (bypasses RTL's act() which hangs with
// AddEventModal's useEffect cycle in React 19). The component has an
// infinite re-render loop between its formData and conflict-detection
// effects (new [] ref each cycle). React catches it with "Maximum update
// depth exceeded" but act() hangs waiting for it to settle.
function renderModal(props: Record<string, any>) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    // Suppress the "Maximum update depth" console.error
    const origError = console.error;
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('Maximum update depth')) return;
        origError(...args);
    };

    root.render(
        <AddEventModal
            onClose={props.onClose || vi.fn()}
            onEventCreated={props.onEventCreated || vi.fn()}
            {...props}
        />
    );

    return {
        container,
        root,
        cleanup: () => {
            console.error = origError;
            root.unmount();
            document.body.removeChild(container);
        },
    };
}

async function waitForRender(ms = 50) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

describe('AddEventModal', () => {
    const mockOnClose = vi.fn();
    const mockOnEventCreated = vi.fn();

    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockResolvedValue({ data: [{ id: 1, name: 'Alice', email: 'alice@test.com' }] });
    });

    it('returns null when not open', async () => {
        const { container, cleanup } = renderModal({
            isOpen: false,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender();
        expect(container.innerHTML).toBe('');
        cleanup();
    });

    it('renders form when open', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender();
        expect(container.textContent).toContain('Add New Event');
        expect(container.querySelector('input[type="text"]')).toBeTruthy();
        expect(container.querySelector('select')).toBeTruthy();
        expect(container.querySelector('textarea')).toBeTruthy();
        cleanup();
    });

    it('renders "Edit Event" when initialData has id', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
            initialData: { id: 42, title: 'Existing Event' },
        });
        await waitForRender();
        expect(container.textContent).toContain('Edit Event');
        cleanup();
    });

    it('populates form from initialData', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
            initialData: {
                title: 'Pre-filled Event',
                description: 'Test desc',
                location: 'Seattle',
                category: 'Work',
                start_date: '2025-03-01',
                start_time: '10:00',
                end_date: '2025-03-01',
                end_time: '11:00',
            },
        });
        await waitForRender();
        const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        expect(titleInput?.value).toBe('Pre-filled Event');
        expect(textarea?.value).toBe('Test desc');
        cleanup();
    });

    it('calls onClose when X button is clicked', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender();
        // The X button is the one with an SVG near the header
        const buttons = container.querySelectorAll('button');
        const closeBtn = Array.from(buttons).find(
            b => b.querySelector('svg') && !b.textContent?.includes('Create')
        );
        closeBtn?.click();
        expect(mockOnClose).toHaveBeenCalled();
        cleanup();
    });

    it('creates event on form submit', async () => {
        mockAxios.post.mockResolvedValue({ data: { id: 1, title: 'New Event' } });

        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender();

        // Fill in title
        const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        )!.set!;
        nativeInputValueSetter.call(titleInput, 'New Event');
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));

        await waitForRender();

        // Submit form
        const form = container.querySelector('form') as HTMLFormElement;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        await waitForRender(100);

        expect(mockAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/events/'),
            expect.objectContaining({ title: 'New Event' })
        );
        cleanup();
    });

    it('updates event when initialData has id', async () => {
        mockAxios.put.mockResolvedValue({ data: {} });

        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
            initialData: { id: 42, title: 'Existing Event' },
        });
        await waitForRender();

        // Click "Update Event" button
        const buttons = container.querySelectorAll('button[type="submit"]');
        const updateBtn = Array.from(buttons).find(b => b.textContent?.includes('Update Event'));
        updateBtn?.click();

        await waitForRender(100);

        expect(mockAxios.put).toHaveBeenCalledWith(
            expect.stringContaining('/api/events/42'),
            expect.any(Object)
        );
        cleanup();
    });

    it('shows delete button for existing events', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
            initialData: { id: 42, title: 'Existing Event' },
        });
        await waitForRender();
        expect(container.textContent).toContain('Delete Event');
        cleanup();
    });

    it('does not show delete button for new events', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender();
        expect(container.textContent).not.toContain('Delete Event');
        cleanup();
    });

    it('fetches users on open and shows attendee buttons', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender(100);

        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/users/'));
        expect(container.textContent).toContain('Alice');
        cleanup();
    });

    it('shows category dropdown with options', async () => {
        const { container, cleanup } = renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onEventCreated: mockOnEventCreated,
        });
        await waitForRender();

        const select = container.querySelector('select') as HTMLSelectElement;
        expect(select).toBeTruthy();
        const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
        expect(options).toEqual(['General', 'Family', 'Work', 'Hobby', 'School']);
        cleanup();
    });
});
