import { useLibrary } from "../library/useLibrary";
import { LibraryGrid } from "../library/LibraryGrid";

export function FavoritesPage() {
  const { items, loading, error } = useLibrary(true);

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error) {
    return <p className="p-4 text-center text-stone-500">Kutubxonani yuklab bo'lmadi.</p>;
  }

  return <LibraryGrid items={items} emptyMessage="Hali sevimli kitob belgilanmagan." />;
}
