import { Link } from "react-router-dom";
import { LibraryItem, useLibrary } from "../library/useLibrary";
import { Stats, useStats } from "./useStats";

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

function monthLabel(month: string): string {
  const [, monthNum] = month.split("-");
  return MONTH_LABELS[Number(monthNum) - 1];
}

function MonthlyChart({ monthlyBreakdown }: { monthlyBreakdown: Stats["monthly_breakdown"] }) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count));

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-stone-500">So'nggi 12 oy</p>
      <div className="flex items-end justify-between gap-1">
        {monthlyBreakdown.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            {/* Fixed-height track so the bar's percentage height has a definite
                size to resolve against -- a percentage height on an element
                whose parent has no explicit height computes to nothing. The
                track itself stays visible (bg-stone-100) even at 0%, so the
                12-column grid reads as a chart instead of empty space. */}
            <div className="flex h-24 w-full items-end overflow-hidden rounded-t bg-stone-100">
              <div
                className="w-full rounded-t bg-amber-800"
                style={{ height: `${maxCount === 0 ? 0 : (m.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500">{monthLabel(m.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopRatedBooks() {
  const { items, loading, error } = useLibrary(false);

  if (loading || error) {
    return null;
  }

  const rated = items
    .filter((item): item is LibraryItem & { rating: number } => item.rating !== null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  if (rated.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-stone-500">Eng yuqori baholangan</p>
      <ul className="flex flex-col gap-3">
        {rated.map((item) => (
          <li key={item.entry_id}>
            <Link to={`/read/${item.entry_id}`} className="flex items-center gap-3">
              {item.book_cover_url ? (
                <img
                  src={item.book_cover_url}
                  alt={item.book_title}
                  className="h-12 w-9 shrink-0 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="h-12 w-9 shrink-0 rounded bg-stone-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">{item.book_title}</p>
                {item.book_author && <p className="truncate text-xs text-stone-500">{item.book_author}</p>}
              </div>
              <span className="shrink-0 text-sm font-semibold text-amber-800">{item.rating} ★</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RatingPage() {
  const { stats, loading, error } = useStats();

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error || !stats) {
    return <p className="p-4 text-center text-stone-500">Statistikani yuklab bo'lmadi.</p>;
  }

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">{stats.total_finished}</p>
          <p className="text-xs text-stone-500">Jami o'qilgan</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">{stats.finished_this_year}</p>
          <p className="text-xs text-stone-500">Bu yil</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">{stats.finished_this_month}</p>
          <p className="text-xs text-stone-500">Bu oy</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-stone-900">
            {stats.average_rating !== null ? `${stats.average_rating} ★` : "—"}
          </p>
          <p className="text-xs text-stone-500">O'rtacha baho</p>
        </div>
      </div>

      {stats.total_finished === 0 ? (
        <p className="p-4 text-center text-stone-500">Hali statistika yo'q — birinchi kitobingizni tugating.</p>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {stats.monthly_breakdown.every((m) => m.count === 0) ? (
            <p className="text-center text-stone-500">So'nggi 12 oyda kitob tugatilmagan.</p>
          ) : (
            <MonthlyChart monthlyBreakdown={stats.monthly_breakdown} />
          )}
          <TopRatedBooks />
        </div>
      )}
    </div>
  );
}
