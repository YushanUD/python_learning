import { NextResponse } from "next/server";
import { deterministicFeedback } from "@/lib/scoring";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code: string;
      prompt: string;
      expectedOutput: string;
      testCasesJson: string;
    };

    // Placeholder architecture for advanced mode:
    // replace this deterministic call with isolated Python sandbox execution.
    const result = deterministicFeedback({
      code: body.code,
      prompt: body.prompt,
      expectedOutput: body.expectedOutput,
      testCasesJson: body.testCasesJson,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { message: "Invalid payload for feedback route." },
      { status: 400 },
    );
  }
}
