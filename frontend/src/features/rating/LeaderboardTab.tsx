import { useState } from "react";
import { LeaderboardEntry, useLeaderboard } from "./useLeaderboard";

function entryName(entry: LeaderboardEntry): string {
  return [entry.display_name, entry.last_name].filter(Boolean).join(" ") || entry.username || "?";
}

function RowAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-800 text-sm font-semibold text-white"
    >
      {initial}
    </div>
  );
}

export function LeaderboardTab() {
  const { leaderboard, loading, error } = useLeaderboard();

  if (loading) {
    return <p className="p-4 text-center text-stone-500">Yuklanmoqda...</p>;
  }

  if (error || !leaderboard) {
    return <p className="p-4 text-center text-stone-500">Reytingni yuklab bo'lmadi.</p>;
  }

  if (leaderboard.top.length === 0) {
    return <p className="p-4 text-center text-stone-500">Hali reyting jadvali bo'sh.</p>;
  }

  return (
    <div className="p-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <ul className="flex flex-col gap-3">
          {leaderboard.top.map((entry, index) => {
            const name = entryName(entry);
            return (
              <li key={entry.user_id} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-sm font-semibold text-stone-500">{index + 1}</span>
                <RowAvatar avatarUrl={entry.avatar_url} name={name} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">{name}</p>
                <span className="shrink-0 text-sm text-stone-500">{entry.total_finished} kitob</span>
              </li>
            );
          })}
        </ul>

        {leaderboard.my_rank && (
          <p className="mt-3 border-t border-stone-200 pt-3 text-center text-sm text-stone-500">
            Sizning o'rningiz: #{leaderboard.my_rank.rank} — {leaderboard.my_rank.total_finished} kitob
          </p>
        )}
      </div>
    </div>
  );
}
