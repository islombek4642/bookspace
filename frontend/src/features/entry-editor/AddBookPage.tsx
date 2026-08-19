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

function SearchResultCover({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (coverUrl && !imgFailed) {
    return (
      <img
        src={coverUrl}
        alt={title}
        className="h-16 w-12 shrink-0 rounded-md object-cover shadow-sm"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H19" />
      </svg>
    </div>
  );
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
  const [selectedResult, setSelectedResult] = useState<BookSearchResult | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("reading");
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualCoverFile, setManualCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startEntryFor(book: Book, status: string) {
    await apiClient.post<Entry>("/entries", { book_id: book.id, status });
    navigate("/");
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

  function handlePickResult(result: BookSearchResult) {
    setError(null);
    setSelectedStatus("reading");
    setSelectedResult(result);
  }

  async function handleConfirmSelection() {
    if (submitting || !selectedResult) return;
    setSubmitting(true);
    setError(null);
    try {
      const book = await apiClient.post<Book>("/catalog/books/from-search", selectedResult);
      await startEntryFor(book, selectedStatus);
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
      await startEntryFor(book, "reading");
    } catch {
      setError("Kitobni qo'shishda xatolik yuz berdi.");
      setSubmitting(false);
    }
  }

  if (selectedResult) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
          <SearchResultCover coverUrl={selectedResult.cover_url} title={selectedResult.title} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{selectedResult.title}</p>
            {selectedResult.author && <p className="text-sm text-stone-500">{selectedResult.author}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="selected-status" className="mb-1 block text-sm font-medium text-stone-700">
            Holat
          </label>
          <select
            id="selected-status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          >
            <option value="planned">Rejalashtirilgan</option>
            <option value="reading">O'qilmoqda</option>
            <option value="finished">Tugallandi</option>
          </select>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSelectedResult(null);
            }}
            disabled={submitting}
            className="flex-1 rounded-full border border-stone-300 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleConfirmSelection}
            disabled={submitting}
            className="flex-1 rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
          >
            Saqlash
          </button>
        </div>
      </div>
    );
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
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
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
              onClick={() => handlePickResult(result)}
              disabled={submitting}
              className="flex w-full items-center gap-3 rounded-xl border border-stone-200 p-3 text-left hover:bg-stone-100 disabled:opacity-50"
            >
              <SearchResultCover coverUrl={result.cover_url} title={result.title} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{result.title}</p>
                {result.author && <p className="text-sm text-stone-500">{result.author}</p>}
              </div>
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
                className="w-full rounded-xl border border-stone-300 px-3 py-2"
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
                className="w-full rounded-xl border border-stone-300 px-3 py-2"
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
