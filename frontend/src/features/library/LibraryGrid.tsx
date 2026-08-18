import { LibraryItem } from "./useLibrary";
import { LibraryCard } from "./LibraryCard";

interface LibraryGridProps {
  items: LibraryItem[];
  emptyMessage: string;
}

export function LibraryGrid({ items, emptyMessage }: LibraryGridProps) {
  if (items.length === 0) {
    return <p className="p-4 text-center text-stone-500">{emptyMessage}</p>;
  }

  return (
    <div className="columns-2 gap-4 p-4">
      {items.map((item) => (
        <LibraryCard key={item.entry_id} item={item} />
      ))}
    </div>
  );
}
