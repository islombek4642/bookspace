import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface LibraryItem {
  entry_id: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  rating: number | null;
  is_favorite: boolean;
  updated_at: string;
  book_id: number;
  book_title: string;
  book_author: string | null;
  book_cover_url: string | null;
}

export function useLibrary(favoritesOnly = false) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    const query = favoritesOnly ? "?favorites_only=true" : "";
    apiClient
      .get<LibraryItem[]>(`/library${query}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(reload, [favoritesOnly]);

  return { items, loading, reload };
}
