import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

export interface MonthlyCount {
  month: string;
  count: number;
}

export interface Stats {
  total_finished: number;
  finished_this_year: number;
  finished_this_month: number;
  average_rating: number | null;
  monthly_breakdown: MonthlyCount[];
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);
    apiClient
      .get<Stats>("/stats")
      .then((data) => {
        if (!ignore) setStats(data);
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

  return { stats, loading, error };
}
