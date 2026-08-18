import { Link } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-stone-200 bg-white py-2">
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
