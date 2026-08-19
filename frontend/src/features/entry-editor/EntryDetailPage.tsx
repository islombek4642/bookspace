import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useTelegramBackButton } from "../../hooks/useTelegramBackButton";
import { QuoteList } from "./QuoteList";
import { useEntryDetail } from "./useEntryDetail";

export function EntryDetailPage() {
  useTelegramBackButton();

  const { id } = useParams<{ id: string }>();
  const entryId = Number(id);
  const { entry, book, quotes, loading, error: loadError, reload } = useEntryDetail(entryId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (loadError || !entry || !book) {
    return <p className="p-4 text-center text-stone-500">Yozuvni yuklab bo'lmadi.</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      status: formData.get("status") as string,
      started_at: (formData.get("started_at") as string) || null,
      finished_at: (formData.get("finished_at") as string) || null,
      characters_notes: (formData.get("characters_notes") as string) || null,
      personal_thoughts: (formData.get("personal_thoughts") as string) || null,
      rating: formData.get("rating") ? Number(formData.get("rating")) : null,
      is_favorite: formData.get("is_favorite") === "on",
    };

    try {
      await apiClient.patch(`/entries/${entryId}`, payload);
      await reload();
    } catch {
      setError("Kiritilgan ma'lumotlar noto'g'ri.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold">{book.title}</h1>
        {book.author && <p className="text-stone-500">{book.author}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="entry-status" className="mb-1 block text-sm font-medium text-stone-700">
            Holat
          </label>
          <select
            id="entry-status"
            name="status"
            defaultValue={entry.status}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          >
            <option value="planned">Rejalashtirilgan</option>
            <option value="reading">O'qilmoqda</option>
            <option value="finished">Tugallandi</option>
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="entry-started-at" className="mb-1 block text-sm font-medium text-stone-700">
              Boshlangan sana
            </label>
            <input
              id="entry-started-at"
              type="date"
              name="started_at"
              defaultValue={entry.started_at ?? ""}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="entry-finished-at" className="mb-1 block text-sm font-medium text-stone-700">
              Tugatilgan sana
            </label>
            <input
              id="entry-finished-at"
              type="date"
              name="finished_at"
              defaultValue={entry.finished_at ?? ""}
              className="w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="entry-characters" className="mb-1 block text-sm font-medium text-stone-700">
            Asosiy qahramonlar
          </label>
          <textarea
            id="entry-characters"
            name="characters_notes"
            defaultValue={entry.characters_notes ?? ""}
            placeholder="Asosiy qahramonlar"
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="entry-thoughts" className="mb-1 block text-sm font-medium text-stone-700">
            Shaxsiy fikringiz
          </label>
          <textarea
            id="entry-thoughts"
            name="personal_thoughts"
            defaultValue={entry.personal_thoughts ?? ""}
            placeholder="Shaxsiy fikringiz"
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="entry-rating" className="mb-1 block text-sm font-medium text-stone-700">
            Bahoingiz
          </label>
          <select
            id="entry-rating"
            name="rating"
            defaultValue={entry.rating ?? ""}
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
          >
            <option value="">Baho yo'q</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_favorite" defaultChecked={entry.is_favorite} />
          Sevimlilarga qo'shish
        </label>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
        >
          Saqlash
        </button>
      </form>

      <QuoteList entryId={entryId} quotes={quotes} onChange={reload} />
    </div>
  );
}
