import { Link } from "react-router-dom";
import { LibraryItem } from "./useLibrary";

export function LibraryCard({ item }: { item: LibraryItem }) {
  return (
    <Link
      to={`/read/${item.entry_id}`}
      className="mb-4 block break-inside-avoid overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {item.book_cover_url && (
        <img
          src={item.book_cover_url}
          alt={item.book_title}
          className="w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className="p-3">
        <p className="text-sm font-semibold text-stone-900">{item.book_title}</p>
        {item.book_author && <p className="text-xs text-stone-500">{item.book_author}</p>}
        {item.is_favorite && <span className="text-xs text-amber-700">★ Sevimli</span>}
      </div>
    </Link>
  );
}
