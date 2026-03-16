"use client";

import { useMemo, useState } from "react";
import {
  evaluateSubmission,
  type FeedbackResult,
  type ParsedTestCase,
} from "@/lib/scoring";

type Exercise = {
  id: string;
  prompt: string;
  starterCode: string;
  expectedOutput: string;
  testCasesJson: string;
  orderIndex: number;
  materialId: string;
};

type Submission = {
  code: string;
  feedback: string;
  score: number;
};

type ExerciseCardProps = {
  exercise: Exercise;
  existingSubmission?: Submission;
  onSave: (payload: { code: string; result: FeedbackResult }) => Promise<void>;
};

function getTestCases(testCasesJson: string): ParsedTestCase[] {
  try {
    return JSON.parse(testCasesJson) as ParsedTestCase[];
  } catch {
    return [];
  }
}

export default function ExerciseCard({
  exercise,
  existingSubmission,
  onSave,
}: ExerciseCardProps) {
  const [code, setCode] = useState(existingSubmission?.code ?? exercise.starterCode);
  const [result, setResult] = useState<FeedbackResult | null>(
    existingSubmission
      ? {
          score: existingSubmission.score,
          feedback: existingSubmission.feedback,
          passedChecks: [],
          missingChecks: [],
        }
      : null,
  );
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testCases = useMemo(
    () => getTestCases(exercise.testCasesJson),
    [exercise.testCasesJson],
  );

  async function runChecks() {
    setError(null);
    setChecking(true);
    try {
      const nextResult = await evaluateSubmission({
        code,
        prompt: exercise.prompt,
        expectedOutput: exercise.expectedOutput,
        testCasesJson: exercise.testCasesJson,
      });
      setResult(nextResult);
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Unable to evaluate code right now.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function saveSubmission() {
    setError(null);
    setSaving(true);
    try {
      const nextResult =
        result ??
        (await evaluateSubmission({
          code,
          prompt: exercise.prompt,
          expectedOutput: exercise.expectedOutput,
          testCasesJson: exercise.testCasesJson,
        }));
      setResult(nextResult);
      await onSave({ code, result: nextResult });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save submission right now.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">
          Exercise {exercise.orderIndex}
        </h3>
        <p className="text-sm text-slate-700">{exercise.prompt}</p>
      </header>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Expected output</p>
        <p>{exercise.expectedOutput}</p>
      </div>

      {testCases.length > 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Check list</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {testCases.map((testCase) => (
              <li key={testCase.name}>{testCase.name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-slate-700">Your Python code</span>
        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          rows={10}
          className="w-full rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runChecks}
          disabled={checking}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? "Running checks..." : "Run Checks"}
        </button>
        <button
          type="button"
          onClick={saveSubmission}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Submission"}
        </button>
      </div>

      {result ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">
            Score: {result.score}/100
          </p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {result.feedback}
          </pre>
        </div>
      ) : null}
    </article>
  );
}
