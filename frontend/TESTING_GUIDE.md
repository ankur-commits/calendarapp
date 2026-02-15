# Frontend Testing Guide

This document serves as a comprehensive guide for maintaining, extending, and debugging the frontend test suite for the Calendar App. It is designed for both human developers and AI agents.

## 1. Overview

The frontend testing stack is modern and fast, designed to closely simulate user interactions in a browser-like environment.

-   **Test Runner**: [Vitest](https://vitest.dev/) (Jest-compatible, fast execution).
-   **Environment**: `jsdom` (simulates browser APIs like `window`, `document`).
-   **Testing Library**: `@testing-library/react` (RTL) for rendering components and interacting with DOM elements.
-   **Mocks**: Centralized in `frontend/tests/test-utils.tsx`.
-   **Suite size**: 24 test files, 166 tests (13 components + 10 pages + 1 smoke test).

## 2. Project Structure

```
frontend/
├── vitest.config.ts      # Test runner config (jsdom, @ alias, setup file)
├── vitest.setup.ts       # Global setup: localStorage mock + jest-dom matchers
└── tests/
    ├── test-utils.tsx    # Shared mocks (axios, router, localStorage, JWT)
    ├── smoke.test.tsx    # Sanity check to ensure the test runner works
    ├── components/       # Unit tests for reusable UI components
    └── pages/            # Integration tests for Next.js pages
```

### Configuration files

**`vitest.config.ts`** — Configures the test runner:
- `environment: 'jsdom'` — browser-like DOM simulation
- `globals: true` — makes `describe`, `it`, `expect` available without imports
- `alias: { '@': './' }` — mirrors Next.js `@/` import alias
- `setupFiles: ['./vitest.setup.ts']` — runs before every test file

**`vitest.setup.ts`** — Global test setup:
- Imports `@testing-library/jest-dom` for DOM matchers (`.toBeInTheDocument()`, `.toHaveTextContent()`, etc.)
- Creates a robust `localStorage` mock via `Object.defineProperty(window, 'localStorage', ...)` because `vi.spyOn(Storage.prototype, ...)` does **not** work reliably with jsdom in vitest
- The mock exposes `_setStore(data)` / `_getStore()` helpers used by `test-utils.tsx`

## 3. Running Tests

Run tests from the `frontend/` directory.

-   **Run All Tests**:
    ```bash
    npm test
    ```
-   **Run Specific Test File**:
    ```bash
    npm test tests/components/AddEventModal.test.tsx
    ```
-   **Run and Watch (Default)**:
    Vitest runs in watch mode by default. Press `q` to quit.
-   **Run Once (CI Mode)**:
    ```bash
    npm test run
    ```

## 4. Writing Tests

### 4.1 Basic Pattern

Tests follow the **Render -> Find -> Interact -> Assert** pattern.

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

it('renders and clicks button', async () => {
    render(<MyComponent />);

    // Find
    const btn = screen.getByText('Click Me');

    // Interact
    fireEvent.click(btn);

    // Assert
    expect(btn).toBeInTheDocument();
    await waitFor(() => {
        expect(screen.getByText('Clicked!')).toBeInTheDocument();
    });
});
```

### 4.2 Using Mocks (`test-utils.tsx`)

We have pre-configured mocks for common external dependencies. **Always use these instead of manual mocking.**

#### Complete `test-utils.tsx` API

| Export | Type | Purpose |
|--------|------|---------|
| `mockAxios` | `{ get, post, put, delete, isAxiosError }` | Mock axios instance — all methods are `vi.fn()` |
| `mockPush` | `vi.fn()` | Mock for `useRouter().push` |
| `mockReplace` | `vi.fn()` | Mock for `useRouter().replace` |
| `mockBack` | `vi.fn()` | Mock for `useRouter().back` |
| `setMockPathname(p)` | function | Set the value returned by `usePathname()` |
| `setMockSearchParams(p)` | function | Set the value returned by `useSearchParams()` |
| `mockLocalStorage(data)` | function | Populate localStorage with `{ key: value }` pairs |
| `fakeToken(email?, familyId?)` | function | Generate a fake JWT with given `sub` and `family_id` |
| `resetMocks()` | function | Clear all mocks, reset pathname/searchParams, clear localStorage |

#### Auto-mocked modules

These are mocked globally by `test-utils.tsx` — just import the file:

**1. `next/navigation`** — `useRouter`, `usePathname`, `useSearchParams` all return mock values.

**2. `next/link`** — Rendered as a plain `<a>` tag so `href` assertions work:
```typescript
expect(screen.getByText('Sign up')).toHaveAttribute('href', '/signup');
```

**3. `axios`** — All HTTP methods delegate to `mockAxios`:
```typescript
import { mockAxios, resetMocks } from '../test-utils';

beforeEach(() => {
    resetMocks();
    mockAxios.get.mockResolvedValue({ data: [] });
});

it('fetches data', async () => {
    render(<Component />);
    await waitFor(() => {
        expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/resource'));
    });
});
```

#### Per-file mocks (add at top of test file as needed)

**4. `react-big-calendar`** — Used for CalendarView and dashboard tests. Returns a simple div with test IDs:
```typescript
vi.mock('react-big-calendar', () => {
    const Views = { MONTH: 'month', WEEK: 'week', DAY: 'day' };
    return {
        Calendar: ({ events, view, onSelectSlot, onSelectEvent }: any) => (
            <div data-testid="mock-calendar">
                <div data-testid="calendar-view">{view}</div>
                <div data-testid="calendar-events">{events?.length ?? 0} events</div>
            </div>
        ),
        dateFnsLocalizer: () => ({}),
        Views,
    };
});
```

**5. `MediaRecorder` + `navigator.mediaDevices`** — Used for VoiceInput tests:
```typescript
const mockStream = { getTracks: () => [{ stop: vi.fn() }] };

class MockMediaRecorder {
    ondataavailable: any;
    onstop: any;
    stream = mockStream;
    start = vi.fn();
    stop() { if (this.onstop) this.onstop(); }
}

Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    writable: true,
});
(global as any).MediaRecorder = MockMediaRecorder;
```

**6. `LocationAutocomplete`** — Mock to a simple `<input>` for AddEventModal and dashboard tests:
```typescript
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
```

#### Authentication & localStorage

Use `mockLocalStorage` and `fakeToken` to simulate a logged-in user:
```typescript
import { mockLocalStorage, fakeToken } from '../test-utils';

beforeEach(() => {
    mockLocalStorage({ token: fakeToken('user@example.com') });
});
```

#### Navigation assertions

```typescript
import { mockPush } from '../test-utils';

it('redirects on success', async () => {
    // ... perform action ...
    await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
});
```

### 4.3 Recipes (Copy-Paste Patterns)

#### Recipe A: Auth-guarded page with multiple API endpoints

Pages wrapped in `AuthGuard` + `DashboardLayout` call `/api/auth/me` on mount. Mock that plus any page-specific endpoints using URL-based branching:

```typescript
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import ShoppingPage from '@/app/shopping/page';

beforeEach(() => {
    resetMocks();
    mockLocalStorage({ token: fakeToken() });
    mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/api/auth/me')) {
            return Promise.resolve({ data: { id: 1, family_id: 1 } });
        }
        if (url.includes('/api/shopping')) {
            return Promise.resolve({ data: [{ id: 1, name: 'Milk' }] });
        }
        if (url.includes('/api/users')) {
            return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: [] });
    });
});

it('renders the page', async () => {
    render(<ShoppingPage />);
    await waitFor(() => {
        // Use heading role when Sidebar also contains the same text
        expect(screen.getByRole('heading', { name: 'Shopping List' })).toBeInTheDocument();
    });
});
```

#### Recipe B: Form submission

```typescript
it('submits form and calls API', async () => {
    mockAxios.post.mockResolvedValue({ data: { access_token: 'test-jwt' } });
    const store = mockLocalStorage({});

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/auth/token'),
            expect.any(URLSearchParams)
        );
    });

    await waitFor(() => {
        expect(store['token']).toBe('test-jwt');
        expect(mockPush).toHaveBeenCalledWith('/');
    });
});
```

#### Recipe C: AddEventModal (createRoot workaround)

AddEventModal has a known React 19 infinite re-render loop (see Section 5.3). Standard RTL `render()` + `act()` hangs forever. Use `ReactDOMClient.createRoot` directly:

```typescript
import ReactDOMClient from 'react-dom/client';
import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
import AddEventModal from '@/components/AddEventModal';

// Mock LocationAutocomplete to simple <input>
vi.mock('@/components/LocationAutocomplete', () => ({
    default: ({ value, onChange, placeholder }: any) => (
        <input data-testid="location-input" value={value}
            onChange={(e: any) => onChange(e.target.value)}
            placeholder={placeholder || 'Search location...'} />
    ),
}));

// Render helper — bypasses RTL's act()
function renderModal(props: Record<string, any>) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    // Suppress "Maximum update depth exceeded" noise
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

// Usage in tests:
it('renders form when open', async () => {
    const { container, cleanup } = renderModal({ isOpen: true });
    await waitForRender();
    expect(container.textContent).toContain('Add New Event');
    cleanup();
});
```

Key differences from normal tests:
- Use `container.textContent` / `container.querySelector()` instead of `screen.*`
- Always call `cleanup()` at the end of each test
- Use `waitForRender(ms)` instead of `waitFor()`
- Use longer waits for async operations: `await waitForRender(100)`

## 5. Common Issues & Fixes

### 5.1 `act(...)` Warnings

**Symptom**: Console warnings about updates not being wrapped in `act(...)`.
**Cause**: State updates happening asynchronously after a test has finished or outside of the `fireEvent` loop.
**Fix**:
1.  Use `await waitFor(() => expect(...))` to wait for the UI to settle.
2.  Mock async operations correctly so they resolve/reject as expected.
3.  Ensure your test waits for all side effects (like API calls) to complete before exiting.

### 5.2 Infinite Render Loops

**Symptom**: "Maximum update depth exceeded" error.
**Cause**: `useEffect` dependencies changing on every render (e.g., passing a new array `[]` or object `{}` as a prop default value).
**Fix**:
-   **Avoid**: `function MyComponent({ list = [] }) { ... }` where `list` is a dependency.
-   **Prefer**: Handle default values inside the component logic or use `useMemo`.
-   **Example Fix**:
    ```typescript
    // BAD
    useEffect(() => { ... }, [props.list]); // infinite loop if list defaults to [] in args

    // GOOD
    const safeList = props.list || [];
    useEffect(() => { ... }, [safeList]); // unsafe if safeList is created in render body!

    // BETTER (Fix used in AddEventModal)
    // Remove default value from props destructuring if it causes new reference.
    const listToUse = props.list || [];
    // AND Ensure dependency array uses stable references or primitives.
    ```

### 5.3 React 19 `act()` Hangs with useEffect Infinite Loops

**Symptom**: Tests hang indefinitely (no timeout, no error) when using RTL `render()`.
**Cause**: A component has a render loop (e.g. `formData.attendee_ids` is a new `[]` ref each cycle, triggering a conflict-detection `useEffect` that calls `setConflicts([])`, creating another new ref). React 19's `act()` waits for the component to "settle" — but infinite loops never settle.
**Workaround**: Use `ReactDOMClient.createRoot` directly instead of RTL's `render()`. See Recipe C above.
**Root cause in AddEventModal**: `formData.attendee_ids` is a new array reference in each `setFormData` call, causing the conflict-detection effect to re-run infinitely.

### 5.4 date-fns Protected Token Bug

**Symptom**: `RangeError: Use 'dd' instead of 'D'` or silent wrong output.
**Cause**: In `date-fns` format strings, uppercase `D` means "day of year" and is a protected token. If a format string contains a word with `D` (e.g., `"MMM d (Due)"`), the `D` in `Due` is interpreted as a format token.
**Fix**: Escape literal text with single quotes: `format(date, "MMM d '(Due)'")`
**Affected**: `ActionCard.tsx` — the component uses `"MMM d (Due)"` which triggers this bug. Tests currently avoid this path.

### 5.5 Sidebar Text Duplication

**Symptom**: `getByText('Shopping List')` fails with "found multiple elements" or matches the wrong one.
**Cause**: Pages render inside `DashboardLayout` which includes `Sidebar`. Navigation links in the sidebar contain text that duplicates page headings (e.g., "Shopping List", "To-Do List", "Settings").
**Fix**: Scope your queries:
```typescript
// Use role-based queries
screen.getByRole('heading', { name: 'Shopping List' })

// Or scope to a container
const main = screen.getByRole('main');
within(main).getByText('Shopping List')
```

### 5.6 DOM Traversal Tips

When elements lack accessible names or `data-testid`, fall back to DOM traversal:

```typescript
// Find by CSS selector
const select = container.querySelector('select') as HTMLSelectElement;

// Find a button by its text content
const buttons = container.querySelectorAll('button');
const deleteBtn = Array.from(buttons).find(b => b.textContent?.includes('Delete'));

// Find a button containing an SVG (icon button)
const closeBtn = Array.from(buttons).find(
    b => b.querySelector('svg') && !b.textContent?.includes('Create')
);

// Get option values from a select
const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);

// Native input value setter (for React controlled inputs outside RTL's act)
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
)!.set!;
nativeInputValueSetter.call(titleInput, 'New Event');
titleInput.dispatchEvent(new Event('input', { bubbles: true }));
titleInput.dispatchEvent(new Event('change', { bubbles: true }));
```

## 6. Guide for AI Agents

When asked to write code or fix bugs, follow these rules regarding tests:

1.  **Check for Tests First**: Before modifying a component (e.g., `AddEventModal.tsx`), check if a corresponding test file exists (`tests/components/AddEventModal.test.tsx`).
2.  **Run Tests Before & After**:
    -   Run `npm test [path/to/test]` to establish a baseline.
    -   Apply your changes.
    -   Run the test again to verify the fix and ensure no regressions.
3.  **Update Tests**: If you change functionality, update the test cases to match. Passing tests with broken functionality is a failure.
4.  **Use `test-utils`**: Always import from `../test-utils`. Do not reinvent mocks for axios, router, or localStorage. The shared mocks ensure consistency across the suite.
5.  **Fix Warnings**: If you see `act(...)` warnings, it often means you need to `await waitFor(...)` for a UI change that happens after an async operation.
6.  **AddEventModal**: For tests involving AddEventModal, always use the `createRoot` pattern (Recipe C in Section 4.3). Standard RTL `render()` will hang.
7.  **Run Full Suite**: After any changes, run `cd frontend && npm test` to catch cross-test regressions.

## 7. Test File Inventory

### Component Tests (13 files)

| File | Tests | What it covers |
|------|-------|----------------|
| `components/ActionCard.test.tsx` | 12 | AI suggestion cards: render types (event, shopping, todo, chore), add/dismiss actions, error states |
| `components/AddEventModal.test.tsx` | 11 | Create/edit event modal: form rendering, pre-fill from initialData, submit create/update, delete button, attendee list, category dropdown |
| `components/Analytics.test.tsx` | 4 | Analytics charts: renders headings, handles empty data, chart containers |
| `components/AuthGuard.test.tsx` | 6 | JWT guard: redirects to login when no token, redirects to onboarding when no family, renders children for valid user |
| `components/CalendarView.test.tsx` | 7 | Calendar grid: month/day views, family view with resources, event count, slot selection |
| `components/DashboardLayout.test.tsx` | 3 | App shell: renders sidebar, main content area, child components |
| `components/EventAssistant.test.tsx` | 9 | AI text assistant: renders panel, sends queries, displays action cards from AI response, search mode |
| `components/EventList.test.tsx` | 6 | Event list: renders events, edit/delete handlers, empty state, category badges |
| `components/LocationAutocomplete.test.tsx` | 9 | Location input: renders, debounced API calls, suggestion dropdown, selection, clear button |
| `components/Sidebar.test.tsx` | 7 | Navigation sidebar: renders nav links, active state via pathname, logo, mobile toggle |
| `components/TimelineView.test.tsx` | 8 | Timeline/list view: renders events chronologically, drive time display, empty state, event click handler |
| `components/UserSwitcher.test.tsx` | 8 | User context switcher: renders current user, dropdown with family members, switch user action, fetch users |
| `components/VoiceInput.test.tsx` | 5 | Voice input: compact/full modes, starts MediaRecorder on click, getUserMedia call |

### Page Tests (10 files)

| File | Tests | What it covers |
|------|-------|----------------|
| `pages/dashboard.test.tsx` | 9 | Main page: renders calendar, view toggles, add event button, fetches events/users, voice input |
| `pages/forgot-password.test.tsx` | 6 | Forgot password form: renders, submits email, success/error states |
| `pages/invite.test.tsx` | 6 | Family invite: reads token from URL, accepts invite, error/loading states |
| `pages/login.test.tsx` | 7 | Login form: renders inputs, submits credentials, stores JWT, redirects, error alert |
| `pages/onboarding.test.tsx` | 7 | Family create/join: renders options, create family flow, join family flow |
| `pages/reset-password.test.tsx` | 6 | Reset password form: renders, validates passwords match, submits, success state |
| `pages/settings.test.tsx` | 8 | Settings page: renders user info, edit profile, change password, preferences |
| `pages/shopping.test.tsx` | 6 | Shopping list: renders items, add item form, toggle bought, category filter, empty state |
| `pages/signup.test.tsx` | 7 | Registration form: renders, validates inputs, submits, redirects to onboarding |
| `pages/todos.test.tsx` | 8 | To-do list: renders todos, add/complete/delete, priority levels, empty state |

### Other

| File | Tests | What it covers |
|------|-------|----------------|
| `smoke.test.tsx` | 1 | Sanity check: verifies the test runner works |

**Total: 24 files, 166 tests**

## 8. Checklist for New Tests

Follow this step-by-step when adding a new test file:

1. **Create the file** in the appropriate directory:
   - Component → `frontend/tests/components/ComponentName.test.tsx`
   - Page → `frontend/tests/pages/page-name.test.tsx`

2. **Add imports**:
   ```typescript
   import { describe, it, expect, vi, beforeEach } from 'vitest';
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import { mockAxios, mockLocalStorage, fakeToken, resetMocks } from '../test-utils';
   import YourComponent from '@/components/YourComponent'; // or @/app/page-name/page
   ```

3. **Set up `beforeEach`**:
   ```typescript
   beforeEach(() => {
       resetMocks();
       mockLocalStorage({ token: fakeToken() });
       // Mock API endpoints the component calls on mount
       mockAxios.get.mockImplementation((url: string) => {
           if (url.includes('/api/auth/me')) {
               return Promise.resolve({ data: { id: 1, family_id: 1 } });
           }
           // Add more URL branches as needed
           return Promise.resolve({ data: [] });
       });
   });
   ```

4. **Add per-file mocks** at the top (before imports of the component under test) for:
   - `react-big-calendar` — if the component or page renders CalendarView
   - `LocationAutocomplete` — if the component or page renders AddEventModal
   - `MediaRecorder` — if the component or page renders VoiceInput

5. **Write tests** using the Render -> Find -> Interact -> Assert pattern.

6. **Run the tests**:
   ```bash
   cd frontend && npm test tests/components/YourComponent.test.tsx
   ```

7. **Run the full suite** to check for regressions:
   ```bash
   cd frontend && npm test
   ```

---
**Last Updated**: 2026-02-15
