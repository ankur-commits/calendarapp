import { vi } from 'vitest';

// --- Mock next/navigation ---
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
let mockPathname = '/';
let mockSearchParams = new URLSearchParams();

export const setMockPathname = (p: string) => { mockPathname = p; };
export const setMockSearchParams = (params: URLSearchParams) => { mockSearchParams = params; };

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        back: mockBack,
        prefetch: vi.fn(),
    }),
    usePathname: () => mockPathname,
    useSearchParams: () => mockSearchParams,
}));

// --- Mock next/link ---
vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

// --- Mock axios ---
export const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(() => false),
};

vi.mock('axios', () => ({
    default: {
        get: (...args: any[]) => mockAxios.get(...args),
        post: (...args: any[]) => mockAxios.post(...args),
        put: (...args: any[]) => mockAxios.put(...args),
        delete: (...args: any[]) => mockAxios.delete(...args),
        isAxiosError: (...args: any[]) => mockAxios.isAxiosError(...args),
    },
}));

// --- localStorage helpers ---
// Uses the mock localStorage set up in vitest.setup.ts via Object.defineProperty
export function mockLocalStorage(data: Record<string, string> = {}) {
    (localStorage as any)._setStore(data);
    return (localStorage as any)._getStore();
}

// --- Fake JWT token (sub = email) ---
export function fakeToken(email = 'test@example.com', familyId = 1) {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ sub: email, family_id: familyId }));
    return `${header}.${payload}.fakesig`;
}

// --- Reset helpers ---
export function resetMocks() {
    vi.clearAllMocks();
    mockPathname = '/';
    mockSearchParams = new URLSearchParams();
    localStorage.clear();
}

export { mockPush, mockReplace, mockBack };
