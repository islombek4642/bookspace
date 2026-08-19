import { NavLink } from "react-router-dom";

const LEFT_ITEMS = [
  { to: "/", label: "Kutubxona" },
  { to: "/rating", label: "Reyting" },
];

const RIGHT_ITEMS = [
  { to: "/favorites", label: "Sevimlilar" },
  { to: "/profile", label: "Profil" },
];

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
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
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex items-center rounded-t-2xl border-t border-stone-200 bg-white px-2 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex flex-1 justify-around">
        {LEFT_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>

      <NavLink
        to="/add-book"
        aria-label="Qo'shish"
        className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-800 text-white shadow-lg transition-transform hover:bg-amber-900 active:scale-95"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-7 w-7">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </NavLink>

      <div className="flex flex-1 justify-around">
        {RIGHT_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}
