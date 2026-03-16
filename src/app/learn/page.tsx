"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ExerciseCard from "@/components/ExerciseCard";
import { getSession, type SessionUser } from "@/lib/auth";
import { db, ensureSeedData } from "@/lib/db";
import type { FeedbackResult } from "@/lib/scoring";

type Material = {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
};

type Exercise = {
  id: string;
  materialId: string;
  prompt: string;
  starterCode: string;
  expectedOutput: string;
  testCasesJson: string;
  orderIndex: number;
};

type Submission = {
  id: string;
  userId: string;
  exerciseId: string;
  code: string;
  feedback: string;
  score: number;
  submittedAt: string | Date;
};

export default function LearnPage() {
  const router = useRouter();
  const [session] = useState<SessionUser | null>(() => getSession());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const seededRef = useRef(false);

  const { data, isLoading, error } = db.useQuery({
    materials: {},
    exercises: {},
    submissions: {},
    scoreSummaries: {},
  });

  const materials = useMemo(
    () =>
      ([...(data?.materials ?? [])] as Material[]).sort(
        (a, b) => a.orderIndex - b.orderIndex,
      ),
    [data?.materials],
  );

  const exercises = useMemo(
    () =>
      ([...(data?.exercises ?? [])] as Exercise[]).sort(
        (a, b) => a.orderIndex - b.orderIndex,
      ),
    [data?.exercises],
  );

  const submissions = useMemo(
    () => (data?.submissions ?? []) as Submission[],
    [data?.submissions],
  );

  useEffect(() => {
    if (!session) {
      router.replace("/login");
    }
  }, [router, session]);

  useEffect(() => {
    async function seed() {
      if (seededRef.current) return;
      if (!data) return;
      if (materials.length > 0 && exercises.length > 0) {
        seededRef.current = true;
        return;
      }
      await ensureSeedData({
        materials: materials as Array<{ id: string }>,
        exercises: exercises as Array<{ id: string }>,
      });
      seededRef.current = true;
    }

    seed().catch((seedError) => {
      console.error(seedError);
      setSaveMessage("Could not seed starter materials. Please refresh.");
    });
  }, [data, materials, exercises]);

  const submissionsByExercise = useMemo(() => {
    const map = new Map<string, Submission>();
    if (!session) return map;

    for (const submission of submissions) {
      if (submission.userId !== session.id) continue;
      const existing = map.get(submission.exerciseId);
      if (!existing) {
        map.set(submission.exerciseId, submission);
        continue;
      }
      const existingTime = new Date(existing.submittedAt).getTime();
      const nextTime = new Date(submission.submittedAt).getTime();
      if (nextTime >= existingTime) {
        map.set(submission.exerciseId, submission);
      }
    }
    return map;
  }, [session, submissions]);

  async function saveSubmission(exercise: Exercise, payload: { code: string; result: FeedbackResult }) {
    if (!session) return;
    if (session.role !== "student") {
      throw new Error("Only student accounts can submit exercises.");
    }

    const submissionId = `${session.id}-${exercise.id}`;
    const now = new Date();
    const score = payload.result.score;

    const txChunks: unknown[] = [
      db.tx.submissions[submissionId]
        .update({
          userId: session.id,
          exerciseId: exercise.id,
          code: payload.code,
          feedback: payload.result.feedback,
          score,
          submittedAt: now,
        })
        .link({ user: session.id, exercise: exercise.id }),
    ];

    const scoreByExercise = new Map<string, number>();
    for (const item of submissionsByExercise.values()) {
      scoreByExercise.set(item.exerciseId, item.score);
    }
    scoreByExercise.set(exercise.id, score);

    const totalExercises = exercises.length;
    const scoreSum = Array.from(scoreByExercise.values()).reduce(
      (acc, value) => acc + value,
      0,
    );
    const averageScore =
      totalExercises > 0 ? Number((scoreSum / totalExercises).toFixed(2)) : 0;

    txChunks.push(
      db.tx.scoreSummaries[session.id]
        .update({
          userId: session.id,
          averageScore,
          totalExercises,
          lastSubmittedAt: now,
        })
        .link({ user: session.id }),
    );

    await db.transact(txChunks as never[]);
    setSaveMessage("Submission saved and score summary updated.");
  }

  if (!session) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Checking session...</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Loading learning content...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-md border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">Failed to load learning content.</p>
      </section>
    );
  }

  const roleNotice =
    session.role !== "student"
      ? "Admin accounts cannot submit exercises."
      : null;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Start Learning</h1>
        <p className="text-slate-600">
          Welcome, {session.nickname}. Read each material and submit your code
          answers for automatic feedback.
        </p>
      </header>

      {roleNotice ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {roleNotice}
        </p>
      ) : null}

      {saveMessage ? (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {saveMessage}
        </p>
      ) : null}

      {materials.map((material) => {
        const scopedExercises = exercises.filter(
          (exercise) => exercise.materialId === material.id,
        );

        return (
          <section key={material.id} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                {material.orderIndex}. {material.title}
              </h2>
              <p className="mt-2 text-slate-700">{material.content}</p>
            </div>

            <div className="space-y-4">
              {scopedExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  existingSubmission={submissionsByExercise.get(exercise.id)}
                  onSave={(payload) => saveSubmission(exercise, payload)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {materials.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-700">
          No materials found yet. Starter content is being prepared.
        </p>
      ) : null}
    </section>
  );
}
