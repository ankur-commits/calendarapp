import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetMocks, mockAxios, mockLocalStorage, fakeToken } from '../test-utils';
import DashboardLayout from '@/components/DashboardLayout';

describe('DashboardLayout', () => {
    beforeEach(() => {
        resetMocks();
        mockLocalStorage({ token: fakeToken() });
        mockAxios.get.mockResolvedValue({ data: [] });
    });

    it('renders children content', () => {
        render(
            <DashboardLayout>
                <div>Test Content</div>
            </DashboardLayout>
        );
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders the mobile header with FamilyCal brand', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );
        // Mobile header contains FamilyCal text
        const brands = screen.getAllByText('FamilyCal');
        expect(brands.length).toBeGreaterThanOrEqual(1);
    });

    it('renders sidebar component', () => {
        render(
            <DashboardLayout>
                <div>Content</div>
            </DashboardLayout>
        );
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });
});
