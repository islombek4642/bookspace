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
    <NavLink
      to={to}
      aria-label={label}
      className="relative flex flex-col items-center justify-center transition-transform active:scale-95"
    >
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

const COLUMN_WIDTH_PERCENT = 100 / NAV_ITEMS.length;

export function BottomNav() {
  const location = useLocation();
  const activeIndex = NAV_ITEMS.findIndex((item) => isItemActive(location.pathname, item.to));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid h-16 grid-cols-5 rounded-t-2xl border-t border-stone-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {activeIndex !== -1 && (
        // A plain floating circle, no notch cutout -- the box-shadow-based
        // "bar cuts open around the circle" trick from the reference design
        // didn't translate cleanly to this app's light/near-white palette
        // (low contrast between bg-white and the page's bg-stone-50 made
        // the geometry hard to get right, and a visual check on a real
        // device showed a stray ring artifact instead of a smooth blend).
        // This simpler version keeps the core effect the user wanted --
        // the active tab's icon floating up into a sliding amber circle --
        // without the fragile cutout.
        <div
          data-testid="nav-indicator"
          className="pointer-events-none absolute -top-7 h-14 w-14 -translate-x-1/2 rounded-full border-[5px] border-stone-50 bg-amber-800 shadow-lg transition-[left] duration-500"
          style={{ left: `calc(${COLUMN_WIDTH_PERCENT}% * ${activeIndex} + ${COLUMN_WIDTH_PERCENT / 2}%)` }}
        />
      )}

      {NAV_ITEMS.map((item, index) => (
        <NavItem key={item.to} {...item} active={index === activeIndex} />
      ))}
    </nav>
  );
}
