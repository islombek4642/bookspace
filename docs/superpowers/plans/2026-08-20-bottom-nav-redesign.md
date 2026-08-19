# Bottom Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the bottom navigation bar as 5 uniform icon-based items with a floating amber indicator circle that slides to the active tab and visually "cuts into" the bar, replacing the current 2+2 text-link layout with its separately-elevated add button.

**Architecture:** Single-component rewrite (`BottomNav.tsx`) — no routing changes, no backend involvement. A new npm dependency (`lucide-react`) supplies icons. The floating indicator's position is computed from the current route via `useLocation()` and expressed as a CSS `left` percentage; the "notch" cutout effect is built entirely with Tailwind's `before:`/`after:` pseudo-element utilities (no new global CSS needed).

**Tech Stack:** React, TypeScript, react-router-dom, Tailwind CSS, lucide-react (new), Vitest + RTL.

**Reference spec:** `docs/superpowers/specs/2026-08-20-bottom-nav-redesign.md`
**Reference design source:** `D:\BookSpace\magic navigation menu indicator\` (index.html/style.css/script.js — a third-party CodePen-style tutorial the user found; used only for the visual mechanic, not copied verbatim, since it targets a dark/gradient theme with vanilla JS click-toggling instead of this app's route-driven React state).

**Note:** All commands below assume your shell's working directory is `D:\BookSpace\frontend` unless stated otherwise.

---

### Task 1: Rebuild `BottomNav` with the floating-indicator design

**Files:**
- Modify: `frontend/package.json` (add `lucide-react` dependency, via `npm install`, not hand-edited)
- Modify: `frontend/src/components/BottomNav.tsx` (full rewrite)
- Modify: `frontend/src/components/BottomNav.test.tsx` (full rewrite)

- [ ] **Step 1: Install the icon library**

Run: `cd frontend && npm install lucide-react`
Expected: `lucide-react` appears under `dependencies` in `frontend/package.json`, `package-lock.json` updates, install completes with no errors.

- [ ] **Step 2: Write the failing tests**

Replace the full contents of `frontend/src/components/BottomNav.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";

function renderAt(path: string) {
  render(<BottomNav />, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  });
}

describe("BottomNav", () => {
  it("shows all 5 nav links with correct destinations", () => {
    renderAt("/");

    expect(screen.getByRole("link", { name: "Kutubxona" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Reyting" })).toHaveAttribute("href", "/rating");
    expect(screen.getByRole("link", { name: "Qo'shish" })).toHaveAttribute("href", "/add-book");
    expect(screen.getByRole("link", { name: "Sevimlilar" })).toHaveAttribute("href", "/favorites");
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/profile");
  });

  it("marks the library link active when on the root route", () => {
    renderAt("/");

    const activeLabel = screen.getByRole("link", { name: "Kutubxona" }).querySelector("span");
    const inactiveLabel = screen.getByRole("link", { name: "Reyting" }).querySelector("span");
    expect(activeLabel).toHaveClass("opacity-100");
    expect(inactiveLabel).toHaveClass("opacity-0");
  });

  it("marks the favorites link active when on /favorites", () => {
    renderAt("/favorites");

    const activeLabel = screen.getByRole("link", { name: "Sevimlilar" }).querySelector("span");
    const inactiveLabel = screen.getByRole("link", { name: "Kutubxona" }).querySelector("span");
    expect(activeLabel).toHaveClass("opacity-100");
    expect(inactiveLabel).toHaveClass("opacity-0");
  });

  it("shows the floating indicator when the route matches a nav item", () => {
    renderAt("/profile");
    expect(screen.getByTestId("nav-indicator")).toBeInTheDocument();
  });

  it("hides the floating indicator on a route with no matching nav item", () => {
    renderAt("/read/42");
    expect(screen.queryByTestId("nav-indicator")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --run BottomNav`
Expected: FAIL — the current `BottomNav.tsx` doesn't render a `data-testid="nav-indicator"` element, doesn't render each label inside a `<span>` with opacity classes, and its existing single test (now replaced) assumed the old 2+2 layout.

- [ ] **Step 4: Rewrite `BottomNav.tsx`**

Replace the full contents of `frontend/src/components/BottomNav.tsx`:

```typescript
import { BarChart3, Heart, Library, LucideIcon, Plus, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

interface NavItemConfig {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { to: "/", label: "Kutubxona", icon: Library },
  { to: "/rating", label: "Reyting", icon: BarChart3 },
  { to: "/add-book", label: "Qo'shish", icon: Plus },
  { to: "/favorites", label: "Sevimlilar", icon: Heart },
  { to: "/profile", label: "Profil", icon: User },
];

function isItemActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname === to;
}

function NavItem({ to, label, icon: Icon, active }: NavItemConfig & { active: boolean }) {
  return (
    <NavLink to={to} aria-label={label} className="relative flex flex-col items-center justify-center">
      <Icon
        className={`h-6 w-6 transition-transform duration-500 ${
          active ? "-translate-y-7 text-white" : "text-stone-500"
        }`}
      />
      <span
        className={`text-[10px] font-semibold text-amber-800 transition-opacity duration-500 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        {label}
      </span>
    </NavLink>
  );
}

export function BottomNav() {
  const location = useLocation();
  const activeIndex = NAV_ITEMS.findIndex((item) => isItemActive(location.pathname, item.to));

  return (
    <nav className="relative grid h-16 grid-cols-5 rounded-t-2xl border-t border-stone-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {activeIndex !== -1 && (
        <div
          data-testid="nav-indicator"
          className="pointer-events-none absolute -top-7 h-14 w-14 -translate-x-1/2 rounded-full border-[6px] border-stone-50 bg-amber-800 shadow-lg transition-[left] duration-500 before:absolute before:top-1/2 before:-left-[18px] before:h-4 before:w-4 before:rounded-tr-2xl before:shadow-[1px_-8px_0_theme(colors.stone.50)] before:content-[''] after:absolute after:top-1/2 after:-right-[18px] after:h-4 after:w-4 after:rounded-tl-2xl after:shadow-[-1px_-8px_0_theme(colors.stone.50)] after:content-['']"
          style={{ left: `calc(20% * ${activeIndex} + 10%)` }}
        />
      )}

      {NAV_ITEMS.map((item, index) => (
        <NavItem key={item.to} {...item} active={index === activeIndex} />
      ))}
    </nav>
  );
}
```

Two things worth understanding about this code:
- `activeIndex` drives both the indicator's horizontal position (`left: calc(20% * index + 10%)`, centering it within whichever of the 5 equal 20%-wide grid columns is active) and each `NavItem`'s active styling — single source of truth, no per-item route-matching duplicated.
- The "cut into the bar" notch is the `before:`/`after:` block on the indicator `<div>`: two small pseudo-elements positioned at the indicator's left/right base, each using a `box-shadow` offset colored to match the page background (`theme(colors.stone.50)`, i.e. the same color `body` is set to in `index.css`) rather than the bar's own `white` background — because the indicator sits astride the bar's top edge and page background, not fully inside the bar.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- --run BottomNav`
Expected: all 5 tests in `BottomNav.test.tsx` PASS.

Run: `cd frontend && npm test -- --run`
Expected: all test files pass.

- [ ] **Step 6: Typecheck and build**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

Run: `cd frontend && npm run build`
Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/BottomNav.tsx frontend/src/components/BottomNav.test.tsx
git commit -m "feat: rebuild bottom nav with a floating active-tab indicator"
```

---

## What this plan does not cover

- Visual verification on a real device/Telegram WebView — jsdom (used by the test suite) does not compute real CSS layout, transforms, or `box-shadow` rendering, so the "notch cutout" effect's actual pixel-level appearance can only be confirmed by the user after deployment, the same way the earlier monthly-chart bar-height bug was only caught by a real screenshot, not by tests.
- A fallback to a simpler shadow-only floating circle (no notch cutout) if the box-shadow technique proves visually unstable across screen widths — per the design spec, this is a contingency to raise with the user (with a screenshot) only if the notch effect looks wrong in practice, not something to pre-build speculatively.
- Any change to routing, page content, or components other than `BottomNav.tsx`.
