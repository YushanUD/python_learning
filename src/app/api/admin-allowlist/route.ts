import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeCsv(existing: string[], incoming: string): string {
  const merged = new Set(
    [...existing, incoming.trim()].map((item) => item.toLowerCase()),
  );
  return Array.from(merged).join(",");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nickname?: string;
      email?: string;
    };

    const nickname = body.nickname?.trim().toLowerCase();
    const email = body.email?.trim().toLowerCase();

    if (!nickname || !email) {
      return NextResponse.json(
        { message: "nickname and email are required." },
        { status: 400 },
      );
    }

    const envPath = path.join(process.cwd(), ".env.local");
    let content = "";

    try {
      content = await fs.readFile(envPath, "utf8");
    } catch {
      content = "";
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const map = new Map<string, string>();
    for (const line of lines) {
      const index = line.indexOf("=");
      if (index <= 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      map.set(key, value);
    }

    const nicknameKey = "NEXT_PUBLIC_ADMIN_NICKNAMES";
    const emailKey = "NEXT_PUBLIC_ADMIN_EMAILS";

    const currentNicknames = parseCsv(map.get(nicknameKey));
    const currentEmails = parseCsv(map.get(emailKey));

    map.set(nicknameKey, mergeCsv(currentNicknames, nickname));
    map.set(emailKey, mergeCsv(currentEmails, email));

    const nextContent = `${nicknameKey}=${map.get(nicknameKey) ?? ""}\n${emailKey}=${map.get(emailKey) ?? ""}\n`;
    await fs.writeFile(envPath, nextContent, "utf8");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Could not update .env.local in this environment." },
      { status: 500 },
    );
  }
}
