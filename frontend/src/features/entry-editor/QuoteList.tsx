import { FormEvent, useState } from "react";
import { apiClient } from "../../api/client";
import { Quote } from "./useEntryDetail";

interface QuoteListProps {
  entryId: number;
  quotes: Quote[];
  onChange: () => void;
}

export function QuoteList({ entryId, quotes, onChange }: QuoteListProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/entries/${entryId}/quotes`, { text, sort_order: quotes.length });
      setText("");
      onChange();
    } catch {
      setError("Iqtibos qo'shishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(quoteId: number) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.delete(`/entries/${entryId}/quotes/${quoteId}`);
      onChange();
    } catch {
      setError("Iqtibosni o'chirishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Iqtiboslar</h2>
      <ul className="space-y-2">
        {quotes.map((quote) => (
          <li key={quote.id} className="flex items-start justify-between gap-2 rounded-lg bg-stone-100 p-3">
            <p className="italic">&quot;{quote.text}&quot;</p>
            <button
              type="button"
              onClick={() => handleDelete(quote.id)}
              disabled={submitting}
              className="text-sm text-red-500 disabled:opacity-50"
            >
              O'chirish
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="new-quote" className="mb-1 block text-sm font-medium text-stone-700">
            Yangi iqtibos
          </label>
          <input
            id="new-quote"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Yangi iqtibos"
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
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
  );
}
