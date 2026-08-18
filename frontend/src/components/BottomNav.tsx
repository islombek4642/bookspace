import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "Kutubxona" },
  { to: "/add-book", label: "Qo'shish" },
  { to: "/favorites", label: "Sevimlilar" },
  { to: "/profile", label: "Profil" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around gap-1 border-t border-stone-200 bg-white px-2 py-2">
      {ITEMS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `rounded-full px-3 py-1.5 text-sm transition-colors ${
              isActive ? "bg-amber-50 font-semibold text-amber-800" : "text-stone-500"
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
