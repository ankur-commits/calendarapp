import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks, mockPush } from '../test-utils';
import OnboardingPage from '@/app/onboarding/page';

describe('OnboardingPage', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('redirects to login when no token', () => {
        mockLocalStorage({});
        render(<OnboardingPage />);
        expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('renders the selection screen with two options', () => {
        mockLocalStorage({ token: fakeToken() });
        render(<OnboardingPage />);

        expect(screen.getByText('Welcome to FamilyCal!')).toBeInTheDocument();
        expect(screen.getByText('Create a New Family')).toBeInTheDocument();
        expect(screen.getByText('Join an Existing Family')).toBeInTheDocument();
    });

    it('shows create family form when "Create" is clicked', () => {
        mockLocalStorage({ token: fakeToken() });
        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('Create a New Family'));

        expect(screen.getByText('Family Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('The Smiths')).toBeInTheDocument();
        expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows join family form when "Join" is clicked', () => {
        mockLocalStorage({ token: fakeToken() });
        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('Join an Existing Family'));

        expect(screen.getByText("Family Admin's Email")).toBeInTheDocument();
        expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
    });

    it('goes back to selection from create form', () => {
        mockLocalStorage({ token: fakeToken() });
        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('Create a New Family'));
        fireEvent.click(screen.getByText('Back'));

        expect(screen.getByText('Create a New Family')).toBeInTheDocument();
        expect(screen.getByText('Join an Existing Family')).toBeInTheDocument();
    });

    it('creates family and redirects to dashboard', async () => {
        mockLocalStorage({ token: fakeToken() });
        mockAxios.post.mockResolvedValue({ data: { id: 1, name: 'The Smiths' } });

        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('Create a New Family'));
        fireEvent.change(screen.getByPlaceholderText('The Smiths'), {
            target: { value: 'The Smiths' },
        });

        // Find and click the Create Family button (contains text)
        const createBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Create Family'));
        fireEvent.click(createBtn!);

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/families/'),
                { name: 'The Smiths' },
                expect.objectContaining({ headers: expect.any(Object) })
            );
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('sends join request and shows alert', async () => {
        mockLocalStorage({ token: fakeToken() });
        mockAxios.post.mockResolvedValue({ data: {} });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('Join an Existing Family'));
        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
            target: { value: 'admin@family.com' },
        });

        fireEvent.click(screen.getByText('Send Request'));

        await waitFor(() => {
            expect(mockAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/families/join-request'),
                { admin_email: 'admin@family.com' },
                expect.objectContaining({ headers: expect.any(Object) })
            );
        });

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalled();
        });

        alertSpy.mockRestore();
    });
});
