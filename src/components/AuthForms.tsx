"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import {
  createAdminUser,
  loginUser,
  signupUser,
  type AppUserRecord,
} from "@/lib/auth";

type FormMode = "signup" | "adminSignup" | "login";

export default function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>("signup");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [signupForm, setSignupForm] = useState({
    name: "",
    studentId: "",
    email: "",
    nickname: "",
    password: "",
  });

  const [loginForm, setLoginForm] = useState({
    nickname: "",
    password: "",
  });
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    nickname: "",
    password: "",
  });

  const {
    data,
    isLoading: usersLoading,
    error: usersError,
  } = db.useQuery({
    users: {},
  });

  const users = useMemo(
    () => ((data?.users ?? []) as AppUserRecord[]),
    [data?.users],
  );

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await signupUser({
        db,
        existingUsers: users,
        input: signupForm,
      });
      router.push(session.role === "admin" ? "/admin/export" : "/learn");
    } catch (signupError) {
      const message =
        signupError instanceof Error
          ? signupError.message
          : "Sign-up failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await loginUser({
        db,
        existingUsers: users,
        nickname: loginForm.nickname,
        password: loginForm.password,
      });
      router.push(session.role === "admin" ? "/admin/export" : "/learn");
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSignup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await createAdminUser({
        db,
        existingUsers: users,
        input: adminForm,
      });
      router.push(session.role === "admin" ? "/admin/export" : "/learn");
    } catch (adminSignupError) {
      const message =
        adminSignupError instanceof Error
          ? adminSignupError.message
          : "Admin sign-up failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (usersError) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
        Failed to load users. Please refresh and try again.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            mode === "signup"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Student Sign Up
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            mode === "login"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Student / Admin Login
        </button>
        <button
          type="button"
          onClick={() => setMode("adminSignup")}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            mode === "adminSignup"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Create Admin Account
        </button>
      </div>

      {usersLoading ? (
        <p className="text-sm text-slate-600">Loading account records...</p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {mode === "signup" ? (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Full name</span>
              <input
                required
                value={signupForm.name}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Student ID</span>
              <input
                required
                value={signupForm.studentId}
                onChange={(event) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    studentId: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Email</span>
              <input
                required
                type="email"
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Nickname</span>
              <input
                required
                value={signupForm.nickname}
                onChange={(event) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    nickname: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Password (minimum 8 characters)</span>
            <input
              required
              type="password"
              minLength={8}
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Student Account"}
          </button>
        </form>
      ) : mode === "adminSignup" ? (
        <form onSubmit={handleAdminSignup} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Full name</span>
              <input
                required
                value={adminForm.name}
                onChange={(event) =>
                  setAdminForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Email</span>
              <input
                required
                type="email"
                value={adminForm.email}
                onChange={(event) =>
                  setAdminForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Nickname</span>
              <input
                required
                value={adminForm.nickname}
                onChange={(event) =>
                  setAdminForm((prev) => ({
                    ...prev,
                    nickname: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-700">Password (minimum 8 characters)</span>
              <input
                required
                minLength={8}
                type="password"
                value={adminForm.password}
                onChange={(event) =>
                  setAdminForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            This creates an admin user and attempts to add nickname/email to
            local `.env.local` automatically.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating admin account..." : "Create Admin Account"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Nickname</span>
            <input
              required
              value={loginForm.nickname}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, nickname: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Password</span>
            <input
              required
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <p className="text-xs text-slate-500">
            Tip: admins are recognized via allowlist environment variables.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      )}
    </section>
  );
}
