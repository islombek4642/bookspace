import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface LeaderboardEntry {
  user_id: number;
  username: string | null;
  display_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  total_finished: number;
}

export interface MyRank {
  rank: number;
  total_finished: number;
}

export interface Leaderboard {
  top: LeaderboardEntry[];
  my_rank: MyRank | null;
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);
    apiClient
      .get<Leaderboard>("/leaderboard")
      .then((data) => {
        if (!ignore) setLeaderboard(data);
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
  }, []);

  return { leaderboard, loading, error };
}
