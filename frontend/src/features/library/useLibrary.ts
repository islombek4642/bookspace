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
  const [error, setError] = useState(false);

  function reload() {
    setLoading(true);
    setError(false);
    const query = favoritesOnly ? "?favorites_only=true" : "";
    apiClient
      .get<LibraryItem[]>(`/library${query}`)
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);
    const query = favoritesOnly ? "?favorites_only=true" : "";
    apiClient
      .get<LibraryItem[]>(`/library${query}`)
      .then((data) => {
        if (!ignore) setItems(data);
      })
      .catch(() => {
        if (!ignore) setError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [favoritesOnly]);

  return { items, loading, error, reload };
}
