import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceInput from '@/components/VoiceInput';

// Mock MediaRecorder
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockStream = {
    getTracks: () => [{ stop: vi.fn() }],
};

class MockMediaRecorder {
    ondataavailable: any;
    onstop: any;
    stream = mockStream;
    start = mockStart;
    stop() {
        mockStop();
        if (this.onstop) this.onstop();
    }
}

Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
    writable: true,
});

(global as any).MediaRecorder = MockMediaRecorder;

describe('VoiceInput', () => {
    const mockOnEventCreated = vi.fn();
    const mockOnOpenModal = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('compact mode', () => {
        it('renders a button in compact mode', () => {
            render(
                <VoiceInput
                    isCompact={true}
                    onEventCreated={mockOnEventCreated}
                    onOpenModal={mockOnOpenModal}
                />
            );
            const button = screen.getByTitle('Voice Command');
            expect(button).toBeInTheDocument();
        });

        it('starts recording on click', async () => {
            render(
                <VoiceInput
                    isCompact={true}
                    onEventCreated={mockOnEventCreated}
                    onOpenModal={mockOnOpenModal}
                />
            );

            fireEvent.click(screen.getByTitle('Voice Command'));

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
        });
    });

    describe('full mode', () => {
        it('renders voice input heading', () => {
            render(
                <VoiceInput
                    isCompact={false}
                    onEventCreated={mockOnEventCreated}
                    onOpenModal={mockOnOpenModal}
                />
            );
            expect(screen.getByText('Voice Input')).toBeInTheDocument();
        });

        it('shows "Speak Event" button when idle', () => {
            render(
                <VoiceInput
                    isCompact={false}
                    onEventCreated={mockOnEventCreated}
                    onOpenModal={mockOnOpenModal}
                />
            );
            expect(screen.getByText('Speak Event')).toBeInTheDocument();
        });

        it('starts recording when speak button is clicked', async () => {
            render(
                <VoiceInput
                    isCompact={false}
                    onEventCreated={mockOnEventCreated}
                    onOpenModal={mockOnOpenModal}
                />
            );

            fireEvent.click(screen.getByText('Speak Event'));
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        });
    });
});
