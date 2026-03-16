"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { downloadStudentScores } from "@/lib/export";
import { getSession, type SessionUser } from "@/lib/auth";

type User = {
  id: string;
  name: string;
  studentId: string;
  nickname: string;
  email: string;
  role: "student" | "admin";
};

type ScoreSummary = {
  userId: string;
  averageScore: number;
};

export default function AdminExportPage() {
  const router = useRouter();
  const [session] = useState<SessionUser | null>(() => getSession());

  const { data, isLoading, error } = db.useQuery({
    users: {},
    scoreSummaries: {},
  });

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== "admin") {
      router.replace("/");
    }
  }, [router, session]);

  const exportRows = useMemo(() => {
    const users = ((data?.users ?? []) as User[]).filter(
      (user) => user.role === "student",
    );
    const summaries = new Map<string, ScoreSummary>();
    for (const summary of (data?.scoreSummaries ?? []) as ScoreSummary[]) {
      summaries.set(summary.userId, summary);
    }

    return users.map((user) => ({
      name: user.name,
      studentId: user.studentId,
      nickname: user.nickname,
      email: user.email,
      averageScore: summaries.get(user.id)?.averageScore ?? "No submission yet",
    }));
  }, [data?.scoreSummaries, data?.users]);

  if (!session || session.role !== "admin") {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Checking admin access...</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-bold text-slate-900">
        Download Students&apos; Scores
      </h1>
      <p className="text-slate-600">
        Admin-only export. File includes name, student ID, nickname, email, and
        average score.
      </p>

      {isLoading ? <p className="text-slate-600">Loading student data...</p> : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          Failed to load export data.
        </p>
      ) : null}

      <button
        type="button"
        disabled={isLoading || !!error}
        onClick={() => downloadStudentScores(exportRows)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Download Students&apos; Scores
      </button>

      {!isLoading && !error ? (
        <p className="text-sm text-slate-500">
          {exportRows.length} student records ready for export.
        </p>
      ) : null}
    </section>
  );
}
