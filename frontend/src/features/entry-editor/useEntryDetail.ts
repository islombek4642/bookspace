import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface Entry {
  id: number;
  user_id: number;
  book_id: number;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  characters_notes: string | null;
  personal_thoughts: string | null;
  rating: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  source: string;
  external_id: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
}

export interface Quote {
  id: number;
  entry_id: number;
  text: string;
  sort_order: number;
  created_at: string;
}

export function useEntryDetail(entryId: number) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function reload() {
    setLoading(true);
    setError(false);
    try {
      const fetchedEntry = await apiClient.get<Entry>(`/entries/${entryId}`);
      const [fetchedBook, fetchedQuotes] = await Promise.all([
        apiClient.get<Book>(`/catalog/books/${fetchedEntry.book_id}`),
        apiClient.get<Quote[]>(`/entries/${entryId}/quotes`),
      ]);
      setEntry(fetchedEntry);
      setBook(fetchedBook);
      setQuotes(fetchedQuotes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const fetchedEntry = await apiClient.get<Entry>(`/entries/${entryId}`);
        const [fetchedBook, fetchedQuotes] = await Promise.all([
          apiClient.get<Book>(`/catalog/books/${fetchedEntry.book_id}`),
          apiClient.get<Quote[]>(`/entries/${entryId}/quotes`),
        ]);
        if (ignore) return;
        setEntry(fetchedEntry);
        setBook(fetchedBook);
        setQuotes(fetchedQuotes);
      } catch {
        if (!ignore) setError(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [entryId]);

  return { entry, book, quotes, loading, error, reload };
}
