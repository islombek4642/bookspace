import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, uploadFile } from "../../api/client";

interface BookSearchResult {
  external_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
}

interface Book {
  id: number;
  source: string;
  title: string;
}

interface Entry {
  id: number;
}

export function AddBookPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualCoverFile, setManualCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startEntryFor(book: Book) {
    const entry = await apiClient.post<Entry>("/entries", { book_id: book.id, status: "reading" });
    navigate(`/read/${entry.id}`);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const found = await apiClient.get<BookSearchResult[]>(`/catalog/search?q=${encodeURIComponent(query)}`);
      setResults(found);
      setSearched(true);
    } catch {
      setError("Qidiruvda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectResult(result: BookSearchResult) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const book = await apiClient.post<Book>("/catalog/books/from-search", result);
      await startEntryFor(book);
    } catch {
      setError("Kitobni qo'shishda xatolik yuz berdi.");
      setSubmitting(false);
    }
  }

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let coverUrl: string | null = null;
      if (manualCoverFile) {
        const uploaded = await uploadFile("/media/upload", manualCoverFile);
        coverUrl = uploaded.url;
      }
      const book = await apiClient.post<Book>("/catalog/books/manual", {
        title: manualTitle,
        author: manualAuthor || null,
        cover_url: coverUrl,
      });
      await startEntryFor(book);
    } catch {
      setError("Kitobni qo'shishda xatolik yuz berdi.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4">
      <form onSubmit={handleSearch} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="search-query" className="mb-1 block text-sm font-medium text-stone-700">
            Kitob qidirish
          </label>
          <input
            id="search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kitob nomini kiriting"
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
        >
          Qidirish
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      <ul className="space-y-2">
        {results.map((result) => (
          <li key={result.external_id}>
            <button
              type="button"
              onClick={() => handleSelectResult(result)}
              disabled={submitting}
              className="w-full rounded-lg border border-stone-200 p-3 text-left hover:bg-stone-100 disabled:opacity-50"
            >
              <p className="font-semibold">{result.title}</p>
              {result.author && <p className="text-sm text-stone-500">{result.author}</p>}
            </button>
          </li>
        ))}
      </ul>

      {searched && results.length === 0 && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-stone-600">Kitob topilmadi. Qo'lda qo'shing:</p>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label htmlFor="manual-title" className="mb-1 block text-sm font-medium text-stone-700">
                Kitob nomi
              </label>
              <input
                id="manual-title"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="Kitob nomi"
                required
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="manual-author" className="mb-1 block text-sm font-medium text-stone-700">
                Muallif
              </label>
              <input
                id="manual-author"
                value={manualAuthor}
                onChange={(event) => setManualAuthor(event.target.value)}
                placeholder="Muallif"
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="manual-cover" className="mb-1 block text-sm font-medium text-stone-700">
                Muqova rasmi (ixtiyoriy)
              </label>
              <input
                id="manual-cover"
                type="file"
                accept="image/*"
                onChange={(event) => setManualCoverFile(event.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
            >
              Qo'shish
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
