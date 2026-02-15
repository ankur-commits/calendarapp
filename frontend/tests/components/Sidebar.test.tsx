import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { resetMocks, setMockPathname, mockAxios, mockLocalStorage, fakeToken } from '../test-utils';
import Sidebar from '@/components/Sidebar';

describe('Sidebar', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockResolvedValue({ data: [] });
    });

    it('renders the FamilyCal brand name', () => {
        render(<Sidebar />);
        expect(screen.getByText('FamilyCal')).toBeInTheDocument();
    });

    it('renders all navigation links', () => {
        render(<Sidebar />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
        expect(screen.getByText('Shopping List')).toBeInTheDocument();
        expect(screen.getByText('To Do / Reminders')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('links point to correct routes', () => {
        render(<Sidebar />);
        expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
        expect(screen.getByText('Analytics').closest('a')).toHaveAttribute('href', '/analytics');
        expect(screen.getByText('Shopping List').closest('a')).toHaveAttribute('href', '/shopping');
        expect(screen.getByText('To Do / Reminders').closest('a')).toHaveAttribute('href', '/todos');
        expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
    });

    it('highlights active link for dashboard', () => {
        setMockPathname('/');
        render(<Sidebar />);
        const link = screen.getByText('Dashboard').closest('a');
        expect(link?.className).toContain('bg-blue-50');
    });

    it('highlights active link for analytics', () => {
        setMockPathname('/analytics');
        render(<Sidebar />);
        const link = screen.getByText('Analytics').closest('a');
        expect(link?.className).toContain('bg-blue-50');
    });

    it('does not highlight non-active links', () => {
        setMockPathname('/');
        render(<Sidebar />);
        const analyticsLink = screen.getByText('Analytics').closest('a');
        expect(analyticsLink?.className).not.toContain('bg-blue-50');
    });

    it('renders Current User section', () => {
        render(<Sidebar />);
        expect(screen.getByText('Current User')).toBeInTheDocument();
    });
});
