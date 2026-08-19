import { Stats, useStats } from "./useStats";

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

function monthLabel(month: string): string {
  const [, monthNum] = month.split("-");
  return MONTH_LABELS[Number(monthNum) - 1];
}

function MonthlyChart({ monthlyBreakdown }: { monthlyBreakdown: Stats["monthly_breakdown"] }) {
  const maxCount = Math.max(...monthlyBreakdown.map((m) => m.count));

  return (
    <div className="flex h-32 items-end justify-between gap-1 px-4 pb-4">
      {monthlyBreakdown.map((m) => (
        <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-amber-800"
            style={{ height: `${maxCount === 0 ? 0 : (m.count / maxCount) * 100}%` }}
          />
          <span className="text-[10px] text-stone-500">{monthLabel(m.month)}</span>
        </div>
      ))}
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
      ) : stats.monthly_breakdown.every((m) => m.count === 0) ? (
        <p className="p-4 text-center text-stone-500">So'nggi 12 oyda kitob tugatilmagan.</p>
      ) : (
        <MonthlyChart monthlyBreakdown={stats.monthly_breakdown} />
      )}
    </div>
  );
}
