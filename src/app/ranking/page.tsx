"use client";

import { useMemo } from "react";
import RankingTable from "@/components/RankingTable";
import { db } from "@/lib/db";

type User = {
  id: string;
  nickname: string;
  role: "student" | "admin";
};

type ScoreSummary = {
  userId: string;
  averageScore: number;
};

export default function RankingPage() {
  const { data, isLoading, error } = db.useQuery({
    users: {},
    scoreSummaries: {},
  });

  const rows = useMemo(() => {
    const users = ((data?.users ?? []) as User[]).filter(
      (user) => user.role === "student",
    );
    const summaries = data?.scoreSummaries ?? [];
    const summaryByUserId = new Map<string, ScoreSummary>();

    for (const summary of summaries as ScoreSummary[]) {
      summaryByUserId.set(summary.userId, summary);
    }

    return users
      .map((user) => ({
        id: user.id,
        nickname: user.nickname,
        averageScore: summaryByUserId.get(user.id)?.averageScore,
      }))
      .sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
  }, [data?.scoreSummaries, data?.users]);

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Ranking Board</h1>
      <p className="text-slate-600">
        All signed-up student nicknames are listed below. Scores appear after
        submission.
      </p>

      {isLoading ? <p className="text-slate-600">Loading rankings...</p> : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          Failed to load ranking data.
        </p>
      ) : null}
      {!isLoading && !error ? <RankingTable rows={rows} /> : null}
    </section>
  );
}
