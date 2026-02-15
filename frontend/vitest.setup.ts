import '@testing-library/jest-dom'

// Provide a robust localStorage mock for all tests
// jsdom's Storage.prototype is unreliable with vi.spyOn
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] ?? null,
        _getStore: () => store,
        _setStore: (data: Record<string, string>) => { store = { ...data }; },
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
