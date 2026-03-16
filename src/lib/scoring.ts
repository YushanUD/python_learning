export type ParsedTestCase = {
  name: string;
  requiredPatterns: string[];
};

export type FeedbackResult = {
  score: number;
  feedback: string;
  passedChecks: string[];
  missingChecks: string[];
};

type EvaluateInput = {
  prompt: string;
  expectedOutput: string;
  testCasesJson: string;
  code: string;
};

export const USE_ADVANCED_PYTHON_RUNNER = false;

function safeParseTestCases(testCasesJson: string): ParsedTestCase[] {
  try {
    const parsed = JSON.parse(testCasesJson) as
      | Array<{ name?: string; requiredPatterns?: string[] }>
      | undefined;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item, index) => ({
        name: item.name?.trim() || `Check ${index + 1}`,
        requiredPatterns: Array.isArray(item.requiredPatterns)
          ? item.requiredPatterns.filter(Boolean)
          : [],
      }))
      .filter((item) => item.requiredPatterns.length > 0);
  } catch {
    return [];
  }
}

function includesPattern(code: string, pattern: string) {
  return code.toLowerCase().includes(pattern.toLowerCase());
}

export function deterministicFeedback(input: EvaluateInput): FeedbackResult {
  const code = input.code.trim();
  if (!code) {
    return {
      score: 0,
      feedback:
        "No answer submitted yet. Add code first, then run checks again for targeted hints.",
      passedChecks: [],
      missingChecks: ["Code cannot be empty."],
    };
  }

  const testCases = safeParseTestCases(input.testCasesJson);
  const checks: ParsedTestCase[] = [...testCases];

  if (input.expectedOutput.trim()) {
    checks.push({
      name: "Expected output mention",
      requiredPatterns: [input.expectedOutput.trim()],
    });
  }

  const passedChecks: string[] = [];
  const missingChecks: string[] = [];

  for (const check of checks) {
    const allPatternsPresent = check.requiredPatterns.every((pattern) =>
      includesPattern(code, pattern),
    );

    if (allPatternsPresent) {
      passedChecks.push(`Correct: ${check.name}`);
    } else {
      missingChecks.push(
        `Missing: ${check.name} (look for ${check.requiredPatterns.join(", ")})`,
      );
    }
  }

  const totalChecks = checks.length || 1;
  const score = Math.round((passedChecks.length / totalChecks) * 100);

  const feedbackParts: string[] = [];
  feedbackParts.push(`Prompt: ${input.prompt}`);
  feedbackParts.push(`Score: ${score}/100`);

  if (passedChecks.length > 0) {
    feedbackParts.push(`What is correct:\n- ${passedChecks.join("\n- ")}`);
  } else {
    feedbackParts.push("What is correct:\n- No checks passed yet.");
  }

  if (missingChecks.length > 0) {
    feedbackParts.push(`What is missing:\n- ${missingChecks.join("\n- ")}`);
  }

  feedbackParts.push(
    "Next hint: keep your solution small, focus on exact output text, and rerun checks.",
  );

  return {
    score,
    feedback: feedbackParts.join("\n\n"),
    passedChecks,
    missingChecks,
  };
}

async function advancedFeedback(input: EvaluateInput): Promise<FeedbackResult> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Advanced feedback runner is unavailable right now.");
  }

  const result = (await response.json()) as FeedbackResult;
  return result;
}

export async function evaluateSubmission(
  input: EvaluateInput,
): Promise<FeedbackResult> {
  if (USE_ADVANCED_PYTHON_RUNNER) {
    return advancedFeedback(input);
  }

  return deterministicFeedback(input);
}
