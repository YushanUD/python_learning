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

type ImportedExerciseDraft = {
  prompt: string;
  starterCode: string;
  expectedOutput: string;
  testCasesJson: string;
  orderIndex: number;
};

type Material = {
  id: string;
  orderIndex: number;
};

type Exercise = {
  id: string;
  materialId: string;
  orderIndex: number;
};

export default function AdminExportPage() {
  const router = useRouter();
  const [session] = useState<SessionUser | null>(() => getSession());
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importOrder, setImportOrder] = useState(1);
  const [materialDraft, setMaterialDraft] = useState("");
  const [exerciseDrafts, setExerciseDrafts] = useState<ImportedExerciseDraft[]>([]);
  const [importing, setImporting] = useState(false);
  const [savingImport, setSavingImport] = useState(false);

  const { data, isLoading, error } = db.useQuery({
    users: {},
    scoreSummaries: {},
    submissions: {},
    materials: {},
    exercises: {},
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
  const existingMaterials = (data?.materials ?? []) as Material[];
  const existingExercises = (data?.exercises ?? []) as Exercise[];

  function updateExerciseDraft(
    index: number,
    field: keyof ImportedExerciseDraft,
    value: string | number,
  ) {
    setExerciseDrafts((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function handleGenerateFromFile() {
    if (!importFile) {
      setStatusMessage("Select a file before generating material.");
      return;
    }

    setStatusMessage(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/admin/import-learning", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        materialDraft?: string;
        exercisesDraft?: ImportedExerciseDraft[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Import failed.");
      }

      setMaterialDraft(payload.materialDraft ?? "");
      setExerciseDrafts(payload.exercisesDraft ?? []);
      if (!importTitle.trim() && importFile.name) {
        setImportTitle(importFile.name.replace(/\.[^/.]+$/, ""));
      }
      setStatusMessage("Imported content draft generated. Review before saving.");
    } catch (importError) {
      const message =
        importError instanceof Error ? importError.message : "Import failed.";
      setStatusMessage(`Import error: ${message}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveImportedContent() {
    if (!importTitle.trim()) {
      setStatusMessage("Material title is required.");
      return;
    }
    if (!materialDraft.trim()) {
      setStatusMessage("Material content cannot be empty.");
      return;
    }
    if (exerciseDrafts.length === 0) {
      setStatusMessage("Generate at least one exercise before saving.");
      return;
    }

    setStatusMessage(null);
    setSavingImport(true);
    try {
      const materialId = crypto.randomUUID();
      const materialOrder =
        Number.isFinite(importOrder) && importOrder > 0
          ? importOrder
          : existingMaterials.length + 1;

      const txChunks: unknown[] = [
        db.tx.materials[materialId].update({
          title: importTitle.trim(),
          content: materialDraft.trim(),
          orderIndex: materialOrder,
          createdAt: new Date(),
        }),
      ];

      for (let index = 0; index < exerciseDrafts.length; index += 1) {
        const draft = exerciseDrafts[index];
        const exerciseId = crypto.randomUUID();
        txChunks.push(
          db.tx.exercises[exerciseId].update({
            materialId,
            prompt: draft.prompt.trim(),
            starterCode: draft.starterCode.trim(),
            expectedOutput: draft.expectedOutput.trim(),
            testCasesJson: draft.testCasesJson.trim(),
            orderIndex:
              Number.isFinite(draft.orderIndex) && draft.orderIndex > 0
                ? draft.orderIndex
                : existingExercises.length + index + 1,
          }),
        );
      }

      await db.transact(txChunks as never[]);
      setStatusMessage("New material and exercises were added to learning area.");
      setImportFile(null);
      setImportTitle("");
      setMaterialDraft("");
      setExerciseDrafts([]);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Save failed.";
      setStatusMessage(`Save error: ${message}`);
    } finally {
      setSavingImport(false);
    }
  }

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

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Create Learning Content from Documents
        </h2>
        <p className="text-sm text-slate-600">
          Upload PDF, PPT/PPTX slides, or DOC/DOCX files to generate material and
          exercise drafts. Review and edit drafts before saving.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Material title</span>
            <input
              value={importTitle}
              onChange={(event) => setImportTitle(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Python Functions and Modules"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Material order index</span>
            <input
              type="number"
              min={1}
              value={importOrder}
              onChange={(event) => setImportOrder(Number(event.target.value || 1))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-slate-700">Upload source document</span>
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerateFromFile}
            disabled={importing || savingImport}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? "Generating Draft..." : "Generate from Document"}
          </button>
          <button
            type="button"
            onClick={handleSaveImportedContent}
            disabled={savingImport || importing}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingImport ? "Saving..." : "Save to Learning Area"}
          </button>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-slate-700">Material content draft</span>
          <textarea
            rows={8}
            value={materialDraft}
            onChange={(event) => setMaterialDraft(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Generated material content will appear here."
          />
        </label>

        {exerciseDrafts.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Exercise drafts ({exerciseDrafts.length})
            </h3>
            {exerciseDrafts.map((draft, index) => (
              <div
                key={`${draft.orderIndex}-${index}`}
                className="space-y-2 rounded-md border border-slate-200 p-3"
              >
                <p className="text-sm font-medium text-slate-800">
                  Exercise {index + 1}
                </p>
                <input
                  value={draft.prompt}
                  onChange={(event) =>
                    updateExerciseDraft(index, "prompt", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Prompt"
                />
                <textarea
                  rows={4}
                  value={draft.starterCode}
                  onChange={(event) =>
                    updateExerciseDraft(index, "starterCode", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Starter code"
                />
                <input
                  value={draft.expectedOutput}
                  onChange={(event) =>
                    updateExerciseDraft(index, "expectedOutput", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Expected output"
                />
                <textarea
                  rows={3}
                  value={draft.testCasesJson}
                  onChange={(event) =>
                    updateExerciseDraft(index, "testCasesJson", event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  placeholder='[{"name":"...","requiredPatterns":["..."]}]'
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>

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
