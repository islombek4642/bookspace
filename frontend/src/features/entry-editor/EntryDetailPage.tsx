import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useTelegramBackButton } from "../../hooks/useTelegramBackButton";
import { QuoteList } from "./QuoteList";
import { useEntryDetail } from "./useEntryDetail";

const STATUS_LABELS: Record<string, string> = {
  planned: "Rejalashtirilgan",
  reading: "O'qilmoqda",
  finished: "Tugallandi",
};

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function BookCover({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (coverUrl && !imgFailed) {
    return (
      <img
        src={coverUrl}
        alt={title}
        className="h-48 w-32 rounded-xl object-cover shadow-md"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-48 w-32 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H19" />
      </svg>
    </div>
  );
}

export function EntryDetailPage() {
  useTelegramBackButton();

  const { id } = useParams<{ id: string }>();
  const entryId = Number(id);
  const { entry, book, quotes, loading, error: loadError, reload } = useEntryDetail(entryId);
  const [isEditing, setIsEditing] = useState(false);
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
      setIsEditing(false);
    } catch {
      setError("Kiritilgan ma'lumotlar noto'g'ri.");
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className="flex flex-col items-center gap-1 text-center">
      <BookCover coverUrl={book.cover_url} title={book.title} />
      <h1 className="mt-2 text-xl font-bold">{book.title}</h1>
      {book.author && <p className="text-stone-500">{book.author}</p>}
    </div>
  );

  if (!isEditing) {
    return (
      <div className="space-y-6 p-4">
        {header}

        <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Holat</p>
            <p className="mt-1 text-stone-700">{STATUS_LABELS[entry.status] ?? entry.status}</p>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Boshlangan sana</p>
              <p className="mt-1 text-stone-700">
                {entry.started_at ? formatDate(entry.started_at) : "Kiritilmagan"}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Tugatilgan sana</p>
              <p className="mt-1 text-stone-700">
                {entry.finished_at ? formatDate(entry.finished_at) : "Kiritilmagan"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Asosiy qahramonlar</p>
            <p className="mt-1 whitespace-pre-wrap text-stone-700">
              {entry.characters_notes || "Kiritilmagan"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Shaxsiy fikringiz</p>
            <p className="mt-1 whitespace-pre-wrap text-stone-700">
              {entry.personal_thoughts || "Kiritilmagan"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Bahoingiz</p>
            <p className="mt-1 text-stone-700">{entry.rating ? `${entry.rating} / 5` : "Baho yo'q"}</p>
          </div>
          {entry.is_favorite && <p className="text-sm font-semibold text-amber-700">★ Sevimlilarda</p>}
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98]"
        >
          Tahrirlash
        </button>

        <QuoteList entryId={entryId} quotes={quotes} onChange={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {header}

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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsEditing(false);
            }}
            disabled={saving}
            className="flex-1 rounded-full border border-stone-300 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-amber-800 px-4 py-2 text-white transition-colors hover:bg-amber-900 active:scale-[0.98] disabled:opacity-50"
          >
            Saqlash
          </button>
        </div>
      </form>

      <QuoteList entryId={entryId} quotes={quotes} onChange={reload} />
    </div>
  );
}
