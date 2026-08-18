import { useLibrary } from "./useLibrary";
import { LibraryGrid } from "./LibraryGrid";

export function LibraryPage() {
  const { items, loading, error } = useLibrary(false);

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error) {
    return <p className="p-4 text-center text-stone-500">Kutubxonani yuklab bo'lmadi.</p>;
  }

  return <LibraryGrid items={items} emptyMessage="Hali kitob qo'shilmagan." />;
}
