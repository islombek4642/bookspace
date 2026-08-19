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
