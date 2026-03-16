export type UserRole = "student" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  nickname: string;
  role: UserRole;
};

export type AppUserRecord = SessionUser & {
  passwordHash: string;
  createdAt?: string | Date;
};

export type SignupInput = {
  name: string;
  studentId: string;
  email: string;
  nickname: string;
  password: string;
};

export type AdminSignupInput = {
  name: string;
  email: string;
  nickname: string;
  password: string;
};

type InstantDbRuntime = {
  tx: {
    users: Record<
      string,
      {
        create: (args: Record<string, unknown>) => unknown;
        update: (args: Record<string, unknown>) => unknown;
      }
    >;
  };
  transact: (chunk: unknown) => Promise<unknown>;
};

const SESSION_STORAGE_KEY = "python-learning-session";
const SESSION_EVENT = "python-learning-session-changed";

function normalizeList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getAdminAllowlist() {
  return {
    nicknames: normalizeList(process.env.NEXT_PUBLIC_ADMIN_NICKNAMES),
    emails: normalizeList(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
  };
}

export function resolveRoleByAllowlist(input: {
  nickname: string;
  email: string;
}): UserRole {
  const allowlist = getAdminAllowlist();
  const normalizedNickname = input.nickname.toLowerCase();
  const normalizedEmail = input.email.toLowerCase();

  const isAdminByNickname = allowlist.nicknames.includes(normalizedNickname);
  const isAdminByEmail = allowlist.emails.includes(normalizedEmail);
  // Fallback for classroom demos:
  // if env allowlists are not present in a runtime (e.g. misconfigured deploy),
  // nicknames ending with `_admin` are treated as admin.
  const isAdminByNicknameConvention = normalizedNickname.endsWith("_admin");

  return isAdminByNickname || isAdminByEmail || isAdminByNicknameConvention
    ? "admin"
    : "student";
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID();
  const digest = await sha256Hex(`${salt}:${password}`);
  return `${salt}:${digest}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [salt, expectedDigest] = passwordHash.split(":");
  if (!salt || !expectedDigest) return false;
  const digest = await sha256Hex(`${salt}:${password}`);
  return digest === expectedDigest;
}

function dispatchSessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}

export function setSession(user: SessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  dispatchSessionChange();
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  dispatchSessionChange();
}

export function sessionChangeEventName() {
  return SESSION_EVENT;
}

function sanitizeNickname(value: string) {
  return value.trim();
}

export async function signupUser(params: {
  db: unknown;
  existingUsers: AppUserRecord[];
  input: SignupInput;
}) {
  const { db, existingUsers, input } = params;
  const instantDb = db as InstantDbRuntime;

  const name = input.name.trim();
  const studentId = input.studentId.trim();
  const email = input.email.trim().toLowerCase();
  const nickname = sanitizeNickname(input.nickname);
  const password = input.password;

  if (!name || !studentId || !email || !nickname || !password) {
    throw new Error("All fields are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!email.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }

  const existingNickname = existingUsers.find(
    (user) => user.nickname.toLowerCase() === nickname.toLowerCase(),
  );
  if (existingNickname) {
    throw new Error("Nickname is already in use.");
  }

  const existingEmail = existingUsers.find(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );
  if (existingEmail) {
    throw new Error("Email is already registered.");
  }

  const passwordHash = await hashPassword(password);
  const role = resolveRoleByAllowlist({ nickname, email });
  const id = crypto.randomUUID();

  await instantDb.transact(
    instantDb.tx.users[id].create({
      name,
      studentId,
      email,
      nickname,
      passwordHash,
      role,
      createdAt: new Date(),
    }),
  );

  const sessionUser: SessionUser = {
    id,
    name,
    studentId,
    email,
    nickname,
    role,
  };

  setSession(sessionUser);
  return sessionUser;
}

export async function createAdminUser(params: {
  db: unknown;
  existingUsers: AppUserRecord[];
  input: AdminSignupInput;
}) {
  const { db, existingUsers, input } = params;
  const instantDb = db as InstantDbRuntime;

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const nickname = sanitizeNickname(input.nickname);
  const password = input.password;

  if (!name || !email || !nickname || !password) {
    throw new Error("All admin fields are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!email.includes("@")) {
    throw new Error("Please provide a valid email address.");
  }

  const existingNickname = existingUsers.find(
    (user) => user.nickname.toLowerCase() === nickname.toLowerCase(),
  );
  if (existingNickname) {
    throw new Error("Nickname is already in use.");
  }

  const existingEmail = existingUsers.find(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );
  if (existingEmail) {
    throw new Error("Email is already registered.");
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();

  await instantDb.transact(
    instantDb.tx.users[id].create({
      name,
      studentId: `ADMIN-${id.slice(0, 8)}`,
      email,
      nickname,
      passwordHash,
      role: "admin",
      createdAt: new Date(),
    }),
  );

  // Best-effort helper for local development convenience:
  // append newly created admin nickname/email to .env.local when writable.
  try {
    await fetch("/api/admin-allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, email }),
    });
  } catch {
    // Ignore .env.local sync errors in environments like Vercel.
  }

  const sessionUser: SessionUser = {
    id,
    name,
    studentId: `ADMIN-${id.slice(0, 8)}`,
    email,
    nickname,
    role: "admin",
  };

  setSession(sessionUser);
  return sessionUser;
}

export async function loginUser(params: {
  db: unknown;
  existingUsers: AppUserRecord[];
  nickname: string;
  password: string;
}) {
  const { db, existingUsers, nickname, password } = params;
  const instantDb = db as InstantDbRuntime;
  const normalizedNickname = nickname.trim().toLowerCase();
  const user = existingUsers.find(
    (candidate) => candidate.nickname.toLowerCase() === normalizedNickname,
  );

  if (!user) {
    throw new Error("Nickname or password is incorrect.");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Nickname or password is incorrect.");
  }

  const computedRole =
    user.role === "admin"
      ? "admin"
      : resolveRoleByAllowlist({
          nickname: user.nickname,
          email: user.email,
        });

  if (computedRole !== user.role) {
    await instantDb.transact(
      instantDb.tx.users[user.id].update({ role: computedRole }),
    );
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    studentId: user.studentId,
    email: user.email,
    nickname: user.nickname,
    role: computedRole,
  };

  setSession(sessionUser);
  return sessionUser;
}

// Compatibility note:
// Nickname + password is implemented for this MVP because it is requested.
// For production, prefer InstantDB Magic Code or token-based auth to avoid
// shipping custom password/session logic in the client.
