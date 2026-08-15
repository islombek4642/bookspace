# BookSpace Frontend (Telegram Mini App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React Telegram Mini App that lets a reader authenticate via Telegram, browse their Pinterest-style personal library, add books (search or manual), log a reading-journal entry (dates, notes, quotes, rating, favorite), and edit their profile.

**Architecture:** A Vite-built React + TypeScript SPA, structured as one feature folder per screen (`features/library`, `features/favorites`, `features/entry-editor`, `features/profile`), each with its own hook(s) and components talking to the backend through a single typed `apiClient`. `TelegramAuthProvider` authenticates on mount using the Telegram WebApp SDK's `initData` and gates the rest of the app behind that. All user-facing text is read from the same shared `/locales/uz.json` file the backend uses — never hardcoded.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, react-router-dom 6, Vitest + React Testing Library + `@testing-library/user-event` for tests, Telegram WebApp JS SDK.

**Reference spec:** `docs/superpowers/specs/2026-08-16-bookspace-mvp-design.md`
**Depends on:** the backend API defined in `docs/superpowers/plans/2026-08-16-bookspace-backend.md` (all endpoint paths, request/response shapes, and error format used below come from that plan).

**Note:** All commands below assume your shell's working directory is `frontend/` unless a different path is stated.

---

### Task 1: Vite + React + TypeScript + Tailwind scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/src/setupTests.ts`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/App.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the app shell", () => {
    render(<App />);
    expect(screen.getByText("BookSpace")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `package.json` / `vitest` don't exist yet, the command itself errors

- [ ] **Step 3: Create the scaffolding**

```json
// frontend/package.json
{
  "name": "bookspace-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.45",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "vitest": "^2.0.5"
  }
}
```

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // The shared /locales/uz.json file lives one level above this
    // project root, so the dev server needs permission to read it.
    fs: {
      allow: [".."],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
  },
});
```

```json
// frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```javascript
// frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```html
<!-- frontend/index.html -->
<!doctype html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BookSpace</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```typescript
// frontend/src/vite-env.d.ts
/// <reference types="vite/client" />
```

```typescript
// frontend/src/setupTests.ts
import "@testing-library/jest-dom/vitest";
```

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```typescript
// frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```typescript
// frontend/src/App.tsx
function App() {
  return <div className="min-h-screen bg-white text-gray-900">BookSpace</div>;
}

export default App;
```

- [ ] **Step 4: Install dependencies and run test to verify it passes**

Run: `npm install`
Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.json frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src/vite-env.d.ts frontend/src/setupTests.ts frontend/src/index.css frontend/src/main.tsx frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: scaffold Vite/React/TypeScript/Tailwind frontend project"
```

---

### Task 2: Locale loader (shared constants)

**Files:**
- Create: `frontend/src/i18n/locale.ts`
- Test: `frontend/src/i18n/locale.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/i18n/locale.test.ts
import { describe, expect, it } from "vitest";
import { t } from "./locale";

describe("t", () => {
  it("returns the known Uzbek message from the shared locale file", () => {
    expect(t("bot.start.button")).toBe("Kutubxonamni ochish");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./locale` module doesn't exist

- [ ] **Step 3: Implement the loader**

```typescript
// frontend/src/i18n/locale.ts
// Reads the same /locales/uz.json file the backend reads from, so there
// is a single source of truth for every user-facing string.
import messages from "../../../locales/uz.json";

type LocaleKey = keyof typeof messages;

export function t(key: LocaleKey): string {
  return messages[key];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n
git commit -m "feat: add locale loader reading the shared uz.json file"
```

---

### Task 3: API client

**Files:**
- Create: `frontend/.env.example`
- Create: `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/api/client.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError, setAuthToken } from "./client";

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAuthToken(null);
  });

  it("sends the Bearer token when one is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setAuthToken("test-token");

    await apiClient.get("/library");

    const [, options] = fetchMock.mock.calls[0];
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("throws ApiError with the backend's error_key on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error_key: "error.entry_not_found", message: "Yozuv topilmadi." }), {
        status: 404,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/entries/999")).rejects.toMatchObject({
      errorKey: "error.entry_not_found",
      status: 404,
    });
  });

  it("returns undefined for 204 No Content responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.delete("/entries/1/quotes/2");

    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./client` module doesn't exist

- [ ] **Step 3: Implement the client**

```text
# frontend/.env.example
VITE_API_BASE_URL=https://yourdomain.com
```

```typescript
// frontend/src/api/client.ts
export class ApiError extends Error {
  errorKey: string;
  status: number;

  constructor(errorKey: string, message: string, status: number) {
    super(message);
    this.errorKey = errorKey;
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function parseErrorBody(response: Response): Promise<{ error_key: string; message: string }> {
  try {
    return await response.json();
  } catch {
    return { error_key: "error.unknown", message: "Noma'lum xatolik" };
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.error_key, body.message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function uploadFile(path: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const headers = new Headers();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: formData, headers });
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.error_key, body.message, response.status);
  }
  return (await response.json()) as { url: string };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/.env.example frontend/src/api
git commit -m "feat: add typed API client with structured error handling"
```

---

### Task 4: Telegram WebApp authentication

**Files:**
- Create: `frontend/src/auth/TelegramAuthProvider.tsx`
- Test: `frontend/src/auth/TelegramAuthProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/auth/TelegramAuthProvider.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramAuthProvider, useAuth } from "./TelegramAuthProvider";

function StatusProbe() {
  const { status } = useAuth();
  return <div>status: {status}</div>;
}

describe("TelegramAuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup of a global we set in the test below
    delete window.Telegram;
  });

  it("authenticates using Telegram initData and exposes 'authenticated'", async () => {
    window.Telegram = { WebApp: { initData: "fake-init-data", ready: vi.fn(), expand: vi.fn() } };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ access_token: "token-123", token_type: "bearer" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TelegramAuthProvider>
        <StatusProbe />
      </TelegramAuthProvider>
    );

    await waitFor(() => expect(screen.getByText("status: authenticated")).toBeInTheDocument());
  });

  it("reports 'error' when Telegram initData is missing", async () => {
    render(
      <TelegramAuthProvider>
        <StatusProbe />
      </TelegramAuthProvider>
    );

    await waitFor(() => expect(screen.getByText("status: error")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./TelegramAuthProvider` module doesn't exist

- [ ] **Step 3: Implement the provider**

```typescript
// frontend/src/auth/TelegramAuthProvider.tsx
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiClient, setAuthToken } from "../api/client";

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

type AuthStatus = "loading" | "authenticated" | "error";

interface AuthContextValue {
  status: AuthStatus;
}

const AuthContext = createContext<AuthContextValue>({ status: "loading" });

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

interface TelegramAuthResponse {
  access_token: string;
  token_type: string;
}

export function TelegramAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData;

    if (!initData) {
      setStatus("error");
      return;
    }

    webApp?.ready();

    apiClient
      .post<TelegramAuthResponse>("/auth/telegram", { init_data: initData })
      .then((response) => {
        setAuthToken(response.access_token);
        setStatus("authenticated");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  return <AuthContext.Provider value={{ status }}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth
git commit -m "feat: authenticate against the backend using Telegram initData"
```

---

### Task 5: Library feature

**Files:**
- Create: `frontend/src/features/library/useLibrary.ts`
- Create: `frontend/src/features/library/LibraryCard.tsx`
- Create: `frontend/src/features/library/LibraryGrid.tsx`
- Create: `frontend/src/features/library/LibraryPage.tsx`
- Test: `frontend/src/features/library/LibraryPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/library/LibraryPage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryPage } from "./LibraryPage";

describe("LibraryPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders library items fetched from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            entry_id: 1,
            status: "reading",
            started_at: null,
            finished_at: null,
            rating: null,
            is_favorite: false,
            updated_at: "2026-01-01T00:00:00",
            book_id: 10,
            book_title: "Dune",
            book_author: "Frank Herbert",
            book_cover_url: null,
          },
        ]),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());
    expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no entries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Hali kitob qo'shilmagan.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./LibraryPage` module doesn't exist

- [ ] **Step 3: Implement the library feature**

```typescript
// frontend/src/features/library/useLibrary.ts
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface LibraryItem {
  entry_id: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  rating: number | null;
  is_favorite: boolean;
  updated_at: string;
  book_id: number;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
}

export function useLibrary(favoritesOnly = false) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    const query = favoritesOnly ? "?favorites_only=true" : "";
    apiClient
      .get<LibraryItem[]>(`/library${query}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(reload, [favoritesOnly]);

  return { items, loading, reload };
}
```

```typescript
// frontend/src/features/library/LibraryCard.tsx
import { Link } from "react-router-dom";
import { LibraryItem } from "./useLibrary";

export function LibraryCard({ item }: { item: LibraryItem }) {
  return (
    <Link
      to={`/entries/${item.entry_id}`}
      className="mb-4 block break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {item.book_cover_url && (
        <img src={item.book_cover_url} alt={item.book_title} className="w-full object-cover" />
      )}
      <div className="p-3">
        <p className="text-sm font-semibold">{item.book_title}</p>
        {item.book_author && <p className="text-xs text-gray-500">{item.book_author}</p>}
        {item.is_favorite && <span className="text-xs text-rose-500">★ Sevimli</span>}
      </div>
    </Link>
  );
}
```

```typescript
// frontend/src/features/library/LibraryGrid.tsx
import { LibraryItem } from "./useLibrary";
import { LibraryCard } from "./LibraryCard";

interface LibraryGridProps {
  items: LibraryItem[];
  emptyMessage: string;
}

export function LibraryGrid({ items, emptyMessage }: LibraryGridProps) {
  if (items.length === 0) {
    return <p className="p-4 text-center text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="columns-2 gap-4 p-4">
      {items.map((item) => (
        <LibraryCard key={item.entry_id} item={item} />
      ))}
    </div>
  );
}
```

```typescript
// frontend/src/features/library/LibraryPage.tsx
import { useLibrary } from "./useLibrary";
import { LibraryGrid } from "./LibraryGrid";

export function LibraryPage() {
  const { items, loading } = useLibrary(false);

  if (loading) {
    return <p className="p-4 text-center text-gray-500">Yuklanmoqda...</p>;
  }

  return <LibraryGrid items={items} emptyMessage="Hali kitob qo'shilmagan." />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/library
git commit -m "feat: add Pinterest-style library grid fetching /library"
```

---

### Task 6: Favorites feature

**Files:**
- Create: `frontend/src/features/favorites/FavoritesPage.tsx`
- Test: `frontend/src/features/favorites/FavoritesPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/favorites/FavoritesPage.test.tsx
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FavoritesPage } from "./FavoritesPage";

describe("FavoritesPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests only favorited entries from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("favorites_only=true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./FavoritesPage` module doesn't exist

- [ ] **Step 3: Implement the favorites page**

```typescript
// frontend/src/features/favorites/FavoritesPage.tsx
import { useLibrary } from "../library/useLibrary";
import { LibraryGrid } from "../library/LibraryGrid";

export function FavoritesPage() {
  const { items, loading } = useLibrary(true);

  if (loading) {
    return <p className="p-4 text-center text-gray-500">Yuklanmoqda...</p>;
  }

  return <LibraryGrid items={items} emptyMessage="Hali sevimli kitob belgilanmagan." />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/favorites
git commit -m "feat: add favorites page filtered via /library?favorites_only"
```

---

### Task 7: Add-book feature

**Files:**
- Create: `frontend/src/features/entry-editor/AddBookPage.tsx`
- Test: `frontend/src/features/entry-editor/AddBookPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/entry-editor/AddBookPage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddBookPage } from "./AddBookPage";

describe("AddBookPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to manual entry and navigates to the new entry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })) // search: no results
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 55, source: "manual", title: "Mening kitobim" }), { status: 200 })
      ) // manual book create
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 900 }), { status: 200 })); // entry create
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/add-book"]}>
        <Routes>
          <Route path="/add-book" element={<AddBookPage />} />
          <Route path="/entries/:id" element={<div>Entry page 900</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText("Kitob nomini kiriting"), "Noma'lum kitob");
    await user.click(screen.getByRole("button", { name: "Qidirish" }));

    await waitFor(() => expect(screen.getByText("Kitob topilmadi. Qo'lda qo'shing:")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Kitob nomi"), "Mening kitobim");
    await user.click(screen.getByRole("button", { name: "Qo'shish" }));

    await waitFor(() => expect(screen.getByText("Entry page 900")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./AddBookPage` module doesn't exist

- [ ] **Step 3: Implement the add-book page**

```typescript
// frontend/src/features/entry-editor/AddBookPage.tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, uploadFile } from "../../api/client";

interface BookSearchResult {
  external_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
}

interface Book {
  id: number;
  source: string;
  title: string;
}

interface Entry {
  id: number;
}

export function AddBookPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualCoverFile, setManualCoverFile] = useState<File | null>(null);

  async function startEntryFor(book: Book) {
    const entry = await apiClient.post<Entry>("/entries", { book_id: book.id, status: "reading" });
    navigate(`/entries/${entry.id}`);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const found = await apiClient.get<BookSearchResult[]>(`/catalog/search?q=${encodeURIComponent(query)}`);
    setResults(found);
    setSearched(true);
  }

  async function handleSelectResult(result: BookSearchResult) {
    const book = await apiClient.post<Book>("/catalog/books/from-search", result);
    await startEntryFor(book);
  }

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault();
    let coverUrl: string | null = null;
    if (manualCoverFile) {
      const uploaded = await uploadFile("/media/upload", manualCoverFile);
      coverUrl = uploaded.url;
    }
    const book = await apiClient.post<Book>("/catalog/books/manual", {
      title: manualTitle,
      author: manualAuthor || null,
      cover_url: coverUrl,
    });
    await startEntryFor(book);
  }

  return (
    <div className="space-y-6 p-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kitob nomini kiriting"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-white">
          Qidirish
        </button>
      </form>

      <ul className="space-y-2">
        {results.map((result) => (
          <li key={result.external_id}>
            <button
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
            >
              <p className="font-semibold">{result.title}</p>
              {result.author && <p className="text-sm text-gray-500">{result.author}</p>}
            </button>
          </li>
        ))}
      </ul>

      {searched && results.length === 0 && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-gray-600">Kitob topilmadi. Qo'lda qo'shing:</p>
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="Kitob nomi"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              value={manualAuthor}
              onChange={(event) => setManualAuthor(event.target.value)}
              placeholder="Muallif"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setManualCoverFile(event.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-white">
              Qo'shish
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/entry-editor/AddBookPage.tsx frontend/src/features/entry-editor/AddBookPage.test.tsx
git commit -m "feat: add book search with manual-entry fallback"
```

---

### Task 8: Entry detail and editor

**Files:**
- Create: `frontend/src/features/entry-editor/useEntryDetail.ts`
- Create: `frontend/src/features/entry-editor/EntryDetailPage.tsx`
- Test: `frontend/src/features/entry-editor/EntryDetailPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/entry-editor/EntryDetailPage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntryDetailPage } from "./EntryDetailPage";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("EntryDetailPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads entry, book, and quotes, then saves edits", async () => {
    const entry = {
      id: 1,
      user_id: 1,
      book_id: 10,
      status: "reading",
      started_at: null,
      finished_at: null,
      characters_notes: null,
      personal_thoughts: null,
      rating: null,
      is_favorite: false,
      created_at: "2026-01-01T00:00:00",
      updated_at: "2026-01-01T00:00:00",
    };
    const book = {
      id: 10,
      source: "manual",
      external_id: null,
      title: "Dune",
      author: "Frank Herbert",
      cover_url: null,
      description: null,
    };
    const updatedEntry = { ...entry, personal_thoughts: "Juda kuchli" };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(entry)) // GET /entries/1
      .mockResolvedValueOnce(jsonResponse(book)) // GET /catalog/books/10
      .mockResolvedValueOnce(jsonResponse([])) // GET /entries/1/quotes
      .mockResolvedValueOnce(jsonResponse(updatedEntry)) // PATCH /entries/1
      .mockResolvedValueOnce(jsonResponse(updatedEntry)) // reload: GET /entries/1
      .mockResolvedValueOnce(jsonResponse(book)) // reload: GET /catalog/books/10
      .mockResolvedValueOnce(jsonResponse([])); // reload: GET /entries/1/quotes
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/entries/1"]}>
        <Routes>
          <Route path="/entries/:id" element={<EntryDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Dune")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("Shaxsiy fikringiz"), "Juda kuchli");
    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./EntryDetailPage` module doesn't exist

- [ ] **Step 3: Implement the hook and page**

```typescript
// frontend/src/features/entry-editor/useEntryDetail.ts
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface Entry {
  id: number;
  user_id: number;
  book_id: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  characters_notes: string | null;
  personal_thoughts: string | null;
  rating: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  source: string;
  external_id: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
}

export interface Quote {
  id: number;
  entry_id: number;
  text: string;
  sort_order: number;
  created_at: string;
}

export function useEntryDetail(entryId: number) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const fetchedEntry = await apiClient.get<Entry>(`/entries/${entryId}`);
    const [fetchedBook, fetchedQuotes] = await Promise.all([
      apiClient.get<Book>(`/catalog/books/${fetchedEntry.book_id}`),
      apiClient.get<Quote[]>(`/entries/${entryId}/quotes`),
    ]);
    setEntry(fetchedEntry);
    setBook(fetchedBook);
    setQuotes(fetchedQuotes);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  return { entry, book, quotes, loading, reload };
}
```

```typescript
// frontend/src/features/entry-editor/EntryDetailPage.tsx
import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useEntryDetail } from "./useEntryDetail";

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const entryId = Number(id);
  const { entry, book, loading, reload } = useEntryDetail(entryId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !entry || !book) {
    return <p className="p-4 text-center text-gray-500">Yuklanmoqda...</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      status: formData.get("status") as string,
      started_at: (formData.get("started_at") as string) || null,
      finished_at: (formData.get("finished_at") as string) || null,
      characters_notes: (formData.get("characters_notes") as string) || null,
      personal_thoughts: (formData.get("personal_thoughts") as string) || null,
      rating: formData.get("rating") ? Number(formData.get("rating")) : null,
      is_favorite: formData.get("is_favorite") === "on",
    };

    try {
      await apiClient.patch(`/entries/${entryId}`, payload);
      await reload();
    } catch {
      setError("Kiritilgan ma'lumotlar noto'g'ri.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">{book.title}</h1>
        {book.author && <p className="text-gray-500">{book.author}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <select
          name="status"
          defaultValue={entry.status}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="planned">Rejalashtirilgan</option>
          <option value="reading">O'qilmoqda</option>
          <option value="finished">Tugallandi</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            name="started_at"
            defaultValue={entry.started_at ?? ""}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="date"
            name="finished_at"
            defaultValue={entry.finished_at ?? ""}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <textarea
          name="characters_notes"
          defaultValue={entry.characters_notes ?? ""}
          placeholder="Asosiy qahramonlar"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />

        <textarea
          name="personal_thoughts"
          defaultValue={entry.personal_thoughts ?? ""}
          placeholder="Shaxsiy fikringiz"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />

        <select
          name="rating"
          defaultValue={entry.rating ?? ""}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">Baho yo'q</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_favorite" defaultChecked={entry.is_favorite} />
          Sevimlilarga qo'shish
        </label>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Saqlash
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/entry-editor/useEntryDetail.ts frontend/src/features/entry-editor/EntryDetailPage.tsx frontend/src/features/entry-editor/EntryDetailPage.test.tsx
git commit -m "feat: add entry detail page for editing journal fields"
```

---

### Task 9: Quotes management

**Files:**
- Create: `frontend/src/features/entry-editor/QuoteList.tsx`
- Modify: `frontend/src/features/entry-editor/EntryDetailPage.tsx`
- Test: `frontend/src/features/entry-editor/QuoteList.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/entry-editor/QuoteList.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuoteList } from "./QuoteList";

describe("QuoteList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds a quote and calls onChange", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, entry_id: 5, text: "Yangi so'z", sort_order: 0, created_at: "2026-01-01" }), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<QuoteList entryId={5} quotes={[]} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText("Yangi iqtibos"), "Yangi so'z");
    await user.click(screen.getByRole("button", { name: "Qo'shish" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/entries/5/quotes"),
      expect.objectContaining({ method: "POST" })
    );
    expect(onChange).toHaveBeenCalled();
  });

  it("deletes a quote and calls onChange", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <QuoteList
        entryId={5}
        quotes={[{ id: 9, entry_id: 5, text: "Eski iqtibos", sort_order: 0, created_at: "2026-01-01" }]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "O'chirish" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/entries/5/quotes/9"),
      expect.objectContaining({ method: "DELETE" })
    );
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./QuoteList` module doesn't exist

- [ ] **Step 3: Implement QuoteList and wire it into the entry page**

```typescript
// frontend/src/features/entry-editor/QuoteList.tsx
import { FormEvent, useState } from "react";
import { apiClient } from "../../api/client";
import { Quote } from "./useEntryDetail";

interface QuoteListProps {
  entryId: number;
  quotes: Quote[];
  onChange: () => void;
}

export function QuoteList({ entryId, quotes, onChange }: QuoteListProps) {
  const [text, setText] = useState("");

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    await apiClient.post(`/entries/${entryId}/quotes`, { text, sort_order: quotes.length });
    setText("");
    onChange();
  }

  async function handleDelete(quoteId: number) {
    await apiClient.delete(`/entries/${entryId}/quotes/${quoteId}`);
    onChange();
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Iqtiboslar</h2>
      <ul className="space-y-2">
        {quotes.map((quote) => (
          <li key={quote.id} className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 p-3">
            <p className="italic">&quot;{quote.text}&quot;</p>
            <button type="button" onClick={() => handleDelete(quote.id)} className="text-sm text-red-500">
              O'chirish
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Yangi iqtibos"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-white">
          Qo'shish
        </button>
      </form>
    </div>
  );
}
```

```typescript
// frontend/src/features/entry-editor/EntryDetailPage.tsx  (add the import and render QuoteList below the form)
import { QuoteList } from "./QuoteList";
```

Add `const { entry, book, quotes, loading, reload } = useEntryDetail(entryId);` (destructure `quotes` too) and render `<QuoteList entryId={entryId} quotes={quotes} onChange={reload} />` immediately after the closing `</form>` tag, before the closing `</div>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all `QuoteList` and `EntryDetailPage` tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/entry-editor
git commit -m "feat: add structured quote list to the entry detail page"
```

---

### Task 10: Profile feature

**Files:**
- Create: `frontend/src/features/profile/ProfilePage.tsx`
- Test: `frontend/src/features/profile/ProfilePage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/profile/ProfilePage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("ProfilePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and saves the profile", async () => {
    const profile = {
      id: 1,
      username: "reader",
      display_name: "Aziz",
      avatar_url: null,
      bio: null,
      reading_since: null,
      favorite_genre_keys: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(profile))
      .mockResolvedValueOnce(jsonResponse({ ...profile, bio: "Fantastika sevaman" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText("Aziz")).toBeInTheDocument());

    await user.type(
      screen.getByPlaceholderText("O'zingiz haqingizda qisqacha yozing..."),
      "Fantastika sevaman"
    );
    await user.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, options] = fetchMock.mock.calls[1];
    expect(options.method).toBe("PATCH");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./ProfilePage` module doesn't exist

- [ ] **Step 3: Implement the profile page**

```typescript
// frontend/src/features/profile/ProfilePage.tsx
import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../api/client";

interface Profile {
  id: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reading_since: string | null;
  favorite_genre_keys: string[];
}

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get<Profile>("/users/me").then(setProfile);
  }, []);

  if (!profile) {
    return <p className="p-4 text-center text-gray-500">Yuklanmoqda...</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const genreKeys = (formData.get("favorite_genre_keys") as string)
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);

    const updated = await apiClient.patch<Profile>("/users/me", {
      bio: (formData.get("bio") as string) || null,
      reading_since: (formData.get("reading_since") as string) || null,
      favorite_genre_keys: genreKeys,
    });
    setProfile(updated);
    setSaving(false);
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">{profile.display_name ?? profile.username}</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          placeholder="O'zingiz haqingizda qisqacha yozing..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          name="reading_since"
          defaultValue={profile.reading_since ?? ""}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          name="favorite_genre_keys"
          defaultValue={profile.favorite_genre_keys.join(", ")}
          placeholder="fantasy, classic"
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Saqlash
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/profile
git commit -m "feat: add profile view/edit page"
```

---

### Task 11: Toast notifications

**Files:**
- Create: `frontend/src/components/ToastProvider.tsx`
- Test: `frontend/src/components/ToastProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/components/ToastProvider.test.tsx
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastProvider";

function Trigger() {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast("Xatolik yuz berdi")}>
      Trigger
    </button>
  );
}

describe("ToastProvider", () => {
  it("shows and then auto-hides a toast message", async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "Trigger" }).click();
    });
    expect(screen.getByText("Xatolik yuz berdi")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Xatolik yuz berdi")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `./ToastProvider` module doesn't exist

- [ ] **Step 3: Implement the provider**

```typescript
// frontend/src/components/ToastProvider.tsx
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-white shadow-lg">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ToastProvider.tsx frontend/src/components/ToastProvider.test.tsx
git commit -m "feat: add toast notification provider"
```

---

### Task 12: App shell, routing, and production build verification

**Files:**
- Create: `frontend/src/components/BottomNav.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/App.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup of a global we set in the test below
    delete window.Telegram;
  });

  it("shows the session-expired message when there is no Telegram initData", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText("Sessiya eskirgan, ilovani qayta oching.")).toBeInTheDocument()
    );
  });

  it("renders the library page once Telegram authentication succeeds", async () => {
    window.Telegram = { WebApp: { initData: "fake-init-data", ready: vi.fn(), expand: vi.fn() } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token", token_type: "bearer" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByText("Hali kitob qo'shilmagan.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `App.tsx` still renders the plain "BookSpace" placeholder from Task 1, none of the new text appears

- [ ] **Step 3: Implement the app shell**

```typescript
// frontend/src/components/BottomNav.tsx
import { Link } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-200 bg-white py-2">
      <Link to="/" className="text-sm">
        Kutubxona
      </Link>
      <Link to="/add-book" className="text-sm font-semibold">
        + Qo'shish
      </Link>
      <Link to="/favorites" className="text-sm">
        Sevimlilar
      </Link>
      <Link to="/profile" className="text-sm">
        Profil
      </Link>
    </nav>
  );
}
```

```typescript
// frontend/src/App.tsx
import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TelegramAuthProvider, useAuth } from "./auth/TelegramAuthProvider";
import { ToastProvider } from "./components/ToastProvider";
import { BottomNav } from "./components/BottomNav";
import { LibraryPage } from "./features/library/LibraryPage";
import { FavoritesPage } from "./features/favorites/FavoritesPage";
import { AddBookPage } from "./features/entry-editor/AddBookPage";
import { EntryDetailPage } from "./features/entry-editor/EntryDetailPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { t } from "./i18n/locale";

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <p className="p-4 text-center text-gray-500">Yuklanmoqda...</p>;
  }

  if (status === "error") {
    return <p className="p-4 text-center text-red-600">{t("error.session_expired")}</p>;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen pb-16">
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/add-book" element={<AddBookPage />} />
        <Route path="/entries/:id" element={<EntryDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <TelegramAuthProvider>
        <BrowserRouter>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </BrowserRouter>
      </TelegramAuthProvider>
    </ToastProvider>
  );
}

export default App;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — entire suite passes

- [ ] **Step 5: Verify the production build**

Run: `npm run build`
Expected: succeeds, producing a `dist/` directory containing `index.html` and hashed asset files (`dist/` is already gitignored by the root `.gitignore` from the backend plan's Task 1)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BottomNav.tsx frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: wire routing, auth gate, and bottom navigation into App shell"
```

---

## What this plan does not cover

- The `backend/` API this frontend calls (separate plan: `docs/superpowers/plans/2026-08-16-bookspace-backend.md`).
- Serving the built `dist/` output from the production server and obtaining SSL via the shared `nginx-proxy`/`acme-companion` setup (separate plan: `docs/superpowers/plans/<date>-bookspace-deployment.md`).
- Social/discovery screens (other users' profiles, recommendations) — explicitly deferred past MVP per the spec.
- Multi-language UI switching — the locale file only has `uz.json` for MVP; the `t()` loader is already structured so adding a language later requires no frontend code changes beyond a language switch.
