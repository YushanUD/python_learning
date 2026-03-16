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
  id: string;
  userId: string;
  averageScore: number;
};

type Submission = {
  id: string;
  userId: string;
};

export default function AdminExportPage() {
  const router = useRouter();
  const [session] = useState<SessionUser | null>(() => getSession());
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data, isLoading, error } = db.useQuery({
    users: {},
    scoreSummaries: {},
    submissions: {},
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
      id: user.id,
      name: user.name,
      studentId: user.studentId,
      nickname: user.nickname,
      email: user.email,
      averageScore: summaries.get(user.id)?.averageScore ?? "No submission yet",
    }));
  }, [data?.scoreSummaries, data?.users]);

  const allUsers = ((data?.users ?? []) as User[]).sort((a, b) =>
    a.nickname.localeCompare(b.nickname),
  );
  const allSubmissions = (data?.submissions ?? []) as Submission[];
  const allSummaries = (data?.scoreSummaries ?? []) as ScoreSummary[];

  async function handleDeleteUser(user: User) {
    if (!session || session.role !== "admin") return;
    if (user.id === session.id) {
      setStatusMessage("You cannot delete your own admin account.");
      return;
    }

    const confirmed = window.confirm(
      `Delete account "${user.nickname}" (${user.role})? This also removes related submissions and score summary records.`,
    );
    if (!confirmed) return;

    setStatusMessage(null);
    setDeletingUserId(user.id);

    try {
      const txChunks: unknown[] = [];

      const userSubmissionIds = allSubmissions
        .filter((submission) => submission.userId === user.id)
        .map((submission) => submission.id);
      for (const submissionId of userSubmissionIds) {
        txChunks.push(db.tx.submissions[submissionId].delete());
      }

      const userSummary = allSummaries.find(
        (summary) => summary.userId === user.id,
      );
      if (userSummary) {
        txChunks.push(db.tx.scoreSummaries[userSummary.id].delete());
      }

      txChunks.push(db.tx.users[user.id].delete());
      await db.transact(txChunks as never[]);
      setStatusMessage(`Deleted account: ${user.nickname}`);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete account.";
      setStatusMessage(`Delete failed: ${message}`);
    } finally {
      setDeletingUserId(null);
    }
  }

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

      {statusMessage ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {statusMessage}
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

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold text-slate-900">Account Management</h2>
        <p className="text-sm text-slate-600">
          Admins can remove both student and admin accounts. This action also
          removes related submissions and score summaries.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">
                  Nickname
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">
                  Email
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">
                  Role
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-2 text-sm font-medium text-slate-800">
                    {user.nickname}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-700">{user.name}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{user.email}</td>
                  <td className="px-3 py-2 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <button
                      type="button"
                      disabled={deletingUserId === user.id || user.id === session.id}
                      onClick={() => handleDeleteUser(user)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {user.id === session.id
                        ? "Current Admin"
                        : deletingUserId === user.id
                          ? "Deleting..."
                          : "Delete Account"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
